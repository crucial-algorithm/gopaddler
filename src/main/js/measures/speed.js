'use strict';
var utils = require('../utils/utils');
var GPS = require('../utils/gps').GPS;

function Speed() {
    this.value = 0;
    this.positions = [];
}

Speed.prototype.calculate = function (position, dist) {

    // don't display speed until we reach 10 meters
    if (dist <= 0.01) {
        return 0;
    }

    this.positions.push(position);

    if (this.positions.length < 5) {
        this.value = position.coords.speed * 3.6;
        return this.value;
    }

    if (this.positions.length > 5) {
        this.positions.shift();
    }

    var distance, delta;

    distance = GPS.calcDistance(this.positions[4], this.positions[1]);
    delta = this.positions[4].timestamp - this.positions[0].timestamp;

    this.value = distance * (1 / (delta/1000/60/60));

    return this.value;
};

Speed.prototype.reset = function () {
    this.value = 0;
    this.positions = [];
};

Speed.prototype.getValue = function () {
    return this.value;
};

exports.Speed = Speed;