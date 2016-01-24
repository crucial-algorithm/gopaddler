'use strict';
var Measure = require('./measure').Measure;

function StrokeRate($parent, strokeDetector) {
    this.defaultValue = "0";
    this.measure = Measure.get('large', $parent, "-", "-", this.defaultValue);
    this.$parent = $parent;
    this.strokeDetector = strokeDetector;
    this.render();
    this.value = undefined;
    this.onUpdateListener = function(){};
    this.paused = false;
}

StrokeRate.prototype.render = function() {
    this.measure.render();
};

StrokeRate.prototype.start = function () {
    var self = this;

    this.strokeDetector.onStrokeRateChanged(function (spm) {
        if (isNaN(spm)) return;

        if (self.paused === true) return;

        self.measure.setValue(spm);
        self.value = spm;
        self.onUpdateListener.apply({}, [spm]);
    });

    this.strokeDetector.start();
};

StrokeRate.prototype.pause = function () {
    this.paused = true;
}

StrokeRate.prototype.resume = function () {
    this.paused = false;
}

StrokeRate.prototype.reset = function () {
    this.measure.setValue(this.defaultValue);
};

StrokeRate.prototype.getValue = function () {
    return this.value;
}

StrokeRate.prototype.onUpdate = function (callback) {
    this.onUpdateListener = callback;
};

exports.StrokeRate = StrokeRate;