'use strict';

import Utils from "../utils/utils";

class Timer {
    constructor(remotelyStartedAt) {

        this.second = 0;
        this.minute = 0;
        this.hour = 0;
        this.duration = 0;
        this.listener = function(){};
        this.timestamp = undefined;
        this.remotelyStartedAt = remotelyStartedAt > 0 ? remotelyStartedAt : null;
    }

    start(listener) {
        this.listener = listener;
        return this.timer();
    }

    pause() {
        clearInterval(this.intervalId);
    }

    resume() {
        this.timer(this.duration);
    }

    stop() {
        clearInterval(this.intervalId);
    }

    /**
     * Get session duration as per the last time the duration was updated (1 per second)
     * Differs from getCurrentDuration() in the fact that it will not account for the miliseconds that passed since
     * last time the timer was triggered
     *
     * @return {number}
     */
    getDuration() {
        return this.duration;
    }

    /**
     * Get duration as per what it is at the time of the call of this method
     * Differs from getDuration() in the fact that it will add the miliseconds that have passed since the last time
     * the timer was triggered to give the actual current duration to the milisecond
     * @return {number}
     */
    getCurrentDuration() {
        return this.duration + (Date.now() - this.timestamp);
    }

    getTimestamp() {
        return this.timestamp;
    }

    timer(offset) {
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
    }

    format(time) {
        return Utils.displayDurationHasTime(time)
    }

    formatWithMilis(time) {
        return Utils.displayDurationHasTime(time, true)
    }
}

export default Timer;
