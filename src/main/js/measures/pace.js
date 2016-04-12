'use strict';
var utils = require('../utils/utils');

function Pace(convertToImperial) {
    this.value = 0;
    this.convertToImperial = convertToImperial;
}

Pace.prototype.calculate = function (speed) {
    var value;
    if (this.convertToImperial === true) {
        value = 60 / utils.kmToMiles(speed);
    } else {
        value = 60 / speed;
    }

    if (isNaN(value) || !isFinite(value)) return 0;

    var decimal = (value % 1);
    var minutes = value - decimal;
    var seconds = Math.round(decimal * 60);

    this.value = minutes + ":" + utils.lpad(seconds, 2);

    return this.value;
};


Pace.prototype.getValue = function () {
    return this.value;
};

exports.Pace = Pace;