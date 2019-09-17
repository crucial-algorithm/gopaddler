'use strict';

var IO = require('../utils/io.js').IO;
var GPS = require('../utils/gps').GPS;
var HeartRateSensor = require('../device/heartrate-sensor').HeartRateSensor;
var MotionSensor = require('../device/motion').MotionSensor;
var Dialog = require('../utils/widgets/dialog');
var utils = require('../utils/utils');
var Calibration = require('../model/calibration').Calibration;
var Session = require('../model/session').Session;
var SessionDetail = require('../model/session-detail').SessionDetail;
var Api = require('../server/api');
var StrokeDetector = require('../core/stroke-detector').StrokeDetector;
var Timer = require('../measures/timer').Timer;
var Distance = require('../measures/distance').Distance;
var Speed = require('../measures/speed').Speed;
var Pace = require('../measures/pace').Pace;
var Splits = require('splits-handler').Splits;
var StrokeEfficiency = require('../measures/efficiency').StrokeEfficiency;
var Field = require('../measures/field.js').Field;
var template = require('./session.view.art.html');
var Unlock = require('../utils/widgets/unlock').Unlock;
var DistanceProgressBar = require('../utils/widgets/distance-progress-bar').DistanceProgressBar;
var Sound = require('../utils/sound').Sound;


var DEFAULT_POSITIONS = {
    top: 'timer',
    middle: 'speed',
    bottom: 'distance',
    large: 'spm'
};

var SMALL = 'small', LARGE = 'large';

var sound = null;

/**
 *
 * @param page
 * @param context
 * @param options Object {expression: String
 *             , splits: Array
 *             , isWarmUpFirst: boolean
 *             , startedAt: Integer
 *             , remoteScheduledSessionId: String}
 * @constructor
 */
function SessionView(page, context, options) {
    var self = this;
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));
    self.appContext = context;
    if (sound === null) sound = new Sound();

    page.onReady.then(function () {
        self.render.apply(self, [page, context, options])
    });
}

SessionView.prototype.render = function (page, context, options) {
    var self = this;
    self.isDebugEnabled = !!Api.User.getProfile().debug;
    self.sessionFinished = false;

    var $page = $(page);
    var calibration = Calibration.load(context.isPortraitMode()) || Calibration.blank();
    var session = self.createSession(calibration);
    var gps = new GPS(context);
    var heartRateSensor = new HeartRateSensor();
    self.motionSensor = new MotionSensor(calibration, context.isPortraitMode());
    /**@type Distance */
    var distance = new Distance(context);
    var speed = new Speed(context);
    var pace = new Pace(context.preferences().isImperial());
    var splits;
    var strokeEfficiency = new StrokeEfficiency();
    var strokeDetector;
    var timer = new Timer(options.startedAt);
    var paused = false;
    var distanceProgressHandler = new DistanceProgressBar($page);
    var lastFinishedSplit = null;
    var $window = $(window);

    if (context.preferences().isShowBlackAndWhite()) {

        $page.find(".session-small-measures").addClass('black-and-white');
        $page.find(".session-large-measure").addClass('black-and-white');

        if (!context.isPortraitMode()) {
            var width = $page.width();
            $page.find(".session-large-measure").css({width: Math.floor(width / 2) - 1});
        }

        $page.find(".big-measure-label").addClass('black-and-white');
        $page.find(".big-measure-units").addClass('black-and-white');
        $page.find("#animation-pause-circle").attr('fill', '#000');
        $page.find("#animation-pause-dash").attr('stroke', '#000');

    } else {
        $page.find(".app-content").removeClass('black-and-white');
    }

    function splitsHandler(value, isRecovery, isFinished, isBasedInDistance, splitStop, stats) {
        if (paused) return;
        var unit = isRecovery === true ? 'Recovery' : '';

        if (lastFinishedSplit && lastFinishedSplit.isDistanceBased === true && freeze > 0) {
            return;
        }

        if (isFinished === true) {
            return;
        } else if (isBasedInDistance === false) {
            value = timer.format(value);
        } else {
            distanceProgressHandler.update(Math.ceil(value / 10) * 10);
            value = timer.format(timer.getDuration() - stats.start.time);
        }

        top.setValue("splits", value);
        middle.setValue("splits", value);
        bottom.setValue("splits", value);
        large.setValue("splits", value);
        top.setUnit("splits", unit);
        middle.setUnit("splits", unit);
        bottom.setUnit("splits", unit);
        large.setUnit("splits", unit);
    }

    options = options || {};

    self.isWarmUpFirst = options.isWarmUpFirst === true;
    self.hasSplitsDefined = Array.isArray(options.splits) && options.splits.length > 0;
    self.inWarmUp = self.hasSplitsDefined && self.isWarmUpFirst;
    self.splitsDefinition = options.splits;
    self.expression = options.expression;

    session.setScheduledSessionId(options.remoteScheduledSessionId);

    if (self.hasSplitsDefined) {
        splits = new Splits(self.splitsDefinition, splitsHandler, options.wasStartedRemotely === true
            , distance.distanceToTime.bind(distance), distance.timeToDistance.bind(distance)
            , timer.getCurrentDuration.bind(timer));
        splits.onStartCountDownUserNotification(function () {
            sound.playStartCountDown()
        });
        splits.onFinishCountDownUserNotification(function () {
            sound.playFinishCountDown()
        });
        splits.onFinishUserNotification(function () {
            sound.playFinish();
            navigator.vibrate(1000)
        });
    } else {
        splits = new Splits();
    }

    document.PREVENT_SYNC = true;

    var fields;
    if (context.preferences().isRestoreLayout()) {
        fields = loadLayout();
    } else {
        fields = DEFAULT_POSITIONS;
    }

    var top = new Field($('.session-small-measure.yellow', page), fields.top, SMALL, context, self.hasSplitsDefined);
    var middle = new Field($('.session-small-measure.blue', page), fields.middle, SMALL, context, self.hasSplitsDefined);
    var bottom = new Field($('.session-small-measure.red', page), fields.bottom, SMALL, context, self.hasSplitsDefined);
    var large = new Field($('.session-large-measure', page), fields.large, LARGE, context, self.hasSplitsDefined);


    $window.on('scroll.session', function (event) {
        $window.scrollTop(0);
        event.preventDefault();
    });

    // prepare iterator for live update
    var frequency = Api.User.getProfile().liveUpdateEvery;
    var iterator = new utils.EndlessIterator(1, frequency);

    // heart rate monitor
    var heartRate = 0;
    heartRateSensor.listen(function (hr) {
        heartRate = hr;
    });

    var lastSplitStartDistance = 0, areSplitsFinished = false, freeze = 0, metrics = [], skip = 0;
    // -- listen for changes in splits and notify server
    splits.onSplitChange(function onSplitChangeListener(from, to, isFinished) {
        var inRecovery = false;
        var duration = timer.getDuration();
        var timeSinceStartAt = timer.getTimestamp() - startAt;
        var pausedTime = timeSinceStartAt !== duration ? timeSinceStartAt - duration : 0;
        if (from) {
            lastFinishedSplit = from;
            lastSplitStartDistance = from.finish.distance;
            inRecovery = from.isRecovery === true;

            new SessionDetail(session.getId(), startAt + pausedTime + from.finish.time, from.finish.distance / 1000
                , location.speed, spm.value, location.efficiency, location.latitude, location.longitude, heartRate
                , from.position, spm.total, magnitude, inRecovery
            ).save();

            if (metrics[from.position]) {
                metrics[from.position].distance = from.finish.distance - from.start.distance;
                metrics[from.position].duration = from.finish.time - from.start.time;
            }
        }

        if (to) {
            lastSplitStartDistance = to.start.distance;
            if (to.isRecovery) lastSplitStartDistance = 0;
            inRecovery = to.isRecovery;

            new SessionDetail(session.getId(), startAt + pausedTime + to.start.time, to.start.distance / 1000
                , location.speed, spm.value, location.efficiency, location.latitude, location.longitude, heartRate
                , to.position, spm.total, magnitude, inRecovery
            ).save();

            metrics[to.position] = {
                counter: 0,
                spm: 0,
                efficiency: 0,
                heartRate: 0,
                distance: 0,
                duration: 0
            };
            skip = 1;

            if (to.isDistanceBased) {
                distanceProgressHandler.start(/* duration in meters = */ to.duration);
            }

        } else {
            lastSplitStartDistance = 0;
        }

        areSplitsFinished = isFinished;
        if (inRecovery === true /** prevent freeze when on start on minute turn = */ && to.position >= 0) {
            freeze = 5;
            distanceProgressHandler.finish();
        }

        if (isFinished === true) {
            freeze = 5;
            skip = 1;
            distanceProgressHandler.finish();
        }

        Api.TrainingSessions.live.splitChanged(from, to, isFinished);
    });

    // -- initiate timer
    var lastCommunicatedGPSPosition = null, lastKnownGPSPosition = null, previousGPSPosition = null;
    var startAt = timer.start(function (value, /* current timestamp = */ timestamp, duration) {
        if (paused) return;

        // GPS based metrics
        var now = Date.now();
        if (lastKnownGPSPosition !== null && lastKnownGPSPosition !== previousGPSPosition
            && duration - lastKnownGPSPosition.sessionDuration <= 5000) {
            location.distance = distance.calculate(lastKnownGPSPosition, timer.getDuration());
            location.speed = speed.calculate(lastKnownGPSPosition, now);
            location.pace = pace.calculate(location.speed);
            location.efficiency = strokeEfficiency.calculate(location.speed, spm.interval);
            location.strokes = strokeEfficiency.calculatePer100(location.efficiency);
            previousGPSPosition = lastKnownGPSPosition;
        }

        splits.update(timestamp, duration, location.distance);
        splits.reCalculate();

        if (context.isDev()) {
            heartRate = utils.getRandomInt(178, 182);
        }

        top.setValue("timer", value);
        middle.setValue("timer", value);
        bottom.setValue("timer", value);
        large.setValue("timer", value);

        if (context.getGpsRefreshRate() === 1) {
            top.setValue("speed", location.speed);
            middle.setValue("speed", location.speed);
            bottom.setValue("speed", location.speed);
            large.setValue("speed", location.speed);
        }

        if (skip-- <= 0) {
            var position = splits.getPosition();
            // store data
            new SessionDetail(session.getId(), timestamp, location.distance, location.speed, spm.value
                , location.efficiency, location.latitude, location.longitude, heartRate, position, spm.total
                , magnitude, splits.isRecovery(), self.motionSensor.read()
            ).save();

            var metric = metrics[position];
            if (metric) {
                metric.counter++;
                metric.spm += spm.value;
                metric.efficiency += location.efficiency;
                metric.heartRate += heartRate;
            }
        }

        iterator.next();
        if (iterator.locked()) {
            Api.TrainingSessions.live.update({
                spm: spm.value,
                timestamp: timestamp,
                distance: location.distance,
                speed: utils.round2(location.speed),
                efficiency: location.efficiency,
                duration: timer.getDuration(),
                hr: heartRate,
                split: splits.getPosition(),
                locationTs: location.timestamp || 0,
                locationChanged: locationUpdated(lastCommunicatedGPSPosition, lastKnownGPSPosition),
                locationAccuracy: location.accuracy
            }, 'running');
            lastCommunicatedGPSPosition = lastKnownGPSPosition;
        }

    });

    // motion sensor monitor
    self.motionSensor.start(startAt);

    session.setSessionStart(startAt);
    session.persist();

    Api.TrainingSessions.live.resetSessionData();

    Api.TrainingSessions.live.syncClock(Api.User.getId()).then(function () {
        Api.TrainingSessions.live.started(startAt, self.expression).then(function (liveSessionId) {
            Api.TrainingSessions.live.updateStatus(context.LIVE_STATUS.RUNNING, liveSessionId);
        });
    });

    Api.TrainingSessions.live.on(Api.LiveEvents.START_SPLIT, function (commandId, payload) {

        splits.resetDistance(distance.timeToDistance(payload.duration));
        splits.increment();
        Api.TrainingSessions.live.commandSynced(commandId, Api.LiveEvents.START_SPLIT, {
            distance: location.distance,
            split: payload.split,
            gap: Date.now() - (location.timestamp || 0), // difference between communication and actual reading from GPS
            speed: location.speed,
            device: Api.User.getId()
        });
    }, false);

    Api.TrainingSessions.live.on(Api.LiveEvents.RESUME_SPLITS, function (commandId, payload) {
        console.debug('resume splits', commandId);
        splits.increment(timer.getCurrentDuration(), distance.timeToDistance(timer.getCurrentDuration()) * 1000);
        Api.TrainingSessions.live.commandSynced(commandId);
    }, false);

    Api.TrainingSessions.live.on(Api.LiveEvents.FINISH_WARMUP, function (commandId, payload) {
        console.debug('Finished warm-up @', timer.getCurrentDuration(), payload.durationFinishedAt);
        var currentDuration = timer.getCurrentDuration();
        finishWarmUp(currentDuration);
        splits.reset(0, currentDuration
            , distance.timeToDistance(currentDuration) * 1000);
        Api.TrainingSessions.live.commandSynced(commandId);
    }, false);

    Api.TrainingSessions.live.on(Api.LiveEvents.HARD_RESET, function (commandId, payload) {
        localStorage.setItem('hard_reset', new Date().toISOString());
        location.reload();
    }, true);

    // -- start splits immediately
    if (self.hasSplitsDefined && !self.isWarmUpFirst) {
        session.setScheduledSessionStart(session.getSessionStart());
        splits.start(undefined, undefined, function onStart(timestamp, isDistanceBased, duration) {
            // save offset in session
            session.setScheduledSessionStart(timestamp);
            Api.TrainingSessions.live.finishedWarmUp(duration, distance.timeToDistance(duration) * 1000, isDistanceBased)
        });
    }


    // -- Handle GPS sensor data
    var location = {
        speed: 0, pace: 0, efficiency: 0, distance: 0
        , latitude: 0, longitude: 0
        , timestamp: null, accuracy: null
    }, spm = {value: 0, interval: 0};

    gps.listen(function (position) {
        if (paused) return;
        location.latitude = position.coords.latitude;
        location.longitude = position.coords.longitude;
        lastKnownGPSPosition = position;
        lastKnownGPSPosition.sessionDuration = timer.getDuration();
    });

    var resetGpsData = function () {
        var values = {speed: 0, pace: 0, efficiency: 0};
        speed.reset();

        top.setValues(values);
        middle.setValues(values);
        bottom.setValues(values);
        large.setValues(values);
    };

    // -- handle stroke related data
    var magnitude = 0;
    strokeDetector = new StrokeDetector(calibration, null, self.debug(session), function (value) {
        magnitude = value;
    });
    strokeDetector.onStrokeRateChanged(function (value, interval, counter) {
        if (paused) return;

        if (context.isDev()) {
            value = utils.getRandomInt(80, 84);
            interval = 60 / value * 1000;
        }

        spm = {value: value, interval: interval, total: counter};
    });
    strokeDetector.start();

    // -- listen to server side commands
    var isRemoteCommand = false;
    Api.TrainingSessions.live.on(Api.LiveEvents.FINISH, function (commandId) {
        Api.TrainingSessions.live.commandSynced(commandId);
        isRemoteCommand = true;
        clear();
    }, false);

    // -- refresh screen
    self.uiIntervalId = setInterval(function refreshUI() {
        if (paused) return;

        var distance = Math.round((location.distance * 1000 - lastSplitStartDistance));
        var values = {
            distance: distance - distance % 10,
            efficiency: location.efficiency,
            strokes: location.strokes,
            pace: location.pace,
            spm: spm.value,
            heartRate: heartRate
        };

        if (context.getGpsRefreshRate() !== 1) {
            values.speed = location.speed;
        }

        if (freeze > 0) {
            freeze--;
            var position = splits.getPosition();
            var latest = metrics[areSplitsFinished ? metrics.length - 1 : position - 1], pace;
            values.distance = Math.round(latest.distance * 100) / 100;
            values.spm = latest.spm / latest.counter;
            values.efficiency = latest.efficiency / latest.counter;
            values.strokes = Math.round(100 / (latest.efficiency / latest.counter));
            values.heartRate = latest.heartRate / latest.counter;
            values.speed = (latest.distance / latest.duration) * 3600;
            values.pace = (pace = utils.speedToPace(values.speed)) === null ? 0 : pace;

            // set summary after interval finished in splits field
            if (lastFinishedSplit && lastFinishedSplit.isDistanceBased === true)
                values.splits = timer.formatWithMilis(lastFinishedSplit.finish.time - lastFinishedSplit.start.time);
        } else if (splits.isFinished()) {
            values.splits = '-';
        }


        top.setValues(values);
        middle.setValues(values);
        bottom.setValues(values);
        large.setValues(values);


        // this should not be here, but its the easiest way considering that stroke rate is updated every 1.5 sec
        if (location.timestamp !== null && (new Date().getTime()) - location.timestamp > 5000) {
            resetGpsData();
        }

    }, 2005);

    var back = function () {
        if (context.preferences().isRestoreLayout()) {
            saveLayout(top.getType(), middle.getType(), bottom.getType(), large.getType());
        } else {
            resetLayout();
        }

        if (isRemoteCommand && context.userHasCoach()) {
            context.navigate('coach-slave', false, undefined);
        } else {
            App.load('session-summary', {session: session, isPastSession: false}, undefined, function () {
                App.removeFromStack();
            });
        }
    };

    var tx = false, isConfirmDialogOpen = false;
    var clear = function (callback) {
        tx = true;
        document.PREVENT_SYNC = false;

        clearInterval(self.uiIntervalId);
        clearInterval(self.syncClockInterval);
        timer.stop();
        gps.stop();
        strokeDetector.stop();
        heartRateSensor.stop();
        self.motionSensor.stop();

        // clean buffer
        if (self.isDebugEnabled)
            self.flushDebugBuffer();

        session.finish(self.splitsDefinition, self.expression).then(function () {
            Dialog.hideModal();
            back();
        });

        self.sessionFinished = true;
    };

    var confirmBeforeExit = function () {
        if (tx) {
            tx = false;
            return true;
        }

        if (isConfirmDialogOpen === true) {
            return false
        }

        if (self.inWarmUp) {
            // we started a scheduled session and we are still
            // doing our warm up, but about to begin session

            isConfirmDialogOpen = true;
            self.confirmFinishWarmUp(function onStartOnMinuteTurn() {
                Dialog.hideModal();
                isConfirmDialogOpen = false;
                splits.start(timer.getDuration(), Math.round(60 - timer.getDuration() / 1000 % 60), function onStart(timestamp, isDistanceBased) {
                    // save offset in session
                    session.setScheduledSessionStart(timestamp);
                    var duration = timer.getCurrentDuration();
                    Api.TrainingSessions.live.finishedWarmUp(duration, distance.timeToDistance(duration) * 1000, isDistanceBased)
                });
                self.inWarmUp = false;
            }, function onStartImmediately() {
                Dialog.hideModal();
                isConfirmDialogOpen = false;
                splits.start(timer.getDuration(), null, function onStart(timestamp, isDistanceBased) {
                    // save offset in session
                    session.setScheduledSessionStart(timestamp);
                    console.debug('on start immediately', timestamp, timer.getCurrentDuration());
                    var duration = timer.getCurrentDuration();
                    Api.TrainingSessions.live.finishedWarmUp(duration, distance.timeToDistance(duration) * 1000, isDistanceBased)
                });
                self.inWarmUp = false;
            }, function finish() {
                clear();
            }, function cancel() {
                console.debug('canceled');
                isConfirmDialogOpen = false;
                Dialog.hideModal();
            });

        } else {

            timer.pause();
            paused = true;

            isConfirmDialogOpen = true;
            self.confirm(function resume() {
                paused = false;
                timer.resume();
                Dialog.hideModal();
                isConfirmDialogOpen = false;
            }, function finish() {
                isConfirmDialogOpen = false;
                clear();
            });
        }

    };

    $page.on('appBeforeBack', function (e) {
        if (confirmBeforeExit() === true) {
            $window.off('scroll.session');
            $window.off('touchmove.session');
            return true;
        } else {
            return false;
        }
    });

    var unlock = new Unlock(context);
    unlock.onUnlocked(function () {
        confirmBeforeExit();
    });
    $page.on('tap', function () {
        unlock.show();
    });

    if (context.isShowTouchGestures()) {
        large.animateTransition();
        unlock.show(10000);
        context.preferences().touchGesturesShown();
    }


    function finishWarmUp(timestamp) {
        Dialog.hideModal();
        splits.start(null, null, null);
        session.setScheduledSessionStart(timestamp);
        self.inWarmUp = false;
    }

    self.syncClockInterval = setInterval(function () {
        Api.TrainingSessions.live.syncClock(Api.User.getId());
    }, 300000);


    self.tester = {
        isTestingLeftRight: false
    };

    self.motionSensor.listenLeftToRight(self.leftToRightDebug.bind(this));

};

SessionView.prototype.debug = function (session) {
    var self = this;
    self.sensorData = [];

    if (self.isDebugEnabled !== true)
        return function () {
        };


    // Open debug file
    IO.open(session.getDebugFile()).then(function (file) {
        self.sensorDataFile = file;
    }).fail(function () {
        self.sensorDataFileError = true;
    });

    self.sensorDataFileError = false;
    return function onAccelerationTriggered(acceleration, value) {

        if (self.sensorDataFileError === true) {
            self.sensorData = [];
            return;
        }

        if (self.sensorData.length >= 100) {
            IO.write(self.sensorDataFile, self.sensorData.join('\n') + '\n');
            self.sensorData = [];
            return;
        }

        self.sensorData.push([acceleration.timestamp, acceleration.x, acceleration.y, acceleration.z, value].join(';'));
    };
};

SessionView.prototype.flushDebugBuffer = function () {
    var self = this;
    if (self.isDebugEnabled !== true)
        return;

    IO.write(self.sensorDataFile, self.sensorData.join('\n'));
};

SessionView.prototype.createSession = function (calibration) {
    var session = new Session(/* session start = */ null
        , calibration.getAngleZ()
        , calibration.getNoiseX()
        , calibration.getNoiseZ()
        , calibration.getFactorX()
        , calibration.getFactorZ()
        , calibration.getPredominant()
    );
    session.setServerClockGap(this.appContext.getServerClockGap());
    return session;
};

SessionView.prototype.confirm = function (onresume, onfinish) {
    var self = this;
    var $controls, $resume, $finish;
    var controlTemplate = [
        '   <div class="session-controls session-controls-free-session">',
        '   	<div class="session-controls-round-button session-resume">',
        '   		<div class="session-controls-round-button-label">' + self.appContext.translate('session_resume') + '</div>',
        '       </div>',
        '       <div class="session-controls-round-button  session-finish">',
        '   		<div class="session-controls-round-button-label">' + self.appContext.translate('session_finish') + '</div>',
        '       </div>',
        '   </div>'
    ];

    if (Api.User.isAppTester()) {
        var isActive = function () {
            if (self.tester.isTestingLeftRight) return ' session-controls-square-toggled ';
            else return '';
        };
        controlTemplate = controlTemplate.concat([
            '   <div class="session-app-tester-controls">',
            '   	<div data-selector="left-right-debug" class="session-controls-square-button' + isActive() + '">',
            '   		Left/right Debug',
            '       </div>',
            '   </div>'
        ]);
    }

    var modal = self.appContext.ui.modal.undecorated(controlTemplate.join(''));

    $controls = modal.$modal.find('.session-controls');
    $resume = $controls.find('.session-resume');
    $finish = $controls.find('.session-finish');

    // add behavior
    $resume.on('touchend', function (e) {
        onresume.apply(self, []);
        e.preventDefault();
        e.stopImmediatePropagation();
    });

    $finish.on('touchend', function (e) {
        onfinish.apply(self, []);
        e.preventDefault();
        e.stopImmediatePropagation();
    });

    var $leftRight = modal.$modal.find('[data-selector="left-right-debug"]');
    $leftRight.off('click').on('click', function () {
        self.tester.isTestingLeftRight = !self.tester.isTestingLeftRight;
        $leftRight.toggleClass('session-controls-square-toggled');
        if (self.tester.isTestingLeftRight)
            $('.session-left-right-container').css('display', 'flex');
        else
            $('.session-left-right-container').css('display', 'none');
    });

};

SessionView.prototype.confirmFinishWarmUp = function (onStartOnMinuteTurn, onStartImmediately, onfinish, onCancel) {
    var self = this;
    var $controls, $startOnMinuteTurn, $startImmediately, $finish, $cancel;
    var template = [
        [
            '<div class="session-controls">',
            '    <div class="session-controls-row">',
            '    	<div class="session-controls-round-button session-start-on-minute-turn blue">',
            '    		<div class="session-controls-round-button-label">' + self.appContext.translate('session_start_at_minute_turn') + '</div>',
            '        </div>',

            '		<div class="session-controls-round-button session-cancel grey">',
            '    		<div class="session-controls-round-button-label">' + self.appContext.translate('session_cancel') + '</div>',
            '        </div>',
            '     </div>',
            '    <div class="session-controls-row">',
            '        <div class="session-controls-round-button  session-start-immediately yellow">',
            '    		<div class="session-controls-round-button-label">' + self.appContext.translate('session_start_now') + '</div>',
            '        </div>',

            '        <div class="session-controls-round-button  session-finish red">',
            '    		<div class="session-controls-round-button-label">' + self.appContext.translate('session_finish') + '</div>',
            '        </div>',
            '     </div>',
            '</div>'
        ]
    ];

    if (Api.User.isAppTester()) {
        var isActive = function () {
            if (self.tester.isTestingLeftRight) return ' session-controls-square-toggled ';
            else return '';
        };
        template = template.concat([
            '   <div class="session-app-tester-controls">',
            '   	<div data-selector="left-right-debug" class="session-controls-square-button' + isActive() + '">',
            '   		Left/right Debug',
            '       </div>',
            '   </div>'
        ]);
    }


    var modal = self.appContext.ui.modal.undecorated(template.join(''));

    $controls = modal.$modal.find('.session-controls');

    $startOnMinuteTurn = $controls.find('.session-start-on-minute-turn');
    $startImmediately = $controls.find('.session-start-immediately');
    $finish = $controls.find('.session-finish');
    $cancel = $controls.find('.session-cancel');


    // add behavior
    $startOnMinuteTurn.on('touchend', function (e) {
        onStartOnMinuteTurn.apply(self, []);
        e.preventDefault();
        e.stopImmediatePropagation();
    });

    $startImmediately.on('touchend', function (e) {
        onStartImmediately.apply(self, []);
        e.preventDefault();
        e.stopImmediatePropagation();
    });

    $finish.on('touchend', function (e) {
        onfinish.apply(self, []);
        e.preventDefault();
        e.stopImmediatePropagation();
    });

    $cancel.on('touchend', function (e) {
        onCancel.apply(self, []);
        e.preventDefault();
        e.stopImmediatePropagation();
    });

    var $leftRight = modal.$modal.find('[data-selector="left-right-debug"]');
    $leftRight.off('click').on('click', function () {
        self.tester.isTestingLeftRight = !self.tester.isTestingLeftRight;
        $leftRight.toggleClass('session-controls-square-toggled');
        if (self.tester.isTestingLeftRight)
            $('.session-left-right-container').css('display', 'flex');
        else
            $('.session-left-right-container').css('display', 'none');
    });
};

SessionView.prototype.leftToRightDebug = function () {
    var self = this;
    if (Api.User.isAppTester() === false) return;
    if (self.tester.isTestingLeftRight === false) return;

    var $left = $('.session-left'), $right = $('.session-right');

    self.motionSensor.listenLeftToRight(function (event) {
        if (event.left === true) $left.addClass('active');
        if (event.left === false) $left.removeClass('active');
        if (event.right === true) $right.addClass('active');
        if (event.right === false) $right.removeClass('active');
    })
};

function saveLayout(top, middle, bottom, large) {
    window.localStorage.setItem("layout", JSON.stringify({
        top: top,
        middle: middle,
        bottom: bottom,
        large: large
    }));
}

function loadLayout() {
    var layout = window.localStorage.getItem("layout");
    if (layout)
        return JSON.parse(layout);
    else
        return DEFAULT_POSITIONS;
}

function resetLayout() {
    window.localStorage.removeItem("layout");
}

function locationUpdated(lastCommunicatedGPSPosition, lastKnownGPSPosition) {
    if (lastKnownGPSPosition === null) {
        return false;
    }

    if (lastCommunicatedGPSPosition === null) {
        return true;
    }

    return lastCommunicatedGPSPosition.coords.latitude !== lastKnownGPSPosition.coords.latitude
        || lastCommunicatedGPSPosition.coords.longitude !== lastKnownGPSPosition.coords.longitude;
}

exports.SessionView = SessionView;
