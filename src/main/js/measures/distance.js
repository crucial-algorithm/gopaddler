'use strict';
var GPS = require('../utils/gps').GPS;


function Distance() {
    this.counter = 0;
    this.distance = 0;
    this.previous = undefined;

}

Distance.prototype.calculate = function (position) {

    if (this.previous !== undefined) {
        this.takenAt = new Date().getTime();
        this.distance += GPS.calcDistance(this.previous, position);
    }

    this.previous = position;
    return this.distance;
};

Distance.prototype.getTakenAt = function () {
    return this.takenAt;
}

Distance.prototype.getValue = function () {
    return this.distance;
};

Distance.prototype.getLatitude = function () {
    return (this.previous || {}).latitude;
}

Distance.prototype.getLongitude = function () {
    return (this.previous || {}).longitude;
}

exports.Distance = Distance;