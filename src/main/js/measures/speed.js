'use strict';
var utils = require('../utils/utils');

function Speed() {
    this.value = 0;
}


Speed.prototype.calculate = function (position) {
    this.value = utils.round2(position.coords.speed * 3.6);
    return this.value;
};

Speed.prototype.getValue = function () {
    return this.value || 0;
}

exports.Speed = Speed;