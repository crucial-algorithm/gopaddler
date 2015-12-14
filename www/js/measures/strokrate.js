function StrokeRate($parent, strokeDetector) {
    this.defaultValue = "0";
    this.measure = Measure.get('large', $parent, "-", "-", this.defaultValue);
    this.$parent = $parent;
    this.strokeDetector = strokeDetector;
    this.render();
    this.value = undefined;
    this.onUpdateListener = function(){};
}

StrokeRate.prototype.render = function() {
    this.measure.render();
};

StrokeRate.prototype.start = function () {
    var self = this;

    this.strokeDetector.onStrokeRateChanged(function (spm) {
        if (isNaN(spm)) return;

        self.measure.setValue(spm);
        self.value = spm;
        self.onUpdateListener.apply({}, [spm]);
    });

    this.strokeDetector.start();
};

StrokeRate.prototype.reset = function () {
    this.measure.setValue(this.defaultValue);
};

StrokeRate.prototype.getValue = function () {
    return this.value;
}

StrokeRate.prototype.onUpdate = function (callback) {
    this.onUpdateListener = callback;
};