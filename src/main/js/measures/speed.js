'use strict';
var utils = require('../utils/utils');

function Speed() {
    this.value = 0;
    this.lastDistance = undefined;
    this.lastPosition = undefined;
    this.lastSpeed = undefined;
    this.speeds = [];
}


Speed.prototype.calculate = function (position, distance) {
    if (this.lastDistance === undefined) {
        this.lastDistance = distance;
        this.lastPosition = position;
        return this.value;
    }

    // don't display speed until we reach 10 meters
    if (this.lastDistance === distance || distance <= 0.01) {
        return this.value;
    }

    var diff = distance - this.lastDistance;
   
    var hours = (position.timestamp - this.lastPosition.timestamp) / 1000 / 60 / 60;
    var speed = diff * (1 / hours);

    this.speeds.push(speed);

    this.lastDistance = distance;
    this.lastPosition = position;

    if (this.speeds.length > 3) {
        this.speeds.shift();
    }

    if (this.speeds.length === 3) {
        this.value = utils.avg(this.speeds);
    }

    return this.value;
};

Speed.prototype.reset = function () {
    this.value = 0;
    this.speeds = [];
};

Speed.prototype.getValue = function () {
    return this.value;
};

exports.Speed = Speed;