'use strict';

var IO = require('../utils/io.js').IO;
var GPS = require('../utils/gps').GPS;
var Dialog = require('../utils/dialog');
var utils = require('../utils/utils');
var Calibration = require('../model/calibration').Calibration;
var Session = require('../model/session').Session;
var SessionDetail = require('../model/session-detail').SessionDetail;
var db = require('../db').Session;
var Api = require('../server/api');
var StrokeDetector = require('../core/stroke-detector').StrokeDetector;
var Timer = require('../measures/timer').Timer;
var Distance = require('../measures/distance').Distance;
var Speed = require('../measures/speed').Speed;
var Pace = require('../measures/pace').Pace;

var StrokeEfficiency = require('../measures/efficiency').StrokeEfficiency;

var Field = require('../measures/field.js').Field;

var DEFAULT_POSITIONS = {
    top: 'timer',
    middle: 'speed',
    bottom: 'distance',
    large: 'spm'
};

var SMALL = 'small', LARGE = 'large';

function SessionView(page, context) {
    var self = this;
    self.isDebugEnabled = !!Api.User.getProfile().debug;

    var $page = $(page);
    var calibration = Calibration.load() || Calibration.blank();
    var session = self.createSession(calibration);
    var gps = new GPS();
    var distance = new Distance();
    var speed = new Speed();
    var pace = new Pace(context.preferences().isImperial());
    var strokeEfficiency = new StrokeEfficiency();
    var strokeDetector = new StrokeDetector(session, calibration, null, self.debug(session));
    var paused = false;


    document.PREVENT_SYNC = true;

    var fields;
    if (context.preferences().isRestoreLayout()) {
        fields = loadLayout();
    } else {
        fields = DEFAULT_POSITIONS;
    }

    var top = new Field($('.session-small-measure.yellow', page), fields.top, SMALL, context);
    var middle = new Field($('.session-small-measure.blue', page), fields.middle, SMALL, context);
    var bottom = new Field($('.session-small-measure.red', page), fields.bottom, SMALL, context);
    var large = new Field($('.session-left', page), fields.large, LARGE, context);


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


    // -- initiate timer
    var timer = new Timer();
    timer.start(function (value) {
        if (paused) return;
        top.setValue("timer", value);
        middle.setValue("timer", value);
        bottom.setValue("timer", value);
        large.setValue("timer", value);
    });



    // -- Handle GPS sensor data
    var lastEfficiency = 0, lastInterval = 0, lastDisplayedSpeed = 0, lastGpsAt = 0;
    gps.listen(function (position) {
        if (paused) return;

        var values = {speed: 0, pace: 0, efficiency: 0, distance:0};

        values.distance = distance.calculate(position);
        values.speed = lastDisplayedSpeed = speed.calculate(position, values.distance);
        values.efficiency = lastEfficiency = strokeEfficiency.calculate(values.speed, lastInterval);
        values.pace = pace.calculate(values.speed);

        top.setValues(values);
        middle.setValues(values);
        bottom.setValues(values);
        large.setValues(values);

        lastGpsAt = position.timestamp;

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
    var now;
    strokeDetector.onStrokeRateChanged(function (spm, interval) {
        if (paused) return;

        // update fields using spm and efficiency
        top.setValue('spm', spm);
        middle.setValue('spm', spm);
        bottom.setValue('spm', spm);
        large.setValue('spm', spm);

        // store data
        now  = new Date().getTime();
        new SessionDetail(session.getId(), now, distance.getValue(), lastDisplayedSpeed, spm
            , lastEfficiency, distance.getLatitude(), distance.getLongitude()
        ).save();

        lastInterval = interval;

        // this should not be here, but its the easiest way considering that stroke rate is updated every 1.5 sec
        if (now - lastGpsAt > 5000) {
            resetGpsData();
        }
    });
    strokeDetector.start();

    var back = function () {
        if (context.preferences().isRestoreLayout()) {
            saveLayout(top.getType(), middle.getType(), bottom.getType(), large.getType());
        } else {
            resetLayout();
        }

        document.removeEventListener('touchmove', preventDrag, false);

        App.load('session-summary', { session: session, isPastSession: false }, undefined, function () {
            App.removeFromStack();
        });
    };

    var tx = false;
    var clear = function () {
        tx = true;
        document.PREVENT_SYNC = false;

        clearInterval(self.intervalId);
        clearInterval(self.speedIntervalId);
        timer.stop();
        gps.stop();
        strokeDetector.stop();

        // clean buffer
        if (self.isDebugEnabled)
            self.flushDebugBuffer();

        session.finish().then(function () {
            Dialog.hideModal();
            back();
        });
    };

    var confirmBeforeExit = function () {
        if (tx) {
            tx = false;
            return true;
        }

        timer.pause();

        paused = true;

        self.confirm(function resume() {
            paused = false;
            timer.resume();
            Dialog.hideModal();
        }, function finish() {
            clear();
        });
    };

    $page.on('appBeforeBack', function (e) {
        return confirmBeforeExit() === true;
    });


    var $pause, tapStarted = false, pauseCanceled = false, pauseTimeout, lastEvent, pauseAnimationStarted;
    $page.on('tapstart', function (e) {
        if (!e.originalEvent.touches) return;

        lastEvent = e;
        tapStarted = true;
        pauseCanceled = false;
        pauseAnimationStarted = false;
        pauseTimeout = setTimeout(function (event) {
            return function () {
                if (pauseCanceled === true || event !== lastEvent) {
                    pauseCanceled = false;
                    tapStarted = false;
                    pauseAnimationStarted = false;
                    return;
                }

                var width = $page.width() * .4;

                if (!$pause) $pause = $('#session-stop');

                var svgPath = document.getElementById('pause-svg');
                var path = new ProgressBar.Path(svgPath, {
                    duration: 1000,
                    easing: 'easeIn'
                });

                $pause.css({top: e.originalEvent.touches[0].clientY - (width / 2), left: e.originalEvent.touches[0].clientX - (width / 2)});
                $pause.show();

                $('body').css({overflow: 'hidden'});
                pauseAnimationStarted = true;
                path.animate(1, function () {
                    Dialog.hideModal();
                    if (pauseCanceled === true || event !== lastEvent) {
                        return;
                    }

                    setTimeout(function () {
                        $pause.hide();
                        confirmBeforeExit();
                    }, 20);
                });

                // try to prevent touch move on android, by placing a fixed backdrop on top of the animation
                Dialog.showModal($('<div/>'), {color: ' rgba(0,0,0,0.1)'});
            }
        }(lastEvent), 450);
    });

    $page.on('tapend', function () {
        if ($pause !== undefined)
            $pause.hide();

        if (tapStarted)
            pauseCanceled = true;

        clearTimeout(pauseTimeout);
    });

    $page.on('measureSwapStarted', function () {
        // if already showing pause animation, let it do it
        if (pauseAnimationStarted)
            return;

        // not showing pause, but tap started? Discard... user is changing measures
        if (tapStarted)
            pauseCanceled = true;

        clearTimeout(pauseTimeout);
    });
}

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

        if (self.sensorDataFileError == true) {
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
    var session = new Session(new Date().getTime() // TODO: handle timezone!!!
        , calibration.getAngleZ()
        , calibration.getNoiseX()
        , calibration.getNoiseZ()
        , calibration.getFactorX()
        , calibration.getFactorZ()
        , calibration.getPredominant()
    );

    return session.create();
};

SessionView.prototype.confirm = function (onresume, onfinish) {
    var self = this;
    var $controls = $('<div class="session-controls"/>');
    var $resume = $('<div class="session-resume">' +
        '<div class="session-controls-outer-text">' +
        '<div class="session-controls-inner-text vw_font-size3">resume</div>' +
        '</div></div></div>');
    var $finish = $('<div class="session-finish"><div class="session-controls-outer-text">' +
        '<div class="session-controls-inner-text vw_font-size3">finish</div>' +
        '</div></div></div>');

    $controls.append($finish).append($resume);
    Dialog.showModal($controls, {});

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
    $resume.on('touchend', function () {
        onresume.apply(self, []);
    });

    $finish.on('touchend', function () {
        onfinish.apply(self, []);
    });
}


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

exports.SessionView = SessionView;
