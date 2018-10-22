'use strict';

var IO = require('../utils/io.js').IO;
var GPS = require('../utils/gps').GPS;
var HeartRateSensor = require('../device/heartrate-sensor').HeartRateSensor;
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
    if (sound === null)  sound = new Sound();

    page.onShown.then(function () {
        self.render.apply(self, [page, context, options])
    });
}

SessionView.prototype.render = function (page, context, options) {
    var self = this;
    self.isDebugEnabled = !!Api.User.getProfile().debug;
    if (context.isDev()) {
        self.development = {
            distance: 0
        }
    }

    var $page = $(page);
    var calibration = Calibration.load(context.isPortraitMode()) || Calibration.blank();
    var session = self.createSession(calibration);
    var gps = new GPS(context);
    var heartRateSensor = new HeartRateSensor();
    var distance = new Distance();
    var speed = new Speed(context);
    var pace = new Pace(context.preferences().isImperial());
    var splits;
    var strokeEfficiency = new StrokeEfficiency();
    var strokeDetector;
    var timer = new Timer(options.startedAt);
    var paused = false;

    if (context.preferences().isShowBlackAndWhite()) {

        $page.find(".session-small-measures").addClass('black-and-white');
        $page.find(".session-large-measure").addClass('black-and-white');

        if(!context.isPortraitMode()) {
            var width = $page.width();
            $page.find(".session-large-measure").css({width: Math.floor(width/2) - 1});
        }

        $page.find(".big-measure-label").addClass('black-and-white');
        $page.find(".big-measure-units").addClass('black-and-white');
        $page.find("#animation-pause-circle").attr('fill', '#000');
        $page.find("#animation-pause-dash").attr('stroke', '#000');

    } else {
        $page.find(".app-content").removeClass('black-and-white');
    }

    function splitsHandler(value, isRecovery) {
        if (paused) return;
        var unit = isRecovery ? 'Recovery' : '';

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
    self.hasSplitsDefined = !!options.splits;
    self.inWarmUp = self.hasSplitsDefined && self.isWarmUpFirst;
    self.splitsDefinition = options.splits;
    self.expression = options.expression;

    session.setScheduledSessionId(options.remoteScheduledSessionId);

    if (self.hasSplitsDefined) {
        splits = new Splits(self.splitsDefinition, splitsHandler);
        splits.onStartCountDownUserNotification(function () { sound.playStartCountDown() });
        splits.onFinishCountDownUserNotification(function () { sound.playFinishCountDown() });
        splits.onFinishUserNotification(function () { sound.playFinish() });
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


    // prevent drag using touch during session
    var preventDrag = function (e) {
        e.preventDefault();
    };
    document.addEventListener('touchmove', preventDrag, false);

    $(window).on('scroll.scrolldisabler', function (event) {
        $(window).scrollTop(0);
        event.preventDefault();
    });

    $(window).on('touchmove', function (e) {
        e.preventDefault();
    });

    // prepare iterator for live update
    var frequency = Api.User.getProfile().liveUpdateEvery;
    var iterator = new utils.EndlessIterator(1, frequency);

    // heart rate monitor
    var heartRate = 0;
    heartRateSensor.listen(function (hr) {
        heartRate = hr;
    });

    // -- listen for changes in splits and notify server
    splits.onSplitChange(function onSplitChangeListener(changedAt, newSplitNumber, previous, current) {
        console.log('Split changed @ ', changedAt);
        Api.TrainingSessions.live.splitChanged(changedAt * 1000
            , location.distance, Date.now() - location.timestamp, location.speed, locationUpdated(lastCommunicatedGPSPosition, lastKnownGPSPosition)
            , newSplitNumber, current, previous);
    });

    // -- initiate timer
    var lastCommunicatedGPSPosition = null, lastKnownGPSPosition = null;
    var startAt = timer.start(function (value, /* current timestamp = */ timestamp, duration) {
        if (paused) return;

        if (context.isDev()) {
            heartRate = utils.getRandomInt(178, 182);
        }

        splits.setTime(timestamp, duration);
        console.debug('... duration => ', duration);

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


        // store data
        new SessionDetail(session.getId(), timestamp, location.distance, location.speed, spm.value
            , location.efficiency, location.latitude, location.longitude, heartRate, splits.getPosition()
        ).save();

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

    session.setSessionStart(startAt);
    session.persist();
    Api.TrainingSessions.live.started(startAt, self.expression);

    Api.TrainingSessions.live.on(Api.LiveEvents.START_SPLIT, function (commandId, payload) {
        console.log('start split', commandId);
        splits.increment();
        Api.TrainingSessions.live.commandSynced(commandId, Api.LiveEvents.START_SPLIT, {
            distance: location.distance,
            split: payload.split,
            gap: Date.now() - (location.timestamp || 0), // difference between communication and actual reading from GPS
            speed: location.speed,
            device: Api.User.getId()
        });
    }, false);

    Api.TrainingSessions.live.on(Api.LiveEvents.FINISH_WARMUP, function (commandId, payload) {
        splits.reset(0, Math.round(payload.durationFinishedAt / 1000), payload.finishedDistance);
        finishWarmUp(startAt + payload.durationFinishedAt);
        console.log('Finished warm-up @ ', timer.getDuration());
        Api.TrainingSessions.live.commandSynced(commandId);
    }, false);

    // -- start splits immediately
    if (self.hasSplitsDefined && !self.isWarmUpFirst) {
        session.setScheduledSessionStart(session.getSessionStart());
        splits.start(undefined, undefined, undefined);
    }


    // -- Handle GPS sensor data
    var location = {
        speed: 0, pace: 0, efficiency: 0, distance: 0
        , latitude: 0, longitude: 0
        , timestamp: null, accuracy: null
    }, spm = {value: 0, interval: 0};

    gps.listen(function (position) {
        if (paused) return;

        location = {speed: 0, pace: 0, efficiency: 0, distance: 0
            , latitude: 0, longitude: 0
            , accuracy: position.coords.accuracy
            , timestamp: position.timestamp};

        location.distance = distance.calculate(position);
        location.speed = speed.calculate(position);

        if (context.isDev()) {
            location.speed = 36;
            self.development.distance += (location.speed * (1/3600));
            location.distance = self.development.distance;
        }

        location.efficiency = strokeEfficiency.calculate(location.speed, spm.interval);
        location.pace = pace.calculate(location.speed);
        location.latitude = position.coords.latitude;
        location.longitude = position.coords.longitude;
        lastKnownGPSPosition = position;
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
    strokeDetector = new StrokeDetector(calibration, null, self.debug(session));
    strokeDetector.onStrokeRateChanged(function (value, interval) {
        if (paused) return;

        if (context.isDev()) {
            value = utils.getRandomInt(80, 84);
            interval = 60 / value * 1000;
        }

        spm = {value: value, interval: interval};
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

        var values = {
            distance: location.distance,
            efficiency: location.efficiency,
            pace: location.pace,
            spm: spm.value,
            heartRate: heartRate
        };

        if (context.getGpsRefreshRate() !== 1) {
            values.speed = location.speed;
        }

        splits.setDistance(location.distance);

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

        document.removeEventListener('touchmove', preventDrag, false);
        if (isRemoteCommand && context.userHasCoach()) {
            context.navigate('select-session', false, undefined);
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

        // clean buffer
        if (self.isDebugEnabled)
            self.flushDebugBuffer();

        session.finish(self.splitsDefinition, self.expression).then(function () {
            Dialog.hideModal();
            back();
        });
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
                splits.start(timer.getDuration(), Math.round(60 - timer.getDuration() / 1000 % 60), function onStart(timestamp) {
                    // save offset in session
                    session.setScheduledSessionStart(timestamp);
                });
                self.inWarmUp = false;
            }, function onStartImmediately() {
                isConfirmDialogOpen = false;
                finishWarmUp.apply(self, [timer.getTimestamp()])
            }, function finish() {
                clear();
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
        return confirmBeforeExit() === true;
    });

    var unlock = new Unlock();
    unlock.onUnlocked(function () {
        confirmBeforeExit();
    });
    $page.on('tap', function () {
        unlock.show();
    });


    function finishWarmUp(timestamp) {
        Dialog.hideModal();
        splits.start(null, null, null);
        session.setScheduledSessionStart(timestamp);
        self.inWarmUp = false;
    }

    self.syncClockInterval = setInterval(function () {
        Api.TrainingSessions.live.syncClock(Api.User.getId());
    }, 300000);

};

SessionView.prototype.debug = function (session) {
    var self = this;
    self.sensorData = [];

    if (self.isDebugEnabled !== true)
        return function () {};


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

    var modal = self.appContext.ui.modal.undecorated([
        '<div class="session-controls">',
        '    <div class="session-resume">',
        '		<div class="session-controls-outer-text">',
        '			<div class="session-controls-inner-text">resume</div>',
        '        </div>',
        '    </div>',
        '',
        '    <div class="session-finish">',
        '    	<div class="session-controls-outer-text">',
        '    		<div class="session-controls-inner-text">finish</div>',
        '    	</div>',
        '    </div>',
        '</div>'
    ].join(''));

    $controls = modal.$modal.find('.session-controls');
    $resume = modal.$modal.find('.session-resume');
    $finish = modal.$modal.find('.session-finish');


    // make height equal to width and adjust margin accordingly
    var displayHeight = $controls.height();
    setTimeout(function () {
        var height = $resume.width();
        var margin = (displayHeight - height) / 2;
        $resume.height(height);
        $finish.height(height);
        $resume.css({"margin-top": margin, "margin-bottom": margin});
        $finish.css({"margin-top": margin, "margin-bottom": margin});
    }, 0);

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

};

SessionView.prototype.confirmFinishWarmUp = function (onStartOnMinuteTurn, onStartImmediately, onfinish) {
    var self = this;
    var $controls, $startOnMinuteTurn, $startImmediately, $finish;

    var modal = self.appContext.ui.modal.undecorated([
        '    <div class="session-controls">',
        '        <div class="session-finish">',
        '            <div class="session-controls-outer-text">',
        '                <div class="session-controls-inner-text">finish</div>',
        '            </div>',
        '        </div>',

        '        <div class="session-start-on-minute-turn">',
        '            <div class="session-controls-outer-text">',
        '                <div class="session-controls-inner-text" style="font-size: 9px;">Start On <br>minute turn</div>',
        '            </div>',
        '        </div>',

        '        <div class="session-start-immediately">',
        '            <div class="session-controls-outer-text">',
        '                <div class="session-controls-inner-text" style="font-size: 9px;">Start Now',
        '                </div>',
        '            </div>',
        '        </div>',

        '    </div>'
    ].join(''));

    $controls = modal.$modal.find('.session-controls');

    $startOnMinuteTurn = modal.$modal.find('.session-start-on-minute-turn');
    $startImmediately = modal.$modal.find('.session-start-immediately');
    $finish = modal.$modal.find('.session-finish');

    // make height equal to width and adjust margin accordingly
    var displayHeight = $controls.height();
    setTimeout(function () {
        var height = $finish.width();
        var margin = (displayHeight - height) / 2;
        $startImmediately.height($startImmediately.width());
        $startOnMinuteTurn.height(height * .7);
        $startOnMinuteTurn.width($startOnMinuteTurn.height());

        $finish.height(height);

        $startOnMinuteTurn.css({"margin-top": margin});
        $finish.css({"margin-top": margin, "margin-bottom": margin});

    }, 0);

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
