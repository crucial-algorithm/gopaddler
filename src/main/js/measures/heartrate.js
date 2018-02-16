'use strict';

function HeartRate () {
    this.value = 0;
}

HeartRate.prototype.calculate = function (heartRateMeasure) {
    // @TODO: implement some smoothing logic
    this.value = heartRateMeasure;

    return this.value;
};

HeartRate.prototype.reset = function () {
    this.value = 0;
};

HeartRate.prototype.getValue = function () {
    return this.value;
};

exports.HeartRate = HeartRate;
