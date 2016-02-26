'use strict';

var IO = require('../utils/io.js').IO;
var GPS = require('../utils/gps').GPS;
var Dialog = require('../utils/dialog');
var Calibration = require('../model/calibration').Calibration;
var Session = require('../model/session').Session;
var SessionDetail = require('../model/session-detail').SessionDetail;
var db = require('../db').Session;
var Api = require('../server/api');
var StrokeDetector = require('../core/stroke-detector').StrokeDetector;
var Timer = require('../measures/timer').Timer;
var Distance = require('../measures/distance').Distance;
var Speed = require('../measures/speed').Speed;
var StrokeRate = require('../measures/spm').StrokeRate;

function SessionView(page) {
    var self = this;
    var calibration =  Calibration.load();
    var session = self.createSession(calibration);
    var gps = new GPS();

    self.isDebugEnabled = !!Api.User.getProfile().debug;

    document.PREVENT_SYNC = true;

    var strokeDetector = new StrokeDetector(session, calibration, null, self.debug(session));

    var $page = $(page);

    var timer = new Timer($('.yellow', page));
    timer.start();

    var speed = new Speed($('.blue', page), gps);
    speed.start();

    var distance = new Distance($('.red', page), gps);
    distance.start();


    var strokeRate = new StrokeRate($('.session-left', page), strokeDetector);
    strokeRate.onUpdate(function onSpmUpdate(spm) {

        new SessionDetail(session.getId(), new Date().getTime(), distance.getValue(), speed.getValue(), spm
            , 0 // TODO: implement efficiency
        ).save();

    });
    strokeRate.start();

    var back = function () {
        App.back();
    };

    $page.swipe({
        swipe: back
    });


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
        speed.pause();
        distance.pause();
        strokeRate.pause();

        self.confirm(function resume() {
            timer.resume();
            speed.resume();
            distance.resume();
            strokeRate.resume();
            Dialog.hideModal();
        }, function finish() {
            clear();
        });
    };

    $page.on('appBeforeBack', function (e) {
        confirmBeforeExit();
    });


    var $stop, tapend = false;
    $page.on('tapstart', function (e) {
        if (!e.originalEvent.touches) return;

        var width = $page.width() * .4;

        if(!$stop) $stop = $('#session-stop');

        var svgPath = document.getElementById('pause-svg');
        var path = new ProgressBar.Path(svgPath, {
            duration: 1000,
            easing: 'easeIn'
        });

        $stop.css({top: e.originalEvent.touches[0].clientY - (width / 2), left: e.originalEvent.touches[0].clientX - (width / 2)});
        $stop.show();


        tapend = false;
        path.animate(1, function () {
            if (tapend === true) return;

            tapend = false;
            setTimeout(function () {
                $page.trigger('tapend');
                confirmBeforeExit();
            }, 20);
        });

    });

    $page.on('tapend', function () {
        $stop.hide();
        tapend = true;
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


exports.SessionView = SessionView;