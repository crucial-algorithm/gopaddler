'use strict';

function Timer() {

    this.second = 0;
    this.minute = 0;
    this.hour = 0;
    this.duration = 0;
    this.listener = function(){};
    this.splits = undefined;
    this.timestamp = undefined;
}

Timer.prototype.start = function(listener) {
    this.listener = listener;
    return this.timer();
};

Timer.prototype.setSplits = function (splits) {
    this.splits = splits;
};

Timer.prototype.pause = function () {
    clearInterval(this.intervalId);
};

Timer.prototype.resume = function () {
    this.timer(this.duration);
};

Timer.prototype.stop = function() {
    var self = this;
    clearInterval(self.intervalId);
};

Timer.prototype.getDuration = function () {
    return this.duration;
};

Timer.prototype.getTimestamp = function () {
    return this.timestamp;
};


Timer.prototype.timer = function(offset) {
    var self = this
        , start, time;

    offset = offset || 0;

    start = new Date().getTime();
    self.timestamp = undefined;
    this.intervalId = setInterval(function () {
        self.timestamp = new Date().getTime();
        time = self.timestamp + offset - start;
        self.duration = time;

        // notify listener and update splits
        self.listener(self.format(time), self.timestamp, time);
        if (self.splits)
            self.splits.setTime.apply(self.splits, [self.timestamp, time]);

    }, 1000);

    return start;
};

Timer.prototype.zeroPad = function (value) {
    if (value < 10) {
        value = "0" + value;
    }
    return value;
};

Timer.prototype.format = function (time) {
    var hour, minute, second, elapsed;

    elapsed = Math.round(time / 1000);
    minute = Math.floor(elapsed / 60);
    second = elapsed - minute * 60;

    hour = 0;
    if (minute > 0) {
        hour = Math.floor(minute / 60);
        minute = minute - hour * 60;
    }
    return this.zeroPad(hour) + ':' + this.zeroPad(minute) + ':' + this.zeroPad(second);
};


exports.Timer = Timer;
