'use strict';

function Timer(remotelyStartedAt) {

    this.second = 0;
    this.minute = 0;
    this.hour = 0;
    this.duration = 0;
    this.listener = function(){};
    this.timestamp = undefined;
    this.remotelyStartedAt = remotelyStartedAt > 0 ? remotelyStartedAt : null;
}

Timer.prototype.start = function(listener) {
    this.listener = listener;
    return this.timer();
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
        , start, time, waitFor = 0;

    offset = offset || 0;

    start = this.remotelyStartedAt !== null ? this.remotelyStartedAt : Date.now();
    self.timestamp = undefined;

    if (this.remotelyStartedAt > 0) {
        start = this.remotelyStartedAt;
        var milisNow = Date.now() % 1000, milisStart = start % 1000, diff = milisStart - milisNow;
        waitFor = diff < 0 ? diff + 1000 : diff;
    }
    var interval = function () {
        self.intervalId = setInterval(function () {
            self.timestamp = Date.now();
            time = self.timestamp + offset - start;
            self.duration = time;

            // notify listener
            self.listener(self.format(time), self.timestamp, time);

        }, 1000);
    };

    if (waitFor > 0) {
        setTimeout(function () {
            interval();
        }, waitFor);
    } else {
        interval();
    }

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
