'use strict';
var utils = require('../utils/utils');

function Speed() {
    this.value = 0;
    this.speeds = [];
}


Speed.prototype.calculate = function (position, distance) {

    // don't display speed until we reach 10 meters
    if (distance <= 0.01) {
        return this.value;
    }

    this.speeds.push(position.coords.speed * 3.6);

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