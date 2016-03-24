'use strict';

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

Calibration.prototype.save = function () {
    window.localStorage.setItem("calibration", JSON.stringify({
        predominant: this.predominant,
        angleZ: this.angleZ,
        noiseX: this.noiseX,
        noiseY: this.noiseY,
        noiseZ: this.noiseZ,
        factorX: this.factorX,
        factorZ: this.factorZ
    }));
};


Calibration.load = function () {
    var obj = JSON.parse(window.localStorage.getItem("calibration"));
    if (!obj) {
        return undefined;
    }
    return new Calibration(obj.predominant, obj.angleZ, obj.noiseX, obj.noiseY, obj.noiseZ, obj.factorX, obj.factorZ);
}

Calibration.blank = function () {
    return new Calibration(0, 0, 0, 0, 0, 0, 0);
}

exports.Calibration = Calibration;
