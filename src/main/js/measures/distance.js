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
 * @returns {number}  in Km's
 */
Distance.prototype.calculate = function (position) {

    if (!this.previous) {
        this.previous = position;
        return this.distance;
    }

    // if (GPS.isLessThanMinMovement(this.previous, position)) {
    //     return this.distance;
    // }

    this.distance += GPS.calcDistance(this.previous, position);

    this.previous = position;
    return this.distance;
};

/**
 *
 * @param position
 * @param now
 * @param duration
 * @returns {number}  distance in km
 */
Distance.prototype.calculateAndMoveTo = function(position, now, duration) {

    if (!this.previous) {
        this.previous = position;
        return this.distance;
    }

    if (this.previous.timestamp === position.timestamp) {
        return this.distance;
    }

    var movement = GPS.evaluateMovement(this.previous, position, now);
    if (movement === null) {
        this.previous = position;
        return this.distance;
    }
    this.distance += movement.distance;

    this.positions.push({duration: duration, distance: this.distance, speed: movement.speed});
    if (this.positions.length > 30) {
        this.positions.shift();
    }

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

    return reference.distance + GPS.calculateMovement(duration - reference.duration, reference.speed);
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
    var distInOneMili = reference.speed / 3600000;

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
