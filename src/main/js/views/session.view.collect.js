import BleSensor from "../device/ble-sensor";
import StrokeDetector from "../core/stroke-detector";
import GPS from "../utils/gps";
import MotionSensor from "../device/motion";
import Calibration from "../model/calibration";
import Utils from "../utils/utils";
import IO from "../utils/io";
import Api from "../server/api";
import SessionDetail from "../model/session-detail";
import StrokeEfficiency from "../measures/efficiency";
import Distance from "../measures/distance";
import Speed from "../measures/speed";
import Pace from "../measures/pace";
import Context from "../context";
import {SessionViewSplits} from "./session.view.splits";
import Session from "../model/session";
import AppSettings from "../utils/app-settings"
import SessionViewCollectMetricsBackground from "./session.view.collect.background";

/**
 * @typedef {Object} Location
 * @property {number} speed
 * @property {number} pace
 * @property {number} efficiency
 * @property {number} distance
 * @property {number} altitude
 * @property {number} latitude
 * @property {number} longitude
 * @property {number|null} timestamp
 * @property {number} accuracy
 * @property {number} strokes
 */

/**
 * @typedef {Object} Coords
 * @property {number} altitude
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} accuracy
 */

/**
 * @typedef {Object} Position
 * @property {Coords} coords
 * @property {number} timestamp
 * @property {number} sessionDuration
 */

/**
 * @typedef {Object} Cadence
 * @property {number} value
 * @property {number} interval
 * @property {number} total
 */



export default class SessionViewCollectMetrics {
    /**
     *
     * @param {Context} context
     * @param {Timer} timer
     */
    constructor(context, timer) {
        this._timer = timer;
        this._context = context;
        this._calibration = null;
        /**@type Session */
        this._session = null;
        this._distanceTools = new Distance(context);
        this._speedTools = new Speed(context);
        this._paceTools = new Pace(context.preferences().isImperial());
        /**@type SessionViewSplits */
        this._splitsTools = null;
        /**@type Utils.EndlessIterator */
        this._iterator = new Utils.EndlessIterator(1, Api.User.getProfile().liveUpdateEvery);

        // model
        this._gps = null;
        /**@type Cadence */
        this._cadence = {value: 0, interval: 0, total: 0};
        /**@type number */
        this._heartRate = 0;
        /**@type number */
        this._magnitude = 0;
        /**@type Location|null */
        this._location = {
            speed: 0, pace: 0, efficiency: 0, distance: 0, altitude: 0
            , latitude: 0, longitude: 0
            , timestamp: null, accuracy: null, strokes: 0
        };

        // sensors
        /**@type BleSensor */
        this._heartRateSensor = new BleSensor(BleSensor.TYPES().HR);
        /**@type GPS */
        this._gpsSensor = new GPS(context);
        /**@type MotionSensor */
        this._motionSensor = null;
        /**@type StrokeDetector */
        this._strokeDetectorSensor = null;
        /**@type BleSensor */
        this._cyclingCadenceSensor = null;

        // state
        /**@type Position|null */
        this._lastKnownGPSPosition = null;
        /**@type Position|null */
        this._lastCommunicatedGPSPosition = null;
        /**@type Position|null */
        this._previousCollectedGPSPostion = null;
        this._isSessionPaused = false;
        this._isDebugEnabled = !!Api.User.getProfile().debug;
        this._rawSensorDataForDebug = [];
        this._rawSensorFileForDebug = null;
        /**@type Array<SplitDefinition> */
        this._splitsDefinition = null;
        /**@type Expression */
        this._expression = null;
        this._skipMetricPersistenceCountDown = 0;
        /**@type number */
        this._sessionPausedAt = 0;
        this._pausedDuration = 0;

        this._background = new SessionViewCollectMetricsBackground(context);

        this._handlers = {
            leftRightChanged: ()=>{},
            lostGpsSignal: ()=>{},

            // everything from splits
            startedSplit: ()=>{},           // on every split start
            finishedSplit: ()=>{},          // on every split finish
            finished: ()=>{},               // splits finished
            startedDistanceBased: ()=>{},   // distance split started
            warmUpFinishedRemotely: ()=>{},
            splitStateUpdated: ()=>{},
            startCountDown:()=>{},
            finishCountDown:()=>{},
            finishedNotification:()=>{},
        }
    }

    /**
     *
     * @param {number} startAt
     * @param {Array<SplitDefinition>} splitsDefinition
     * @param {boolean} wasStartedRemotely
     * @param {Expression} expression
     * @param {string} remoteScheduledSessionId
     * @param {Calibration} calibration
     * @param {boolean} startSplitsImmediately
     */
    start(startAt, splitsDefinition, wasStartedRemotely, expression
          , remoteScheduledSessionId, calibration, startSplitsImmediately) {

        this.createSession(startAt, calibration, remoteScheduledSessionId, startSplitsImmediately);
        this.startCommon(startAt, splitsDefinition, wasStartedRemotely, expression, startSplitsImmediately);

        AppSettings.switch(() => {
            this.startGoPaddler(startAt);
        }, () => {
            this.startUtterCycling(startAt);
        });

        this.splitsDefinition = splitsDefinition;
        this.expression = expression;
    }

    pause() {
        this.isSessionPaused = true;
        this.sessionPausedAt = Date.now();
    }

    resume() {
        this.isSessionPaused = false;
        this.pausedDuration += Date.now() - this.sessionPausedAt;
    }

    /**
     *
     * @return {Promise}
     */
    stop() {
        this.heartRateSensor.stop();
        this.gpsSensor.stop();
        if (this.motionSensor) this.motionSensor.stop();
        if (this.strokeDetectorSensor) this.strokeDetectorSensor.stop();
        if (this.cyclingCadenceSensor) this.cyclingCadenceSensor.stop();
        this.flushDebugBuffer();
        this.background.stop();
        return this.session.finish(this.splitsDefinition, this.expression, this.pausedDuration)
    }

    /**
     *
     * @param {number} startAt
     * @param {Calibration} calibration
     * @param {string} remoteScheduledSessionId
     * @param {boolean} startSplitsImmediately
     * @return {Session}
     */
    createSession(startAt, calibration, remoteScheduledSessionId, startSplitsImmediately) {
        const session = new Session(startAt, calibration.angleZ, calibration.noiseX, calibration.noiseZ
            , calibration.factorX, calibration.factorZ, calibration.predominant
        );
        session.serverClockGap = this.context.getServerClockGap();
        session.scheduledSessionId = remoteScheduledSessionId;
        session.scheduledSessionStart = startSplitsImmediately ? startAt : null;
        session.persist();
        this.session = session;
        return session;
    }

    /**
     *
     * @param {number} startAt
     * @param {Array<SplitDefinition>} splitsDefinition
     * @param {boolean} wasStartedRemotely
     * @param {Expression} expression
     * @param {boolean} startSplitsImmediately
     */
    startCommon(startAt, splitsDefinition, wasStartedRemotely, expression
                , startSplitsImmediately) {
        this.heartRateSensor.listen((hr) => {
            this.heartRate = hr;
        });

        this.gpsSensor.listen(this.locationUpdatedCallback.bind(this));
        this.background.onLocationChanged(this.locationUpdatedCallback.bind(this));

        this.splitsTools = new SessionViewSplits(startAt, this, splitsDefinition, wasStartedRemotely
            , this.distanceTools.distanceToTime.bind(this.distanceTools)
            , this.distanceTools.timeToDistance.bind(this.distanceTools)
            , this.timer, expression, startSplitsImmediately)

        this.splitsTools.on('startedIntervals', (timestamp, isDistanceBased, duration, startedRemotely) => {
            this.session.scheduledSessionStart = timestamp;
            let currentDuration = duration === null || duration === undefined ? this.timer.getCurrentDuration() : duration;
            if (!startedRemotely) Api.TrainingSessions.live.finishedWarmUp(currentDuration, this.distanceTools.timeToDistance(currentDuration) * 1000
                , isDistanceBased);
        });

        this.splitsTools.on('startedSplit', () => {
            this.skipMetricPersistenceCountDown = 1;
            this._handlers.startedSplit.apply({}, []);
        });
        this.splitsTools.on('finishedSplit', () => {
            this._handlers.finishedSplit.apply({}, []);
        });
        this.splitsTools.on('finished', () => {
            this.skipMetricPersistenceCountDown = 1;
            this._handlers.finished.apply({}, []);
        });
        this.splitsTools.on('startedDistanceBased', (duration) => {
            this._handlers.startedDistanceBased.apply({}, [duration]);
        });
        this.splitsTools.on('warmUpFinishedRemotely', (currentDuration) => {
            this._handlers.warmUpFinishedRemotely.apply({}, [currentDuration]);
        });
        this.splitsTools.on('splitStateUpdated', (duration, isRecovery, isFinished, isBasedInDistance, splitStop, stats, wasDistanceBased) => {
            this._handlers.splitStateUpdated.apply({}, [duration, isRecovery, isFinished, isBasedInDistance, splitStop, stats, wasDistanceBased]);
        });
        this.splitsTools.on('startCountDown', () => {
            this._handlers.startCountDown.apply({}, []);
        });
        this.splitsTools.on('finishCountDown', () => {
            this._handlers.finishCountDown.apply({}, []);
        });
        this.splitsTools.on('finishedNotification', () => {
            this._handlers.finishedNotification.apply({}, []);
        });

        this.background.start();
    }

    locationUpdatedCallback(position) {
        if (this.isSessionPaused) return;
        this.location.latitude = position.coords.latitude;
        this.location.longitude = position.coords.longitude;
        this.location.altitude = position.coords.altitude;
        this.lastKnownGPSPosition = position;
        this.lastKnownGPSPosition.sessionDuration = this.timer.getDuration();
    }

    /**
     *
     * @param {number} startAt
     */
    startGoPaddler(startAt) {

        this.calibration = Calibration.load(context.isPortraitMode()) || Calibration.blank();

        this.motionSensor = new MotionSensor(this.calibration, context.isPortraitMode());
        this.motionSensor.start(startAt);
        this.motionSensor.listenLeftToRight((event) => {
            this._handlers.leftRightChanged.apply({}, [event]);
        });

        // -- handle stroke related data
        this.strokeDetectorSensor = new StrokeDetector(this.calibration, null, this.enableDebug(this.session), (value) => {
            this.magnitude = value;
        });
        this.strokeDetectorSensor.onStrokeRateChanged((value, interval, counter) => {
            if (this.isSessionPaused) return;
            this.cadence = {value: value, interval: interval, total: counter};
        });
        this.strokeDetectorSensor.start();

    }

    /**
     *
     * @param {number} startAt
     */
    startUtterCycling(startAt) {
        this.cyclingCadenceSensor = new BleSensor(BleSensor.TYPES().CYCLING_CADENCE);
        this.cyclingCadenceSensor.listen((value) => {
            this.cadence = {value : value, interval: 0, total: 0};
        })
    }

    /**
     * called when warm up is finished and intervals are to be started
     * @param {number} duration
     * @param {number|null} delay
     */
    startIntervals(duration, delay) {
        this.splitsTools.start(duration, delay);
    }


    /**
     * Adjust location to current duration
     * @param duration
     */
    driftLocation(duration) {
        let locationReady = this.lastKnownGPSPosition !== null
            && this.lastKnownGPSPosition !== this.previousCollectedGPSPostion
            && duration - this.lastKnownGPSPosition.sessionDuration <= 5000;
        if (!locationReady) return;

        this.location.distance = this.distanceTools.calculate(this.lastKnownGPSPosition, duration);
        this.location.speed = this.speedTools.calculate(this.lastKnownGPSPosition);
        this.location.pace = this.paceTools.calculate(this.location.speed);
        this.location.efficiency = StrokeEfficiency.calculate(this.location.speed, this.cadence.interval);
        this.location.strokes = StrokeEfficiency.calculatePer100(this.location.efficiency);
        this.previousCollectedGPSPostion = this.lastKnownGPSPosition;
    }

    /**
     * Gather metrics - should be called after driftLocation to ensure better accuracy
     *
     * @private
     *
     * @param {number} timestamp
     * @param {number} duration
     * @param {number} position
     * @param {boolean} isRecovery
     * @return {SessionDetail}
     */
    createSessionDataRecord(timestamp, duration, position, isRecovery) {
        return new SessionDetail(this.session.id, timestamp
            , this.location.distance, this.location.speed, this.cadence.value
            , this.location.efficiency, this.location.latitude, this.location.longitude, this.location.altitude
            , this.heartRate, position, this.cadence.total
            , this.magnitude, isRecovery === true, this.motionSensor ? this.motionSensor.read() : 0
        );
    }

    /**
     *
     * @param {Session} session
     */
    enableDebug(session) {

        this.rawSensorDataForDebug = [];

        if (this.isDebugEnabled !== true) {
            return function () {
            };
        }

        // Open debug file
        let fileOpenedSuccessfully = false;
        IO.open(session.debugFile).then((file) => {
            this.rawSensorFileForDebug = file;
            fileOpenedSuccessfully = true;
        }).fail(() => {
            fileOpenedSuccessfully = false;
        });

        const self = this;
        return function onAccelerationTriggered(acceleration, value) {

            if (fileOpenedSuccessfully === false) {
                self.rawSensorDataForDebug = [];
                return;
            }

            if (self.rawSensorDataForDebug.length >= 100) {
                self.flushDebugBuffer();
            }

            self.rawSensorDataForDebug.push([acceleration.timestamp, acceleration.x, acceleration.y, acceleration.z, value].join(';'));
        };
    }

    flushDebugBuffer() {
        IO.write(this.rawSensorFileForDebug, this.rawSensorDataForDebug.join('\n') + '\n');
        this.rawSensorDataForDebug = [];
    }

    on(event, callback) {
        this._handlers[event] = callback;
    }

    /**
     * call on every timer cycle (1 second at the time)
     * @param {number} timestamp
     * @param {number} duration
     */
    cycle(timestamp, duration) {
        if (this.isSessionPaused) return;
        // update distance to current duration
        this.driftLocation(duration);
        let persistRecord = this.skipMetricPersistenceCountDown <= 0;
        let splitDetail = this.splitsTools.cycle(timestamp, duration, this.location.distance, persistRecord);
        let sessionDetail = this.createSessionDataRecord(timestamp, duration, splitDetail.position, splitDetail.isRecovery);
        if (persistRecord) sessionDetail.save();
        this.skipMetricPersistenceCountDown--;

        this.iterator.next();
        if (!this.iterator.locked()) return;

        Api.TrainingSessions.live.update({
            spm: sessionDetail.getSpm(),
            timestamp: timestamp,
            distance: sessionDetail.getDistance(),
            speed: Utils.round2(sessionDetail.getSpeed()),
            efficiency: sessionDetail.getSpeed(),
            duration: this.timer.getDuration(),
            hr: sessionDetail.getHeartRate(),
            split: splitDetail.position,
            locationTs: this.location.timestamp || 0,
            locationChanged: this.hasLocationChanged(this.lastCommunicatedGPSPosition, this.lastKnownGPSPosition),
            locationAccuracy: this.location.accuracy
        }, 'running');
        this.lastCommunicatedGPSPosition = this.lastKnownGPSPosition;

        if (this.location.timestamp !== null && Date.now() - this.location.timestamp > 5000) {
            this.speedTools.reset();
            this._handlers.lostGpsSignal.apply({}, []);
        }

        this.background.updateNotificationText(this.timer.format(this.timer.getDuration()));
    }

    /**
     *
     * @return {FieldValues}
     */
    status() {
        return {
            distance: this.location.distance,
            lastSplitStartDistance: this.splitsTools.lastSplitStartDistance,
            efficiency: this.location.efficiency,
            strokes: this.location.strokes, // strokes per 100m
            pace: this.location.pace,
            spm: this.cadence.value,
            heartRate: this.heartRate,
            speed: this.location.speed, //speed is averaged or instant based on user settings
            averageSpeed: this.speedTools.avgSessionSpeed(this.location.distance, this.timer.getDuration())
        }
    }

    /**
     *
     * @param {boolean} isImperial
     * @return {null|{spm: number, efficiency: number, strokes: number, distance: number, heartRate: number, pace: (number|string), speed: number}}
     */
    calculateLastSplitStats(isImperial) {
        return this.splitsTools.calculateLastSplitStats(isImperial);
    }

    /**
     *
     * @return {boolean}
     */
    isLastFinishedSplitDistanceBased() {
        return this.splitsTools.isLastFinishedSplitDistanceBased();
    }

    /**
     *
     * @return {number}
     */
    lastSplitDuration() {
        return this.splitsTools.lastSplitDuration();
    }

    /**
     * Check if location was updated
     * @param lastCommunicatedGPSPosition
     * @param lastKnownGPSPosition
     * @return {boolean}
     */
    hasLocationChanged(lastCommunicatedGPSPosition, lastKnownGPSPosition) {
        if (lastKnownGPSPosition === null) {
            return false;
        }

        if (lastCommunicatedGPSPosition === null) {
            return true;
        }

        return lastCommunicatedGPSPosition.coords.latitude !== lastKnownGPSPosition.coords.latitude
            || lastCommunicatedGPSPosition.coords.longitude !== lastKnownGPSPosition.coords.longitude;
    }

    /**
     *
     * @param duration
     * @return {number}
     */
    calculateDistanceForDuration(duration) {
        return this.distanceTools.timeToDistance(duration);
    }

    get heartRateSensor() {
        return this._heartRateSensor;
    }

    set heartRateSensor(value) {
        this._heartRateSensor = value;
    }

    get gpsSensor() {
        return this._gpsSensor;
    }

    set gpsSensor(value) {
        this._gpsSensor = value;
    }

    get motionSensor() {
        return this._motionSensor;
    }

    set motionSensor(value) {
        this._motionSensor = value;
    }

    get cyclingCadenceSensor() {
        return this._cyclingCadenceSensor;
    }

    set cyclingCadenceSensor(value) {
        this._cyclingCadenceSensor = value;
    }

    get context() {
        return this._context;
    }

    set context(value) {
        this._context = value;
    }

    get gps() {
        return this._gps;
    }

    set gps(value) {
        this._gps = value;
    }

    get cadence() {
        if (this.context.isDev()) {
            let value = Utils.getRandomInt(80, 84);
            let interval = 60 / value * 1000;
            this.cadence = {value: value, interval: interval, total: 0};
        }
        return this._cadence;
    }

    set cadence(value) {
        this._cadence = value;
    }

    get heartRate() {
        if (this.context.isDev()) {
            return Utils.getRandomInt(178, 182);
        }
        return this._heartRate;
    }

    set heartRate(value) {
        this._heartRate = value;
    }

    get magnitude() {
        return this._magnitude;
    }

    set magnitude(value) {
        this._magnitude = value;
    }

    get lastKnownGPSPosition() {
        return this._lastKnownGPSPosition;
    }

    set lastKnownGPSPosition(value) {
        this._lastKnownGPSPosition = value;
    }

    get isSessionPaused() {
        return this._isSessionPaused;
    }

    set isSessionPaused(value) {
        this._isSessionPaused = value;
    }

    get timer() {
        return this._timer;
    }

    set timer(value) {
        this._timer = value;
    }


    get location() {
        return this._location;
    }

    set location(value) {
        this._location = value;
    }


    get strokeDetectorSensor() {
        return this._strokeDetectorSensor;
    }

    set strokeDetectorSensor(value) {
        this._strokeDetectorSensor = value;
    }


    get calibration() {
        return this._calibration;
    }

    set calibration(value) {
        this._calibration = value;
    }

    get session() {
        return this._session;
    }

    set session(value) {
        this._session = value;
    }

    get isDebugEnabled() {
        return this._isDebugEnabled;
    }

    set isDebugEnabled(value) {
        this._isDebugEnabled = value;
    }


    get rawSensorDataForDebug() {
        return this._rawSensorDataForDebug;
    }

    set rawSensorDataForDebug(value) {
        this._rawSensorDataForDebug = value;
    }

    get rawSensorFileForDebug() {
        return this._rawSensorFileForDebug;
    }

    set rawSensorFileForDebug(value) {
        this._rawSensorFileForDebug = value;
    }

    get previousCollectedGPSPostion() {
        return this._previousCollectedGPSPostion;
    }

    set previousCollectedGPSPostion(value) {
        this._previousCollectedGPSPostion = value;
    }

    get distanceTools() {
        return this._distanceTools;
    }

    set distanceTools(value) {
        this._distanceTools = value;
    }

    get speedTools() {
        return this._speedTools;
    }

    set speedTools(value) {
        this._speedTools = value;
    }

    get paceTools() {
        return this._paceTools;
    }

    set paceTools(value) {
        this._paceTools = value;
    }

    get splitsTools() {
        return this._splitsTools;
    }

    set splitsTools(value) {
        this._splitsTools = value;
    }

    /**
     *
     * @return {Utils.EndlessIterator}
     */
    get iterator() {
        return this._iterator;
    }

    set iterator(value) {
        this._iterator = value;
    }

    get lastCommunicatedGPSPosition() {
        return this._lastCommunicatedGPSPosition;
    }

    set lastCommunicatedGPSPosition(value) {
        this._lastCommunicatedGPSPosition = value;
    }

    get splitsDefinition() {
        return this._splitsDefinition;
    }

    set splitsDefinition(value) {
        this._splitsDefinition = value;
    }

    get expression() {
        return this._expression;
    }

    set expression(value) {
        this._expression = value;
    }

    get skipMetricPersistenceCountDown() {
        return this._skipMetricPersistenceCountDown;
    }

    set skipMetricPersistenceCountDown(value) {
        this._skipMetricPersistenceCountDown = value;
    }

    get sessionPausedAt() {
        return this._sessionPausedAt;
    }

    set sessionPausedAt(value) {
        this._sessionPausedAt = value;
    }

    get pausedDuration() {
        return this._pausedDuration;
    }

    set pausedDuration(value) {
        this._pausedDuration = value;
    }

    get background() {
        return this._background;
    }

    set background(value) {
        this._background = value;
    }
}
