'use strict';
var Measure = require('./measure').Measure;

function Timer($parent) {
    this.measure = Measure.get('small', $parent, 'Duration', undefined, '00:00:00');
    this.$parent = $parent;

    this.second = 0;
    this.minute = 0;
    this.hour = 0;
    this.duration = 0;
    this.render();
}


Timer.prototype.render = function() {
    this.measure.render();
}

Timer.prototype.start = function() {
    this.timer();
}

Timer.prototype.pause = function () {
    clearInterval(this.intervalId);
}

Timer.prototype.resume = function () {
    this.timer(this.duration);
}

Timer.prototype.stop = function() {
    var self = this;
    clearInterval(self.intervalId);
}

Timer.prototype.timer = function(offset) {
    var self = this
        , start, time, elapsed;

    offset = offset || 0;

    start = new Date().getTime();
    this.intervalId = setInterval(function () {
        time = (new Date().getTime() + offset) - start;
        elapsed = Math.round(time / 1000);
        self.duration = time;

        self.minute = Math.floor(elapsed / 60);
        self.second = elapsed - self.minute * 60;

        if (self.minute > 0) {
            self.hour = Math.floor(self.minute / 60);
            self.minute = self.minute - self.hour * 60;
        }

        self.measure.setValue(self.toString());
    }, 1000);
}

Timer.prototype.zeroPad = function (value) {
    if (value < 10) {
        value = "0" + value;
    }
    return value;
}

Timer.prototype.toString = function () {
    return this.zeroPad(this.hour) + ':' + this.zeroPad(this.minute) + ':' + this.zeroPad(this.second);
}


exports.Timer = Timer;