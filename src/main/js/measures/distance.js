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

    var movement = GPS.evaluateMovement(this.previous, position, now);
    if (movement === null) {
        return this.distance;
    }

    if (this.context.isDev()) {
        movement.speed = 36;
        this.distance = (duration / 1000 * 10) / 1000;
    } else {
        this.distance += movement.distance;
    }

    this.positions.push({duration: duration, distance: this.distance, speed: movement.speed});
    if (this.positions.length > 30) {
        this.positions.shift();
    }

    return this.distance;
};

Distance.prototype.calculateDistanceAt = function (duration) {
    if (this.previous === undefined) {
        return this.distance;
    }

    var before = null, after = null, position;
    for (var i = this.positions.length - 1; i >= 0; i--) {
        position = this.positions[i];
        if (after === null || position.duration > duration) {
            after = position;
            continue;
        }

        if (before === null || before.duration <= duration) {
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

    console.log(reference, reference.distance + GPS.calculateMovement(duration - reference.duration, reference.speed));

    return reference.distance + GPS.calculateMovement(duration - reference.duration, reference.speed);
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
