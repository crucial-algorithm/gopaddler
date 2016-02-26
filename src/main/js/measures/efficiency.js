'use strict';
var utils = require('../utils/utils');

function StrokeEfficiency() {}


StrokeEfficiency.prototype.calculate = function (speed, interval) {
    if (speed === undefined || speed === 0) return 0;

    // No strokes detected... set to zero
    if (interval === undefined || interval === 0) {
        return 0;
    }

    var metersPerSecond = speed / 60 / 60;
    return utils.round1(metersPerSecond * (1 / interval));
};


exports.StrokeEfficiency = StrokeEfficiency;