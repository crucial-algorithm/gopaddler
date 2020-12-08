'use strict';

import GPS from '../utils/gps';

class Distance {

    constructor(context) {
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
    calculate(position, duration) {

        if (!this.previous) {
            this.previous = position;
            return this.distance;
        }

        if (this.previous.sessionDuration === position.sessionDuration) {
            return this.distance;
        }

        this.distance += GPS.calcDistance(this.previous, position);
        this.positions.push({duration: duration, distance: this.distance, speed: position.coords.speed});

        if (this.positions.length > 50) {
            this.positions.shift();
        }

        this.previous = position;
        return this.distance;
    }

    /**
     *
     * @param {number}      duration    In miliseconds
     * @returns {number}    Distance in km
     */
    timeToDistance(duration) {
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
    }

    /**
     *
     * @param {number}      distance    in km
     * @returns {number}    Duration, in miliseconds
     */
    distanceToTime(distance) {
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

        // speed is in meters per second
        var distInOneMili = reference.speed / 1000;
        // multiply by 1000 to convert km in meters (to match speed unit)
        var gap = Math.abs(reference.distance - distance) * 1000;

        return Math.round(reference.duration + (gap / distInOneMili * direction))
    }

    getValue() {
        return this.distance;
    }

    getLatitude() {
        return (this.previous || {coords: {}}).coords.latitude;
    }

    getLongitude() {
        return (this.previous || {coords: {}}).coords.longitude;
    }

    pause() {
        this.previous = null;
    }

}

export default Distance;
