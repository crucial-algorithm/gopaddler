'use strict';


const ERROR_CODES = {
    INVALID_SPLIT_POSITION: 1
};

/**
 * @typedef {Object} SplitInfo
 * @property {boolean} isRecovery
 * @property {number} position
 * @property {boolean} isDistanceBased
 * @property {number} duration
 * @property {{time: number, distance: number}} start
 * @property {{time: number, distance: number}} finish
 */

class Splits {
    /**
     *
     * @param splits               Array of splits ()
     * @param listener             Call every second, trigger by calling reCalculate
     * @param distanceToTime
     * @param timeToDistance
     * @param currentDuration
     * @param {boolean} manual
     */
    constructor(splits = null, listener = null, manual = true
        , distanceToTime = function(value){return value}, timeToDistance = function(value){return value}, currentDuration = function(value){return value}) {
        this.splits = [];
        this.stats = [];
        this.areSplitsSet = false;

        if (splits) {
            this.splits = splits.slice();
            this.areSplitsSet = true;
        }

        this.running = false;
        this.delayed = false;
        this.started = false;
        this.finished = false;
        /**@type Interval */
        this.split = null;
        /**@type Interval */
        this.previous = null;

        this.manual = manual === true;
        this.waitingForUserCommand = false;
        this.splitStart = null;
        this.splitStop = null;

        this.listener = listener || function(){};
        this.position = -1;
        this.onStart = function(){};
        this.playStartCountDown = function(){};
        this.playFinishCountDown = function(){};
        this.playFinish = function(){};
        this.onSplitChangeListener = function(){};
        this.distanceToTime = distanceToTime;
        this.timeToDistance = timeToDistance;
        this.currentDuration = currentDuration;
    }

    start(duration, delay, onStart) {
        if (typeof delay === "number") {
            this.splits.unshift({_duration: delay, _unit: 'seconds', _recovery: true});
            this.delayed = true;
            this.started = false;
        } else {
            this.started = true;
        }
        this.onStart = onStart || function(){};
        if (this.splits.length > 0)
            this.running = true;
    }

    stop() {
        this.split = undefined;
        this.running = false;
        this.position = -1;
        this.finished = true;
    }

    reCalculate() {

        if (this.running === false)
            return;

        if (!this.split) {
            this.nextSplit();
            if (this.delayed === false && this.started === true) {
                this.onStart.apply({}, [this.timestamp, this.split ? this.split.isDistanceBased() : false
                    , this.split ? this.split.getStartedAt() : null]);
            }
        }

        if (this.waitingForUserCommand) {
            this.listener(this.duration, this.split.isRecovery(), /* finished = */ false, /* isDistance? */ false, this.splitStop, this.stats[this.position]);
            return;
        }

        if (this.split.type() === UNITS_TYPE.DISTANCE_BASED) {
            this.assessDistanceBasedSplit();
        } else {
            this.assessTimeBasedSplit();
        }

    }

    update(timestamp, duration, distance) {
        this.timestamp = timestamp;
        this.duration = duration;
        this.distance = Math.round(distance * 1000);
        this.reCalculate()
    }

    assessTimeBasedSplit() {
        let seconds = Math.round((this.splitStop - this.duration) / 1000);

        if (this.split.isRecovery() && seconds === 6) {
            this.playStartCountDown();
        } else if (!this.split.isRecovery() && seconds === 3) {
            this.playFinishCountDown();
        }

        if (seconds <= 0) {

            this.nextSplit();

            // check if this is the first split after delay
            if (this.started === false && this.delayed === true) {
                this.onStart.apply({}, [this.timestamp, this.split ? this.split.isDistanceBased() : false]);
                this.started = true;
            }

            if (!this.split || this.waitingForUserCommand === true)
                return;

            // if next measure is distance based, show value formatted accordingly
            if (this.split.type() === UNITS_TYPE.DISTANCE_BASED) {
                this.listener(this.split.getDistanceInMeters(), this.split.isRecovery()
                    , /* finished = */ false, /* isDistance? */ true, this.splitStop, this.stats[this.position]);
                return;
            }
        }

        this.listener(this.split.getDurationInMiliSeconds() - 1000 - (this.duration - this.splitStart)
            , this.split.isRecovery(), /* finished = */ false, /* isDistance? */ false, this.splitStop, this.stats[this.position]);
    }

    assessDistanceBasedSplit() {

        if (this.splitStop - this.distance <= 0) {
            console.log('split finished', this.splitStop, this.distance);

            this.playFinish();
            this.nextSplit();

            if (!this.split || this.waitingForUserCommand)
                return;

            // if next measure is timed based, show value formatted accordingly
            if (this.split.type() === UNITS_TYPE.TIME_BASED) {
                this.listener(this.split.getDurationInMiliSeconds(), this.split.isRecovery()
                    , /* finished = */ false, /* isDistance? */ false, this.splitStop, this.stats[this.position]);
                return;
            }
        }

        this.listener(this.split.getDistanceInMeters() - (this.distance - this.splitStart), this.split.isRecovery()
            , /* finished = */ false, /* isDistance? */ true, this.splitStop, this.stats[this.position]);

    }

    nextSplit(startedTime = null, startedDistance = null) {
        let s = this.splits.shift();
        let old = {split: this.split, position: this.position};
        this.previous = this.split;

        if (s === undefined) {
            this.stop();
            this.listener(null, null, /* finished = */ true, /* isDistance? */ false, null);
            this.calculateSplitLimits(null, null, old.position);
            this.notifySplitChanged(old);
            return;
        }
        old.split = this.previous;

        // When delayed, 1st interval is the actual delay that needs to be done! So, skip increasing position
        // to prevent going one position on top of what is in the schedule session! When previous is defined,
        // delay interval has already passed
        if (!this.delayed || (this.delayed && this.previous))
            this.position++;

        /**
         * When athletes finish a distance interval, wait for coach to manually demand move to next interval,
         * instead of moving automatically
         */
        if (this.previous && this.previous.isDistanceBased() && this.manual) {
            this.waitingForUserCommand = true;
            this.split = new Interval(Infinity, UNITS.seconds, true, this.duration);

            /**
             * take care of those cases when coach does not define a recovery interval! example:
             * 100m + 100m + 75m + 75m
             */
            if (s._recovery === false) {
                this.splits.unshift(s);
            }
        } else {
            this.split = new Interval(s._duration, s._unit, s._recovery, this.duration);
        }

        this.calculateSplitLimits(startedTime, startedDistance);
        this.notifySplitChanged(old);
    }

    notifySplitChanged(old) {
        let previous = this.stats[this.position - 1], current = this.stats[this.position];
        if (!this.split) {
            previous = this.stats[this.stats.length - 1];
            current = null;
        }

        return this.onSplitChangeListener.apply({}, [previous, current, !this.split]);
    }

    /**
     * Calculate start and stop for a split; takes both time and distance as argument, and it will use
     * each one according to split type
     *
     * @param startedTime       Start time (Duration in seconds)
     * @param startedDistance   Start distance (distance in km)
     * @param position
     */
    calculateSplitLimits(startedTime = null, startedDistance = null, position = null) {

        if (this.previous) {
            if (this.previous.isDistanceBased()) {
                startedTime = startedTime === null ? this.distanceToTime(this.splitStop / 1000) : startedTime;
                startedDistance = this.splitStop;
            } else {
                startedTime = isFinite(this.splitStop) ? this.splitStop : this.currentDuration();
                startedDistance = startedDistance === null ? this.timeToDistance(this.splitStop) * 1000 : startedDistance;
            }
        }

        if (startedTime === null) {
            startedTime = this.splitStop === null ? this.duration : this.splitStop;
        }

        if (startedDistance === null) {
            startedDistance = this.splitStop === null ? this.distance : this.splitStop;
        }

        this.gatherStats(startedTime, startedDistance, position);

        if (!this.split) {
            return;
        }

        if (this.split.type() === UNITS_TYPE.DISTANCE_BASED) {
            this.splitStart = startedDistance;
            this.splitStop = this.splitStart + this.split.getDistanceInMeters();
        } else {
            this.splitStart = startedTime;
            this.splitStop = this.splitStart + this.split.getDurationInMiliSeconds();
        }

        console.log(`[${this.position} / ${this.splits.length}] \t split start ${this.splitStart}; stop: ${this.splitStop}, @ ${this.timestamp};`)
    }

    gatherStats(when, where, position) {
        position = position === null ? this.position - 1 : position;
        let previous = this.stats[position] === undefined ? null : this.stats[position];

        if (previous !== null) {
            previous.finish.time = when;
            previous.finish.distance = where;
        }

        if (!this.split) {
            return;
        }

        this.stats[this.position] = {
            isRecovery: this.split.isRecovery(),
            position: this.position,
            isDistanceBased: this.split.isDistanceBased(),
            duration: this.split.isDistanceBased() ? this.split.getDistanceInMeters() : this.split.getDuration(),
            start: {time: when, distance: where},
            finish: {time: null, distance: null}
        };
    }

    /**
     * When session is restarted (for instance, if coach refreshes session in browser), reset will take splits
     * handling back to the point it should be
     *
     * @param {number}  position                Split number session is currently in
     * @param {number}  splitStartedAt          Split start time (in seconds)
     * @param {number}  splitStartedDistance    Split start distance (in km's)
     */
    reset(position, splitStartedAt, splitStartedDistance) {
        if (position < 0 || position >= this.splits.length) {
            throw {
                code: ERROR_CODES.INVALID_SPLIT_POSITION
                , message: `position must be gte to zero and lte to ${this.splits.length - 1}`
            }
        }
        let s = this.splits[position];
        this.split = new Interval(s._duration, s._unit, s._recovery, splitStartedAt);
        this.setPosition(position);
        this.calculateSplitLimits(splitStartedAt, splitStartedDistance);
        this.notifySplitChanged({split: null, position: -1});
    }

    /**
     * Used when in free session coach wants to store a split
     */
    increment(duration = null, distance = null) {
        if (this.areSplitsSet) {
            this.waitingForUserCommand = false;
            this.nextSplit(duration, distance);
            return;
        }
        this.position++;
    }

    resetDistance(value) {
        this.distance = value;
    }

    resetDuration(value) {
        this.duration = value;
    }

    zeroPad(value) {
        if (value < 10) {
            value = "0" + value;
        }
        return value;
    }

    format(time) {
        let hour, minute, second, elapsed;

        elapsed = Math.round(time);
        minute = Math.floor(elapsed / 60);
        second = elapsed - minute * 60;

        hour = 0;
        if (minute > 0) {
            hour = Math.floor(minute / 60);
            minute = minute - hour * 60;
        }
        return this.zeroPad(hour) + ':' + this.zeroPad(minute) + ':' + this.zeroPad(second);
    }

    getPosition() {
        return this.position;
    }

    setPosition(position) {
        if (position < 0) {
            throw {
                code: ERROR_CODES.INVALID_SPLIT_POSITION
                , message: `position must be gte to zero and lte to ${this.splits.length - 1}`
            }
        }
        this.position = position;
        this.splits = this.splits.slice(position + 1, this.splits.length);
    }

    onStartCountDownUserNotification(listener) {
        this.playStartCountDown = listener;
    }

    onFinishCountDownUserNotification(listener) {
        this.playFinishCountDown = listener;
    }

    onFinishUserNotification(listener) {
        this.playFinish = listener;
    }

    onSplitChange(listener) {
        this.onSplitChangeListener = listener;
    }

    getCurrentSplit() {
        return this.split;
    }

    isRecovery() {
        let split = this.split;
        if (this.areSplitsSet === false) {
            return false;
        }
        if (this.position < 0) {
            return true;
        }

        return this.split.isRecovery();

    }

    isFinished() {
        return this.finished === true;
    }
}

// synced with webapp
const UNITS = {
    minutes: 'minutes',
    seconds: 'seconds',
    meters: 'meters',
    km: 'Kilometers'
};

const UNITS_TYPE = {
    DISTANCE_BASED: 'D',
    TIME_BASED: 'T'
};


class Interval {
    /**
     *
     * @param duration      How long does the interval last
     * @param unit          Unit (either distance or time)
     * @param isRecovery    Is it a recovery interval?
     * @param startedAt     Duration split started at
     */
    constructor(duration, unit, isRecovery, startedAt) {
        this._duration = duration;
        this._unit = unit;
        this._recovery = isRecovery;
        this._startedAt = startedAt
    }

    getDuration() {
        return this._duration;
    }

    isRecovery() {
        return this._recovery;
    }

    getDurationInMiliSeconds() {
        if (this.getUnit() === UNITS.minutes) {
            return this.getDuration() * 60000;
        } else {
            return this.getDuration() * 1000;
        }
    }

    getDistanceInMeters() {
        if (this.getUnit() === UNITS.km) {
            return this.getDuration() * 1000;
        } else {
            return this.getDuration();
        }
    }

    getUnit() {
        return this._unit;
    }

    type() {
        if (this.getUnit() === UNITS.minutes || this.getUnit() === UNITS.seconds) {
            return UNITS_TYPE.TIME_BASED;
        } else if (this.getUnit() === UNITS.km || this.getUnit() === UNITS.meters) {
            return UNITS_TYPE.DISTANCE_BASED;
        } else {
            throw 'Unknown unit ' + this.getUnit();
        }
    }

    isDistanceBased() {
        return this.type() === UNITS_TYPE.DISTANCE_BASED;
    }

    getStartedAt() {
        return this._startedAt;
    }
}

export default Splits;
