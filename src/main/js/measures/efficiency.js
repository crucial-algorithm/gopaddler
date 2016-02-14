'use strict';
var utils = require('../utils/utils');

function StrokeEfficiency() {}


StrokeEfficiency.prototype.calculate = function (distance, takenAt, interval) {
    var self = this, howManyStrokes, stretch, efficiency;
    if (distance === undefined) return 0;

    if (self._distance === undefined) {
        self._distance = distance;
        self._distanceTakenAt = takenAt;
        return 0;
    }

    // sequential readings without any update from GPS
    if (self._distance === distance && takenAt === self._distanceTakenAt
        && (new Date().getTime() - self._lastSuccessfulUpdate) > 3000) {
        return 0;
    }

    // No strokes detected... set to zero
    if (interval === undefined) {
        return 0;
    }

    // calculate distance since last update (convert to meters)
    stretch =  (distance - self._distance) * 1000;

    if (stretch === 0) return 0;

    // taking in consideration the time interval between distance readings,
    // calculate how many strokes we should have done based on current frequency
    howManyStrokes = (takenAt - self._distanceTakenAt) / interval;

    if (howManyStrokes === 0) {
        return 0;
    }

    // redefine distance and takenAt
    self._distance = distance;
    self._distanceTakenAt = takenAt;
    self._lastSuccessfulUpdate = new Date().getTime();

    return utils.round1((stretch / howManyStrokes));
};


exports.StrokeEfficiency = StrokeEfficiency;