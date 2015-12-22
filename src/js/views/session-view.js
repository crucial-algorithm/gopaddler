'use strict';

var IO = require('../utils/io.js').IO;
var GPS = require('../utils/gps').GPS;
var Calibration = require('../model/calibration').Calibration;
var Session = require('../model/session').Session;
var SessionDetail = require('../model/session-detail').SessionDetail;
var db = require('../db').Session;

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

    document.PREVENT_SYNC = true;

    var sensorData = [];
    self.sensorDataFileError = false;

    IO.open(session.getDebugFile()).then(function (file) {
        self.sensorDataFile = file;
    }).fail(function () {
            self.sensorDataFileError = true;
        });

    var strokeDetector = new StrokeDetector(session, calibration, null, function onAccelerationTriggered(acceleration, value) {
        if (self.sensorDataFileError == true) {
            // unbind listener
            strokeDetector.onAccelerationTriggered(function(){});
            sensorData = [];
            return;
        }

        if (sensorData.length >= 100) {
            IO.write(self.sensorDataFile, sensorData.join('\n') + '\n');
            sensorData = [];
            return;
        }

        sensorData.push([acceleration.timestamp, acceleration.x, acceleration.y, acceleration.z, value].join(';'));
    });

    var $page = $(page);
    $page.off('appDestroy').on('appDestroy', function () {
        if (!timer) return;

        clearInterval(self.intervalId);

        timer.stop();
        gps.stop();
        strokeDetector.stop();

        // clean buffer
        IO.write(self.sensorDataFile, sensorData.join('\n'));

    });


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
        App.back('home');
    };

    $page.swipe({
        swipe: back
    });

    var tx = false;
    $page.on('appBeforeBack', function (e) {
        if (tx) {
            tx = false;
            return true;
        }
        confirm("Finish Session?", function (r) {
            if (r == 1) {
                tx = true;
                document.PREVENT_SYNC = false;
                session.finish();
                App.back('home');
            }
        });
        return false;
    });
};


SessionView.prototype.createSession = function (calibration) {
    var session = new Session(new Date().getTime() // TODO: handle timezone!!!
        , calibration.getAngleZ()
        , calibration.getNoiseX()
        , calibration.getNoiseZ()
        , calibration.getFactorX()
        , calibration.getFactorZ()
        , calibration.getPredominant() === 'X' ? 0 : 1
    );

    return session.create();
};


exports.SessionView = SessionView;