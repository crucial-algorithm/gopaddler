'use strict';
var KalmanFilter = require('kalmanjs').default;

function Speed(context) {
    this.weight = context.getGpsRefreshRate() === 0 ? 5 : context.getGpsRefreshRate();
    this.value = 0;
    this.previous = null;
    this.distance = 0;
    this.context = context;
    this.kalmanFilter = new KalmanFilter({R: 2, Q: 0.8});
    this.speeds = [];
}

Speed.prototype.calculate = function (position) {

    if (this.previous === null) {
        this.previous = position;
        return 0;
    }

    var speed = this.kalmanFilter.filter(position.coords.speed);

    if (this.speeds.length > 5) {
        this.speeds.shift();
    }

    this.speeds.push(speed);
    this.value = this.average();

    this.previous = position;
    return this.value * 3.6;
};

Speed.prototype.reset = function () {
    this.value = 0;
    this.distance = 0;
};

Speed.prototype.average = function () {
    if (this.speeds.length === 0) {
        return 0;
    }

    if (this.weight === 1) {
        return this.speeds[this.speeds.length - 1];
    }

    var count = 0, total = 0, i = this.speeds.length - 1;
    while (i >= 0) {
        total += this.speeds[i];
        count++;
        i--;

        if (count === this.weight) {
            return total / count;
        }
    }

    return total / count;
};

Speed.prototype.getValue = function () {
    return this.value * 3.6;
};

exports.Speed = Speed;
