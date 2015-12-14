function Calibrate (callback) {
    this.callback = callback;
    this.watchId = undefined;

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

    var options = { frequency: 40 };
    try {
        this.watchId = navigator.accelerometer.watchAcceleration(onSuccess, onError, options);
    } catch (e) {
        console.log('hmmm... browser?');
    }
};

Calibrate.prototype.calculate = function (sumx, sumy, sumz) {
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

    if (angleZ < Math.toRadians(45)) {
        predominantAxis = 'Z';
    } else {
        predominantAxis = 'X';
    }

    var factorX = Math.toRadians(90) - angleZ;
    factorX = factorX ? factorX : 1;

    var factorZ = Math.cos(angleZ);
    factorZ = factorZ ? factorZ : 1;

    self.store(predominantAxis, angleZ, avgX, avgY, avgZ, factorX, factorZ);
}

Calibrate.prototype.stop = function () {
    var self = this;
    navigator.accelerometer.clearWatch(self.watchId);
}

Calibrate.prototype.store = function (predominant, angleZ, noiseX, noiseY, noiseZ, factorX, factorZ) {
    var round = function(value) {
        return Math.round(value * 10000000000000000) / 10000000000000000
    };
    window.localStorage.setItem("calibration", JSON.stringify({
        predominant: predominant,
        angleZ: round(angleZ),
        noiseX: round(noiseX),
        noiseY: round(noiseY),
        noiseZ: round(noiseZ),
        factorX: round(factorX),
        factorZ: round(factorZ)
    }));
}

Calibrate.load = function () {
    var obj = JSON.parse(window.localStorage.getItem("calibration"));
    if (!obj) {
        return undefined;
    }
    return new Calibration(obj.predominant, obj.angleZ, obj.noiseX, obj.noiseY, obj.noiseZ, obj.factorX, obj.factorZ);
}

function Calibration(predominant, angleZ, noiseX, noiseY, noiseZ, factorX, factorZ) {
    var self = this;
    self.predominant = predominant;
    self.angleZ = angleZ;
    self.noiseX = noiseX;
    self.noiseY = noiseY;
    self.noiseZ = noiseZ;
    self.factorX = factorX;
    self.factorZ = factorZ;
}

Calibration.prototype.getPredominant = function () {
    return this.predominant;
}

Calibration.prototype.setPredominant = function (predominant) {
    this.predominant = predominant;
}

Calibration.prototype.getAngleZ = function () {
    return this.angleZ;
}

Calibration.prototype.setAngleZ = function (angleZ) {
    this.angleZ = angleZ;
}

Calibration.prototype.getNoiseX = function () {
    return this.noiseX;
}

Calibration.prototype.setNoiseX = function (noiseX) {
    this.noiseX = noiseX;
}

Calibration.prototype.getNoiseY = function () {
    return this.noiseY;
}

Calibration.prototype.setNoiseY = function (noiseY) {
    this.noiseY = noiseY;
}

Calibration.prototype.getNoiseZ = function () {
    return this.noiseZ;
}

Calibration.prototype.setNoiseZ = function (noiseZ) {
    this.noiseZ = noiseZ;
}

Calibration.prototype.setActive = function (active) {
    this.active = active;
}

Calibration.prototype.getFactorX = function () {
    return this.factorX;
}

Calibration.prototype.setFactorX = function (factorX) {
    this.factorX = factorX;
}

Calibration.prototype.getFactorZ = function () {
    return this.factorZ;
}

Calibration.prototype.setFactorX = function (factorZ) {
    this.factorZ = factorZ;
}