import SessionDetail from "../model/session-detail";
import Api from "../server/api";
import Context from "../context";
import Splits from "../core/splits-handler";
import Utils from "../utils/utils";
/**
 * @typedef {Object} SplitSummary
 * @property {number} counter
 * @property {number} spm
 * @property {number} efficiency
 * @property {number} heartRate
 * @property {number} distance
 * @property {number} duration
 */


export class SessionViewSplits {
    /**
     *
     * @param {number}                      startedAt           Start session timestamp
     * @param {SessionViewCollectMetrics}   metrics
     * @param {Array<SplitDefinition>}      splitsDefinition
     * @param {boolean}                     wasStartedRemotely
     * @param {function}                    distanceToTime      calculate distance based in timestamp
     * @param {function}                    timeToDistance      calculate time based in distance
     * @param {Timer}                       timer
     * @param {Expression}                  expression
     * @param {boolean}                     startSplitsImmediately
     *
     */
    constructor(startedAt, metrics
                , splitsDefinition, wasStartedRemotely,distanceToTime, timeToDistance
                , timer, expression, startSplitsImmediately) {
        this._metrics = metrics;

        /**@type {Splits} */
        this._splitsHandler = this.initSplitsHandler(splitsDefinition, wasStartedRemotely, distanceToTime, timeToDistance, timer);
        this._timer = timer;
        this._startedAt = startedAt;
        this._expression = expression;

        this._lastFinishedSplit = null;
        /**@type number*/
        this._lastSplitStartDistance = 0;
        this._areSplitsFinished = false;

        /**@type Array<SplitSummary>*/
        this._summary = [];

        this.splitsHandler.onSplitChange(this.listen.bind(this));
        this.handleLiveStream(this.startedAt, this.expression);

        this._handlers = {
            startedIntervals:() => {},        // when splits started
            startedSplit: () => {},           // on every split start
            finishedSplit: () => {},          // on every split finish
            finished: () => {},               // splits finished
            startedDistanceBased: () => {},   // distance split started
            warmUpFinishedRemotely: () => {},
            splitStateUpdated: () => {},
            startCountDown:() => {},
            finishCountDown:() => {},
            finishedNotification:() => {},
        };

        if (startSplitsImmediately)
            this.start(null, null);
    }

    /**
     *
     * @param {Array<SplitDefinition>}      splitsDefinition
     * @param {boolean}                     wasStartedRemotely
     * @param {function}                    distanceToTime      calculate distance based in timestamp
     * @param {function}                    timeToDistance      calculate time based in distance
     * @param {Timer}                       timer
     * @return {Splits}
     */
    initSplitsHandler(splitsDefinition, wasStartedRemotely, distanceToTime, timeToDistance, timer) {
        if (!(Array.isArray(splitsDefinition) && splitsDefinition.length > 0)) return new Splits();


        const handler = new Splits(splitsDefinition, this.currentSplitStateHandler.bind(this)
          , wasStartedRemotely, distanceToTime, timeToDistance
          , timer.getCurrentDuration.bind(timer));


        handler.onStartCountDownUserNotification(() => {
            this._handlers.startCountDown();
        });
        handler.onFinishCountDownUserNotification(() => {
            this._handlers.finishCountDown();
        });
        handler.onFinishUserNotification(() => {
            this._handlers.finishedNotification();
        });

        return handler;
    }

    start(duration, delay, startedRemotely = false) {
        this.splitsHandler.start(duration, delay, (timestamp, isDistanceBased, duration) => {
            // Duration is only !== null on start splits immediately (without warm up)
            this._handlers.startedIntervals.apply({}, [timestamp, isDistanceBased, duration, startedRemotely]);
        })
    }

    on(event, handler) {
        this._handlers[event] = handler;
    }

    /**
     * Listener for when swap split happens
     * @param {SplitInfo} from
     * @param {SplitInfo} to
     * @param {boolean} isFinished
     */
    listen(from, to, isFinished) {
        let inRecovery = false;
        let duration = this.timer.getDuration();
        let timeSinceStartAt = this.timer.getTimestamp() - this.startedAt;
        let pausedTime = timeSinceStartAt !== duration ? timeSinceStartAt - duration : 0;
        let location = this.metrics.location;
        let cadence = this.metrics.cadence;

        if (from) {
            this.lastFinishedSplit = from;
            this.lastSplitStartDistance = from.finish.distance;
            inRecovery = from.isRecovery === true;

            new SessionDetail(this.metrics.session.id, this.startedAt + pausedTime + from.finish.time
                , from.finish.distance / 1000
                , location.speed, cadence.value
                , location.efficiency, location.latitude, location.longitude, location.altitude
                , this.metrics.heartRate
                , from.position, cadence.total, this.metrics.magnitude, inRecovery
            ).save();

            if (this.summary[from.position]) {
                this.summary[from.position].distance = from.finish.distance - from.start.distance;
                this.summary[from.position].duration = from.finish.time - from.start.time;
            }
        }

        if (to) {
            this.lastSplitStartDistance = to.start.distance;
            if (to.isRecovery) this.lastSplitStartDistance = 0;
            inRecovery = to.isRecovery;

            new SessionDetail(this.metrics.session.id, this.startedAt + pausedTime + to.start.time
                , to.start.distance / 1000
                , location.speed, cadence.value
                , location.efficiency, location.latitude, location.longitude, location.altitude
                , this.metrics.heartRate
                , to.position, cadence.total, this.metrics.magnitude, inRecovery
            ).save();

            this.summary[to.position] = {
                counter: 0,
                spm: 0,
                efficiency: 0,
                heartRate: 0,
                distance: 0,
                duration: 0
            };
            this._handlers.startedSplit.apply({}, [])

            if (to.isDistanceBased) {
                this._handlers.startedDistanceBased.apply({}, [/* duration in meters = */ to.duration]);
            }

        } else {
            this.lastSplitStartDistance = 0;
        }

        this.areSplitsFinished = isFinished;
        if (inRecovery === true /** prevent freeze when on start on minute turn = */ && to.position >= 0) {
            this._handlers.finishedSplit.apply({}, []);
        }

        if (isFinished === true) {
            this._handlers.finished.apply({}, []);
        }

        Api.TrainingSessions.live.splitChanged(from, to, isFinished);
    }

    /**
     *
     * @param {number} startedAt
     * @param {Expression} expression
     */
    handleLiveStream(startedAt, expression) {
        Api.TrainingSessions.live.resetSessionData();

        Api.TrainingSessions.live.syncClock(Api.User.getId()).then(function () {
            Api.TrainingSessions.live.started(startedAt, expression).then(function (liveSessionId) {
                Api.TrainingSessions.live.updateStatus(Context.LiveStatus().RUNNING, liveSessionId);
            });
        });

        Api.TrainingSessions.live.on(Api.LiveEvents.START_SPLIT, (commandId, payload) => {

            this.splitsHandler.resetDistance(this.metrics.calculateDistanceForDuration(payload.duration));
            this.splitsHandler.increment();
            Api.TrainingSessions.live.commandSynced(commandId, Api.LiveEvents.START_SPLIT, {
                distance: this.metrics.location.distance,
                split: payload.split,
                gap: Date.now() - (this.metrics.location.timestamp || 0), // difference between communication and actual reading from GPS
                speed: this.metrics.location.speed,
                device: Api.User.getId()
            });
        }, false);

        Api.TrainingSessions.live.on(Api.LiveEvents.RESUME_SPLITS, (commandId, payload) => {
            console.debug('resume splits', commandId);
            this.splitsHandler.increment(this.timer.getCurrentDuration()
                , this.metrics.calculateDistanceForDuration(this.timer.getCurrentDuration()) * 1000);
            Api.TrainingSessions.live.commandSynced(commandId);
        }, false);

        Api.TrainingSessions.live.on(Api.LiveEvents.FINISH_WARMUP, (commandId, payload) => {
            console.debug('Finished warm-up @', this.timer.getCurrentDuration(), payload.durationFinishedAt);
            let currentDuration = this.timer.getCurrentDuration();
            this.splitsHandler.reset(0, currentDuration
                , this.metrics.calculateDistanceForDuration(currentDuration) * 1000);
            this.start(null, null, true);
            this._handlers.warmUpFinishedRemotely.apply({}, [currentDuration]);
            Api.TrainingSessions.live.commandSynced(commandId);
        }, false);

        Api.TrainingSessions.live.on(Api.LiveEvents.HARD_RESET, function (commandId, payload) {
            localStorage.setItem('hard_reset', new Date().toISOString());
            location.reload();
        }, true);
    }

    /**
     * Handler that is called every second and resports current split state
     *
     * @param duration
     * @param isRecovery
     * @param isFinished
     * @param isBasedInDistance
     * @param splitStop
     * @param {SplitInfo} stats
     */
    currentSplitStateHandler(duration, isRecovery, isFinished, isBasedInDistance, splitStop, stats) {
        this._handlers.splitStateUpdated.apply({}, [duration, isRecovery, isFinished
            , isBasedInDistance, splitStop, stats
            , this.lastFinishedSplit && this.lastFinishedSplit.isDistanceBased === true
        ])
    }

    /**
     *
     * @param {number} timestamp
     * @param {number} duration
     * @param {number} distance
     * @param {boolean} persistRecord
     * @return {{position: number, isRecovery: boolean}}
     */
    cycle(timestamp, duration, distance, persistRecord) {
        this.splitsHandler.update(timestamp, duration, distance);
        let position = this.splitsHandler.getPosition();
        let metric = this.summary[position];
        if (metric && persistRecord) {
            metric.counter++;
            metric.spm += this.metrics.cadence.value;
            metric.efficiency += this.metrics.location.efficiency;
            metric.heartRate += this.metrics.heartRate || 0
        }
        return {position: position, isRecovery: this.splitsHandler.isRecovery()};
    }

    /**
     *
     * @param {boolean} isImperial
     * @return {null|FieldValues}
     */
    calculateLastSplitStats(isImperial) {
        const latest = this.summary[this.areSplitsFinished ? this.summary.length - 1 : this.splitsHandler.getPosition() - 1];
        if (!latest) return null;
        let speed = (latest.distance / latest.duration) * 3600;
        return {
            distance: latest.distance,
            lastSplitStartDistance: 0,
            efficiency: latest.efficiency / latest.counter,
            strokes: 100 / (latest.efficiency / latest.counter),
            pace: Utils.speedToPace(speed, isImperial),
            spm: latest.spm / latest.counter,
            heartRate: latest.heartRate / latest.counter,
            speed: speed
        }
    }

    /**
     *
     * @return {boolean}
     */
    isLastFinishedSplitDistanceBased() {
        return this.lastFinishedSplit !== null && this.lastFinishedSplit.isDistanceBased === true;
    }

    /**
     *
     * @return {number}
     */
    lastSplitDuration() {
        if (this.lastFinishedSplit === null) return 0;
        return this.lastFinishedSplit.finish.time - this.lastFinishedSplit.start.time;
    }


    get startedAt() {
        return this._startedAt;
    }

    set startedAt(value) {
        this._startedAt = value;
    }

    get metrics() {
        return this._metrics;
    }

    set metrics(value) {
        this._metrics = value;
    }

    get splitsHandler() {
        return this._splitsHandler;
    }

    set splitsHandler(value) {
        this._splitsHandler = value;
    }

    get timer() {
        return this._timer;
    }

    set timer(value) {
        this._timer = value;
    }

    get lastFinishedSplit() {
        return this._lastFinishedSplit;
    }

    set lastFinishedSplit(value) {
        this._lastFinishedSplit = value;
    }

    get lastSplitStartDistance() {
        return this._lastSplitStartDistance;
    }

    set lastSplitStartDistance(value) {
        this._lastSplitStartDistance = value;
    }

    get areSplitsFinished() {
        return this._areSplitsFinished;
    }

    set areSplitsFinished(value) {
        this._areSplitsFinished = value;
    }

    get summary() {
        return this._summary;
    }

    set summary(value) {
        this._summary = value;
    }

    get expression() {
        return this._expression;
    }

    set expression(value) {
        this._expression = value;
    }
}