'use strict';
var GPS = require('../utils/gps').GPS;


function Distance() {
    this.counter = 0;
    this.distance = 0;
    this.previous = undefined;

}
/**
 * returns distance in km's
 * @param position
 * @returns {*|number}
 */
Distance.prototype.calculate = function (position) {

    if (this.previous === undefined) {
        this.previous = position;
        return this.distance;
    }

    if (GPS.isLessThanMinMovement(this.previous, position)) {
        return this.distance;
    }

    this.distance += GPS.calcDistance(this.previous, position);

    this.previous = position;
    return this.distance;
};

Distance.prototype.getValue = function () {
    return this.distance;
};

Distance.prototype.getLatitude = function () {
    return (this.previous || {coords: {}}).coords.latitude;
};

Distance.prototype.getLongitude = function () {
    return (this.previous || {coords: {}}).coords.longitude;
};

exports.Distance = Distance;
