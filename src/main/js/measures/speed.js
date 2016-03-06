'use strict';
var utils = require('../utils/utils');

function Speed() {
    this.value = 0;
}


Speed.prototype.calculate = function (position) {
    var value = position.coords.speed * 3.6;
    if (value > this.value)  this.value = value;
    return this.value;
};

Speed.prototype.reset = function () {
    this.value = 0;
}

Speed.prototype.getValue = function () {
    return this.value;
}

exports.Speed = Speed;