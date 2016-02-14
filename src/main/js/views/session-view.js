'use strict';

var IO = require('../utils/io.js').IO;
var GPS = require('../utils/gps').GPS;
var Dialog = require('../utils/dialog');
var Calibration = require('../model/calibration').Calibration;
var Session = require('../model/session').Session;
var SessionDetail = require('../model/session-detail').SessionDetail;
var db = require('../db').Session;

var StrokeDetector = require('../core/stroke-detector').StrokeDetector;
var Timer = require('../measures/timer').Timer;
var Distance = require('../measures/distance').Distance;
var Speed = require('../measures/speed').Speed;

var StrokeEfficiency = require('../measures/efficiency').StrokeEfficiency;

var Field = require('../measures/field.js').Field;

var DEFAULT_POSITIONS = {
    top: 'timer',
    middle: 'speed',
    bottom: 'distance',
    large: 'spm'
};

function SessionView(page, settings) {
    var self = this;
    var $page = $(page);
    var calibration =  Calibration.load();
    var session = self.createSession(calibration);
    var gps = new GPS();
    var distance = new Distance();
    var speed = new Speed();
    var strokeEfficiency = new StrokeEfficiency();
    var strokeDetector = new StrokeDetector(session, calibration, null, self.debug(session));
    var paused = false;

    self.isDebugEnabled = Paddler.Session.getUser().getProfile().isDebug();

    document.PREVENT_SYNC = true;

    var fields;
    if (settings.isRestoreLayout()) {
        fields = loadLayout();
    } else {
        fields = DEFAULT_POSITIONS;
    }

    var top = new Field($('.session-small-measure.yellow', page), fields.top);
    var middle = new Field($('.session-small-measure.blue', page), fields.middle);
    var bottom = new Field($('.session-small-measure.red', page), fields.bottom);
    var large = new Field($('.session-left', page), fields.large, 'large');



    // -- Handle GPS sensor data
    var values = {speed: 0, distance: 0};
    gps.listen(function (position) {

        values.speed = speed.calculate(position);
        values.distance = distance.calculate(position);

        top.setValues(values);
        middle.setValues(values);
        bottom.setValues(values);
        large.setValues(values);

    });



    // -- initiate timer
    var timer = new Timer();
    timer.start(function (value) {
        top.setValue("timer", value);
        middle.setValue("timer", value);
        bottom.setValue("timer", value);
        large.setValue("timer", value);
    });


    // -- handle stroke related data
    strokeDetector.onStrokeRateChanged(function (spm, interval) {
        var values = {spm: spm, efficiency: 0};

        values.efficiency = strokeEfficiency.calculate(distance.getValue(), distance.getTakenAt(), interval);

        // update fields using spm and efficiency
        top.setValues(values);
        middle.setValues(values);
        bottom.setValues(values);
        large.setValues(values);

        // store data
        new SessionDetail(session.getId(), new Date().getTime(), distance.getValue(), speed.getValue(), spm
            , values.efficiency
        ).save();
    });
    strokeDetector.start();

    var back = function () {

        if (settings.isRestoreLayout()) {
            saveLayout(top.getType(), middle.getType(), bottom.getType(), large.getType());
        } else {
            resetLayout();
        }

        App.back();
    };

    var tx = false;
    var clear = function () {
        tx = true;
        document.PREVENT_SYNC = false;
        session.finish();
        Dialog.hideModal();

        clearInterval(self.intervalId);
        timer.stop();
        gps.stop();
        strokeDetector.stop();

        // clean buffer
        if (self.isDebugEnabled)
            self.flushDebugBuffer();

        back();
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


    var $stop, tapStarted = false, pauseCanceled = false, pauseTimeout, lastEvent;
    $page.on('tapstart', function (e) {
        if (!e.originalEvent.touches) return;

        lastEvent = e;
        tapStarted = true;
        pauseCanceled = false;
        pauseTimeout = setTimeout(function (event) {
            return function () {
                if (pauseCanceled === true || event !== lastEvent) {
                    pauseCanceled = false;
                    tapStarted = false;
                    return;
                }

                var width = $page.width() * .4;

                if (!$stop) $stop = $('#session-stop');

                var svgPath = document.getElementById('pause-svg');
                var path = new ProgressBar.Path(svgPath, {
                    duration: 1000,
                    easing: 'easeIn'
                });

                $stop.css({top: e.originalEvent.touches[0].clientY - (width / 2), left: e.originalEvent.touches[0].clientX - (width / 2)});
                $stop.show();

                path.animate(1, function () {
                    if (pauseCanceled === true || event !== lastEvent) return;

                    setTimeout(function () {
                        $stop.hide();
                        confirmBeforeExit();
                    }, 20);
                });
            }
        }(lastEvent), 450);
    });

    $page.on('tapend', function () {
        if ($stop !== undefined)
            $stop.hide();

        if (tapStarted)
            pauseCanceled = true;

        clearTimeout(pauseTimeout);
    });

    $page.on('measureSwapStarted', function () {
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
    Dialog.showModal($controls);

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