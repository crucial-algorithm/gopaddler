'use strict';
var utils = require('../utils/utils');

function Pace(convertToImperial) {
    this.value = 0;
    this.convertToImperial = convertToImperial;
}

Pace.prototype.calculate = function (speed) {
    var value = utils.speedToPace(speed);
    if (value === null) {
        return 0;
    }

    this.value = value;
    return value;
};


Pace.prototype.getValue = function () {
    return this.value;
};

exports.Pace = Pace;
