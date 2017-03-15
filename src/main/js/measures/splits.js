'use strict';

var utils = require('../utils/utils');

function Splits(splits, listener) {
    this.splits = splits || [];

    this.running = false;
    this.delayed = false;
    this.listener = listener || function(){};
    this.position = -1;
}

Splits.prototype.start = function (duration, delay, onStart) {

    if (typeof delay === "number") {
        this.splits.unshift({_duration: delay, _unit: 'seconds'});
        this.delayed = true;
        this.onStart = onStart;
        this.started = false;
    }

    if (this.splits.length > 0)
        this.running = true;

};

Splits.prototype.stop = function() {
    this.running = false;
    this.position = -1;
};

/**
 *
 * @param timestamp     Current timestamp on Timer
 * @param duration      Duration since session was started on Timer
 */
Splits.prototype.setTime = function (timestamp, duration) {
    this.duration = Math.round(duration/1000);

    if (!this.running)
        return;

    if (this.split === undefined)
        this.nextSplit();

    if (this.split.type() === UNITS_TYPE.DISTANCE_BASED)
        return;

    if (this.splitStop - this.duration < 0) {

        // check if this is the first split after delay
        if (this.started !== true && this.delayed) {
            this.onStart.apply({}, [timestamp]);
            this.started = true;
        }

        this.nextSplit();

        if (!this.split)
            return;

        // if next measure is distance based, show value formatted accordingly
        if (this.split.type() === UNITS_TYPE.DISTANCE_BASED) {
            this.listener(this.split.getDistanceInKm(), this.split.isRecovery());
            return;
        }
    }

    this.listener(this.format((this.split.getDurationInSeconds() - 1 - (this.duration - this.splitStart))), this.split.isRecovery());
};

Splits.prototype.setDistance = function (distance) {
    this.distance = utils.round2(distance);

    if (!this.running) return;

    if (typeof distance !== 'number') return;

    if (this.split === undefined)
        this.nextSplit();

    if (this.split.type() === UNITS_TYPE.TIME_BASED) return;

    if (this.splitStop - this.distance <= 0) {

        this.nextSplit();

        if (!this.split)
            return;

        // if next measure is timed based, show value formatted accordingly
        if (this.split.type() === UNITS_TYPE.TIME_BASED) {
            this.listener(this.format(this.split.getDurationInSeconds()), this.split.isRecovery());
            return;
        }
    }

    this.listener(utils.round2(this.split.getDistanceInKm() - (distance - this.splitStart)), this.split.isRecovery());
};

Splits.prototype.nextSplit = function () {

    var s = this.splits.shift();
    if (s === undefined) {
        this.split = undefined;
        this.stop();
        this.listener('-');
        return;
    }

    if (!this.delayed || (this.delayed && this.started))
        this.position++;

    this.split = new Interval(s._duration, s._unit, s._recovery);

    if (this.split.type() === UNITS_TYPE.DISTANCE_BASED) {
        this.splitStart = this.distance || 0;
        this.splitStop = this.splitStart + this.split.getDistanceInKm();
    } else {
        this.splitStart = this.duration;
        this.splitStop = this.splitStart + this.split.getDurationInSeconds() - 1;
    }

};


Splits.prototype.zeroPad = function (value) {
    if (value < 10) {
        value = "0" + value;
    }
    return value;
};

Splits.prototype.format = function (time) {
    var hour, minute, second, elapsed;

    elapsed = Math.round(time);
    minute = Math.floor(elapsed / 60);
    second = elapsed - minute * 60;

    hour = 0;
    if (minute > 0) {
        hour = Math.floor(minute / 60);
        minute = minute - hour * 60;
    }
    return this.zeroPad(hour) + ':' + this.zeroPad(minute) + ':' + this.zeroPad(second);
};

Splits.prototype.getPosition = function () {
    return this.position;
};

// synced with webapp
var UNITS = {
    minutes: 'minutes',
    seconds: 'seconds',
    meters: 'meters',
    km: 'Kilometers'
};

var UNITS_TYPE = {
    DISTANCE_BASED: 'D',
    TIME_BASED: 'T'
};

function Interval(duration, unit, isRecovery) {
    this._duration = duration;
    this._unit = unit;
    this._recovery = isRecovery;
}

Interval.prototype.getDuration = function () {
    return this._duration;
};

Interval.prototype.isRecovery = function () {
    return this._recovery;
};

Interval.prototype.getDurationInSeconds = function() {
    if (this.getUnit() === UNITS.minutes)
        return this.getDuration() * 60;
    else
        return this.getDuration();
};

Interval.prototype.getDistanceInKm = function () {
    if (this.getUnit() === UNITS.meters)
        return this.getDuration() / 1000;
    else
        return this.getDuration();
};



Interval.prototype.getUnit = function () {
    return this._unit;
};

Interval.prototype.isRecovery = function () {
    return this._recovery;
};

Interval.prototype.type = function() {
    if (this.getUnit() === UNITS.minutes || this.getUnit() === UNITS.seconds)
        return UNITS_TYPE.TIME_BASED;
    else if (this.getUnit() === UNITS.km || this.getUnit() === UNITS.meters)
        return UNITS_TYPE.DISTANCE_BASED;
    else
        throw 'Unknown unit ' + this.getUnit();
};

exports.Splits = Splits;