'use strict';
var GPS = require('../utils/gps').GPS;

function Speed(context) {
    this.calculator = instantiateCalculator(context.getGpsRefreshRate());
    this.value = 0;
    this.previous = null;
    this.distance = 0;
    this.context = context;
}

Speed.prototype.calculate = function (position, now) {

    if (this.previous === null) {
        this.previous = position;
        return 0;
    }

    var movement = GPS.evaluateMovement(this.previous, position, now);
    if (movement !== null) {
        this.distance += movement.distance;
    }

    // don't display speed until we reach 10 meters
    if (this.distance < 0.01) {
        return 0;
    }

    if (this.context.isDev()) {
        return 36;
    }

    this.value = this.calculator.calculate(position, this.distance);

    this.previous = position;
    return this.value;
};

Speed.prototype.reset = function () {
    this.value = 0;
    this.distance = 0;
    this.calculator.reset();
};

Speed.prototype.getValue = function () {
    return this.value;
};

function instantiateCalculator(rate) {
    rate = rate === 0 ? 5 : rate;

    if (rate === 3 || rate === 5) {
        return new DistanceBasedSpeedCalculator(rate)
    } else {
        return new RawBasedSpeedCalculator();
    }
}

function DistanceBasedSpeedCalculator(rate) {
    this.readings = rate;
    this.positions = [];
}

DistanceBasedSpeedCalculator.prototype.calculate = function (position, distance) {

    this.positions.push({timestamp: position.timestamp, distance: distance});

    if (this.positions.length < this.readings) {
        return position.coords.speed * 3.6;
    }

    if (this.positions.length > this.readings) {
        this.positions.shift();
    }

    var movement, duration;
    movement = this.positions[this.readings - 1].distance - this.positions[0].distance;
    duration = this.positions[this.readings - 1].timestamp - this.positions[0].timestamp;

    var speed = movement * (1 / (duration / 1000 / 60 / 60));
    if (isNaN(speed)) {
        return 0;
    }
    return speed;
};


DistanceBasedSpeedCalculator.prototype.reset = function () {
    this.positions = [];
};


function RawBasedSpeedCalculator() {
    // intentionally left blank
}

RawBasedSpeedCalculator.prototype.calculate = function (position, distance) {
    return position.coords.speed * 3.6;
};

RawBasedSpeedCalculator.prototype.reset = function () {
    // nothing to do
};


exports.Speed = Speed;
