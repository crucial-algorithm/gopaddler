'use strict';

var HeartRateDevice = require('../device/heartrate').HeartRate;

function HeartRate () {
    this.value = 0;
}

HeartRate.prototype.calculate = function () {
    return this.value;
};

HeartRate.prototype.reset = function () {
    this.value = 0;
};

exports.HeartRate = HeartRate;
