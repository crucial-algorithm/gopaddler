'use strict';
var Measure = require('./measure').Measure;
var utils = require('../utils/utils');

function Speed($parent, gps) {
    this.defaultValue = "0";
    this.measure = Measure.get('small', $parent, "Speed", "Km/h", this.defaultValue);
    this.$parent = $parent;
    this.gps = gps;
    this.render();
    this.value = undefined;
    this.paused = false;
}

Speed.prototype.render = function() {
    this.measure.render();
};

Speed.prototype.start = function () {
    var self = this;
    self.gps.listen(function (position) {
        if (self.paused === true) return;
        self.value = utils.round2(position.coords.speed * 3.6);
        self.measure.setValue(self.value < 0 ? 0 : self.value);
    });
};

Speed.prototype.pause = function () {
    this.paused = true;
}

Speed.prototype.resume = function () {
    this.paused = false;
}

Speed.prototype.reset = function () {
    this.measure.setValue(this.defaultValue);
};

Speed.prototype.getValue = function () {
    return this.value;
};

exports.Speed = Speed;