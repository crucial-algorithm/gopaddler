'use strict';

var Calibration = require('../model/calibration.js').Calibration;
var utils = require('../utils/utils');

function Calibrate (isPortraitMode, callback) {
    this.callback = callback;
    this.watchId = undefined;
    this.isPortraitMode = isPortraitMode;


    this.GRAVITY_EARTH = 9.80665;
    this.MEASURES = 300;
}

Calibrate.prototype.start = function() {
    var self = this;

    var i = 1, x = 0, y = 0, z = 0;

    function onSuccess(acceleration) {
        document.PREVENT_SYNC = true;

        if (i === self.MEASURES) {
            self.stop();
            document.PREVENT_SYNC = false;
            self.calculate(x, y, z);
            self.callback.call();
        }

        var magnitude = Math.sqrt(Math.pow(acceleration.x, 2)
            + Math.pow(acceleration.y, 2)
            + Math.pow(acceleration.z, 2)) / self.GRAVITY_EARTH;

        // TODO - check for to much noise

        x += acceleration.x;
        y += acceleration.y;
        z += acceleration.z;
        i++;

    }

    function onError() {
        console.log('onError!');
    }

    setTimeout(function () {
        var options = { frequency: 40 };
        try {
            self.watchId = navigator.accelerometer.watchAcceleration(onSuccess, onError, options);
        } catch (e) {
            console.log('hmmm... browser?');
        }
    }, 2500);
};

Calibrate.prototype.calculate = function (sumx, sumy, sumz) {
    var self = this;
    if (self.isPortraitMode) {
        self.calculatePortraitMode(sumx, sumy, sumz);
    } else {
        self.calculateLandscapeMode(sumx, sumy, sumz);
    }
};

Calibrate.prototype.calculateLandscapeMode = function (sumx, sumy, sumz) {
    var self = this;
    var avgX = sumx / self.MEASURES;
    var avgY = sumy / self.MEASURES;
    var avgZ = sumz / self.MEASURES;
    var angleZ;
    var predominantAxis;

    if (avgZ < 9.81) {
        angleZ = Math.asin(avgZ / 9.81);
    } else {
        angleZ = Math.asin(1);
    }

    if (angleZ < utils.toRadians(45)) {
        predominantAxis = 2;
    } else {
        predominantAxis = 0;
    }

    var factorX = utils.toRadians(90) - angleZ;
    factorX = factorX ? factorX : 1;

    var factorZ = Math.cos(angleZ);
    factorZ = factorZ ? factorZ : 1;

    self.store(predominantAxis, angleZ, avgX, avgY, avgZ, factorX, null, factorZ);
};

Calibrate.prototype.calculatePortraitMode = function (sumx, sumy, sumz) {
    var self = this;
    var avgX = sumx / self.MEASURES;
    var avgY = sumy / self.MEASURES;
    var avgZ = sumz / self.MEASURES;
    var angleZ;
    var predominantAxis;

    if (avgZ < 9.81) {
        angleZ = Math.asin(avgZ / 9.81);
    } else {
        angleZ = Math.asin(1);
    }

    if (angleZ < utils.toRadians(45)) {
        predominantAxis = 2;
    } else {
        predominantAxis = 1;
    }

    var factorY = utils.toRadians(90) - angleZ;
    factorY = factorY ? factorY : 1;

    var factorZ = Math.cos(angleZ);
    factorZ = factorZ ? factorZ : 1;

    self.store(predominantAxis, angleZ, avgX, avgY, avgZ, null, factorY, factorZ);

};

Calibrate.prototype.stop = function () {
    var self = this;
    navigator.accelerometer.clearWatch(self.watchId);
};

Calibrate.prototype.store = function (predominant, angleZ, noiseX, noiseY, noiseZ, factorX, factorY, factorZ) {
    var round = function (value) {
        return Math.round(value * 10000000000000000) / 10000000000000000
    };

    new Calibration(predominant, round(angleZ), round(noiseX)
        , round(noiseY), round(noiseZ), round(factorX), round(factorY), round(factorZ)).save(this.isPortraitMode);
};


exports.Calibrate = Calibrate;
