'use strict';
var GPS = require('../utils/gps').GPS;
var utils = require('../utils/utils');


function Distance() {
    this.counter = 0;
    this.distance = 0;
    this.previous = undefined;

}

Distance.prototype.calculate = function (position) {

    if (this.counter < 5) {
        this.counter++;
        return 0;
    }

    if (this.previous !== undefined) {
        this.takenAt = new Date().getTime();
        this.distance += GPS.calcDistance(this.previous, position);
    }

    this.previous = position;
    return utils.round2(this.distance);
};

Distance.prototype.getTakenAt = function () {
    return this.takenAt;
}

Distance.prototype.getValue = function () {
    return this.distance;
};

exports.Distance = Distance;