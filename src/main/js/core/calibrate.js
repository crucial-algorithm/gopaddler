'use strict';

import MotionSensor from '../device/motion';
import Calibration from '../model/calibration';
import Utils from '../utils/utils';

class Calibrate {

    constructor(isPortraitMode, callback) {
        this.callback = callback;
        this.watchId = undefined;
        this.isPortraitMode = isPortraitMode;
        this.motionSensor = new MotionSensor(null);


        this.GRAVITY_EARTH = 9.80665;
        this.MEASURES = 300;
    }

    start() {
        var self = this;

        var i = 1, x = 0, y = 0, z = 0;

        function onSuccess(acceleration) {
            document.PREVENT_SYNC = true;

            if (i === self.MEASURES) {
                self.stop();
                document.PREVENT_SYNC = false;
                self.calculate.apply(self, [x, y, z]);
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
                self.motionSensor.start(Date.now());
            } catch (e) {
                console.log('hmmm... browser?');
            }
        }, 2500);
    }

    calculate(sumx, sumy, sumz) {
        var self = this;
        if (self.isPortraitMode) {
            self.calculatePortraitMode(sumx, sumy, sumz);
        } else {
            self.calculateLandscapeMode(sumx, sumy, sumz);
        }
    }

    calculateLandscapeMode(sumx, sumy, sumz) {
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

        if (angleZ < Utils.toRadians(45)) {
            predominantAxis = 2;
        } else {
            predominantAxis = 0;
        }

        var factorX = Utils.toRadians(90) - angleZ;
        factorX = factorX ? factorX : 1;

        var factorZ = Math.cos(angleZ);
        factorZ = factorZ ? factorZ : 1;

        self.store(predominantAxis, angleZ, avgX, avgY, avgZ, factorX, null, factorZ);
    }

    calculatePortraitMode(sumx, sumy, sumz) {
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

        if (angleZ < Utils.toRadians(45)) {
            predominantAxis = 2;
        } else {
            predominantAxis = 1;
        }

        var factorY = Utils.toRadians(90) - angleZ;
        factorY = factorY ? factorY : 1;

        var factorZ = Math.cos(angleZ);
        factorZ = factorZ ? factorZ : 1;

        self.store(predominantAxis, angleZ, avgX, avgY, avgZ, null, factorY, factorZ);

    }

    stop() {
        var self = this;
        navigator.accelerometer.clearWatch(self.watchId);
        self.motionSensor.stop();
    }

    store(predominant, angleZ, noiseX, noiseY, noiseZ, factorX, factorY, factorZ) {
        let round = function (value) {
            return Math.round(value * 10000000000000000) / 10000000000000000
        };

        let calibration = this.motionSensor.getCalibration();
        new Calibration(predominant, round(angleZ), round(noiseX)
            , round(noiseY), round(noiseZ), round(factorX), round(factorY), round(factorZ)
            , calibration.alpha, calibration.beta, calibration.gamma
        ).save(this.isPortraitMode);
    }
}

export default Calibrate;
