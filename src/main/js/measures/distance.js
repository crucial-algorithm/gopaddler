'use strict';
var Measure = require('./measure').Measure;
var GPS = require('../utils/gps').GPS;
var utils = require('../utils/utils');


function Distance($parent, gps) {
    this.defaultValue = "0";
    this.measure = Measure.get('small', $parent, "Distance", "Km", this.defaultValue);
    this.$parent = $parent;
    this.gps = gps;
    this.render();
    this.value = undefined;
    this.paused = false;
    this.takenAt = null;
}

Distance.prototype.render = function() {
    this.measure.render();
};

Distance.prototype.start = function () {
    var self = this, previous = undefined, distance = 0, i = 0 ;

    this.gps.listen(function (position) {
        if (self.paused === true) return;

        self.takenAt = new Date().getTime();

        if (i < 5) {
            i++;
            return;
        }

        if (previous !== undefined) {
            distance += GPS.calcDistance(previous, position);

            self.value = utils.round2(distance);
            self.measure.setValue(self.value);
        }

        previous = position;
    });
};

Distance.prototype.pause = function () {
    this.paused = true;
}

Distance.prototype.resume = function () {
    this.paused = false;
}

Distance.prototype.reset = function () {
    this.measure.setValue(this.defaultValue);
};

Distance.prototype.getValue = function () {
    return this.value;
};

Distance.prototype.getTakenAt = function(){
    return this.takenAt;
}

exports.Distance = Distance;