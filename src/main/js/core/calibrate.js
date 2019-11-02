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

    static setPredefinedPosition(isPortraitMode) {
        const LANDSCAPE = {
            "predominant": 0,
            "angleZ": 1.5669203045085698,
            "noiseX": -0.5077782408396403,
            "noiseY": 0.1528099237382412,
            "noiseZ": 9.80992630958557,
            "factorX": 0.0038760222863268,
            "factorY": 0,
            "factorZ": 0.0038760125810658,
            "alpha": 24.70277764108222,
            "beta": 0.8901227280018521,
            "gamma": 2.962443835853038
        }, PORTRAIT = {
            "predominant": 1,
            "angleZ": 1.5406171550650363,
            "noiseX": -0.491182447274526,
            "noiseY": 0.0909796645243963,
            "noiseZ": 9.80553295135498,
            "factorX": 0,
            "factorY": 0.0301791717298603,
            "factorZ": 0.0301745908287008,
            "alpha": 29.006709645901157,
            "beta": 0.5296730485699206,
            "gamma": 2.869757183000827
        };

        let data = null;
        if (isPortraitMode) {
            data = PORTRAIT;
        } else {
            data = LANDSCAPE;
        }

        new Calibration(data.predominant, data.angleZ
            , data.noiseX, data.noiseY, data.noiseZ
            , data.factorX, data.factorY, data.factorZ
            , data.alpha, data.beta, data.gamma
        ).save(isPortraitMode);
    }
}

export default Calibrate;
