'use strict';
var utils = require('../utils/utils');

function StrokeEfficiency() {}


StrokeEfficiency.prototype.calculate = function (speed, interval) {
    if (speed === undefined || speed === 0) return 0;

    // No strokes detected... set to zero
    if (interval === undefined || interval === 0) {
        return 0;
    }

    var metersPerSecond = (speed * 1000) / 60 / 60;
    return metersPerSecond * (interval / 1000);
};


exports.StrokeEfficiency = StrokeEfficiency;