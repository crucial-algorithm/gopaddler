'use strict';
var Measure = require('./measure').Measure;
var utils = require('../utils/utils');

function StrokeEfficiency($parent) {
    this.defaultValue = "0";
    this.measure = Measure.get('large', $parent, "-", "-", this.defaultValue);
    this.$parent = $parent;
    this._distance = undefined;
    this._distanceTakenAt = undefined;
    this._lastSuccessfulUpdate = undefined;
    this.render();
    this.value = undefined;

    this.paused = false;
}

StrokeEfficiency.prototype.render = function () {
    this.measure.render();
};

StrokeEfficiency.prototype.start = function () {
};

StrokeEfficiency.prototype.pause = function () {
    this.paused = true;
};

StrokeEfficiency.prototype.resume = function () {
    this.paused = false;
};

StrokeEfficiency.prototype.reset = function () {
    this.measure.setValue(this.defaultValue);
};

StrokeEfficiency.prototype.getValue = function () {
    return this.value;
};

exports.StrokeEfficiency = StrokeEfficiency;

StrokeEfficiency.prototype.update = function (distance, takenAt, interval) {
    var self = this, howManyStrokes, stretch, efficiency;
    if (self.paused || distance === undefined) return;

    if (self._distance === undefined) {
        self._distance = distance;
        self._distanceTakenAt = takenAt;
        return;
    }

    // sequential readings without any update from GPS
    if (self._distance === distance && takenAt === self._distanceTakenAt
        && (new Date().getTime() - self._lastSuccessfulUpdate) > 3000) {
        self.measure.setValue(0);
        self.value = 0;
        return;
    }

    // No strokes detected... set to zero
    if (interval === undefined) {
        self.measure.setValue(0);
        self.value = 0;
        return;
    }

    // calculate distance since last update (convert to meters)
    stretch =  (distance - self._distance) * 1000;

    if (stretch === 0) return;

    // taking in consideration the time interval between distance readings,
    // calculate how many strokes we should have done based on current frequency
    howManyStrokes = (takenAt - self._distanceTakenAt) / interval;

    if (howManyStrokes === 0) {
        self.measure.setValue(0);
        self.value = 0;
        return;
    }

    // set value
    efficiency = utils.round2((stretch / howManyStrokes));
    self.measure.setValue(efficiency);
    self.value = efficiency;

    // redefine distance and takenAt
    self._distance = distance;
    self._distanceTakenAt = takenAt;
    self._lastSuccessfulUpdate = new Date().getTime();
};
