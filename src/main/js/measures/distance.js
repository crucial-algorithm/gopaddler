'use strict';
var GPS = require('../utils/gps').GPS;


function Distance(context) {
    this.counter = 0;
    this.distance = 0;
    this.previous = undefined;
    this.positions = [];
    this.context = context;
}

/**
 * returns distance in km's
 * @param position
 * @param duration
 * @returns {number}  in Km's
 */
Distance.prototype.calculate = function (position, duration) {

    if (!this.previous) {
        this.previous = position;
        return this.distance;
    }

    if (this.previous.sessionDuration === position.sessionDuration) {
        return this.distance;
    }

    this.distance += GPS.calcDistance(this.previous, position);
    this.positions.push({duration: duration, distance: this.distance, speed: position.coords.speed});

    this.previous = position;
    return this.distance;
};

/**
 *
 * @param {number}      duration    In miliseconds
 * @returns {number}    Distance in km
 */
Distance.prototype.timeToDistance = function (duration) {
    if (this.previous === undefined) {
        return this.distance;
    }

    if (this.positions.length === 0) {
        return this.distance;
    }

    var before = null, after = null, position;
    for (var i = this.positions.length - 1; i >= 0; i--) {
        position = this.positions[i];
        if (position.duration > duration) {
            after = position;
            continue;
        }

        if (position.duration <= duration) {
            before = position;
            break;
        }
    }

    var reference = null;
    if (after === null || Math.abs(before.duration - duration) < Math.abs(after.duration - duration)) {
        reference = before;
    } else {
        reference = after;
    }

    return reference.distance + ((duration - reference.duration) * (reference.speed / 1000)) / 1000;
};

/**
 *
 * @param {number}      distance    in km
 * @returns {number}    Duration, in miliseconds
 */
Distance.prototype.distanceToTime = function (distance) {
    if (this.previous === undefined) {
        return null;
    }

    var before = null, after = null, position;
    for (var i = this.positions.length - 1; i >= 0; i--) {
        position = this.positions[i];
        if (position.distance > distance) {
            after = position;
            continue;
        }

        if (position.distance <= distance) {
            before = position;
            break;
        }
    }

    var reference = null, direction;
    if (after === null || Math.abs(before.distance - distance) < Math.abs(after.distance - distance)) {
        reference = before;
        direction = 1;
    } else {
        reference = after;
        direction = -1;
    }

    var gap = Math.abs(reference.distance - distance);
    var distInOneMili = reference.speed / 1000; // speed is in meters per second

    return Math.round(reference.duration + (gap / distInOneMili * direction))
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
