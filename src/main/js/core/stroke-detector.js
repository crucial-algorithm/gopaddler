'use strict'

var utils = require('../utils/utils');

var SPM_STROKE_COUNT = 8;

function StrokeDetector(calibration, onStrokeDetected, onAccelerationTriggered) {
    var self = this;
    self.watchId = undefined;

    self.max = 0;
    self.min = 0;
    self.maxAt = undefined;
    self.minAt = undefined;
    self.maxs = [];
    self.mins = [];
    self.checkpoint = undefined;
    self.positiveMaxs = [];
    self.negativeMaxs = [];
    self.positiveThreshold = undefined;
    self.negativeThreshold = undefined;
    self.strokes = [];
    self.events = [];
    self.intervals = [];
    self.lastStroke = new Event(0, 0, 0, 0, /* detected = */ new Event(0, 0, 0, 0, undefined));
    self.counter = 0;
    self.lastEvent = undefined;

    self.intervalId = undefined;
    self.debugAcceleration = [];
    self.calibration = calibration;

    self.debug = false;

    // used in simulation, to represent strokes in chart
    self.onStrokeDetectedListener = onStrokeDetected || function () {};
    self.onAccelerationTriggeredListener = onAccelerationTriggered || function () {};
    self.onStrokeRateChangedListener = function () {};
    self.onThresholdChangedListener = function() {};
}

StrokeDetector.exceptions = {
    SD_EXCP_STALLED:  "STALLED"
};

StrokeDetector.prototype.onStrokeRateChanged = function (callback) {
    var self = this;
    self.onStrokeRateChangedListener = callback;
};

StrokeDetector.prototype.onAccelerationTriggered = function (callback) {
    var self = this;
    self.onAccelerationTriggeredListener = callback;
};

StrokeDetector.prototype.onThresholdChanged = function (callback) {
    var self = this;
    self.onThresholdChangedListener = callback;
};

StrokeDetector.prototype.onStrokeDetected = function (callback) {
    var self = this;
    self.onStrokeDetectedListener = callback;
};

StrokeDetector.prototype.stop = function () {
    var self = this;
    if (navigator.accelerometer)
        navigator.accelerometer.clearWatch(self.watchId);
    clearInterval(self.intervalId);
};

StrokeDetector.prototype.start = function () {
    var self = this, value;
    function onSuccess(acceleration) {

        // filter
        value = self.filter(acceleration);

        // call event handler
        self.process(acceleration, value);

        // for debug
        self.onAccelerationTriggeredListener(acceleration, value);
    }

    function onError() {
        console.log('onError!');
    }


    if (!self.calibration) {
        console.log("alert: missing calibration");
        return;
    }

    var options = { frequency: 40 };
    try {
        self.watchId = navigator.accelerometer.watchAcceleration(onSuccess, onError, options);
    } catch (e) {
        console.log('hmmm... no navigator.accelerometer found?!?!');
    }

    self.intervalId = setInterval(self.refreshSPM.bind(self), 1995);
};

StrokeDetector.prototype.refreshSPM = function () {
    var self = this, range, result;
    range = self.strokes.slice(-SPM_STROKE_COUNT);
    result = self.calculateSPM(range) || {};

    if (!isNaN(result.spm))
        self.onStrokeRateChangedListener(result.spm, result.interval);

    // keep only last 8 strokes, without any clean up of stroke rate calculation
    self.strokes = self.strokes.slice(-SPM_STROKE_COUNT);

    if (result.spm === 0) {
        self.onStrokeRateChangedListener(0, undefined);
        self.strokes = [];
    }
    return result.spm;
};


/**
 * Process events coming from accelerometer
 *
 * @param acceleration
 * @param value
 */
StrokeDetector.prototype.process = function (acceleration, value) {
    var self = this, current, stroke;

    if (self.checkpoint === undefined)
        self.checkpoint = acceleration.timestamp;

    value = utils.round2(value);

    self.updateThresholds(acceleration, value);

    if (self.positiveThreshold === undefined) return;

    current = new Event(acceleration.timestamp, value, self.positiveThreshold, self.negativeThreshold, undefined);

    if (self.isAccelerationCrossingThreshold(current, self.lastEvent)
        && (stroke = self.findMaxAbovePositiveThreshold(self.events, acceleration, self.lastStroke)) !== undefined) {
        stroke.setDetected(current);

        var lost = self.didWeLostOne(self.events, stroke, self.lastStroke);

        if (!lost) {

            // add current
            self.counter++;
            stroke.setStroke(self.counter);
            self.strokes.push(stroke);
            self.onStrokeDetectedListener(stroke);

            self.lastStroke = stroke;
        }
        // lost is before current
        else if (lost.position === -1) {

            // add lost
            self.counter++;
            lost.stroke.setStroke(self.counter);
            self.strokes.push(lost.stroke);
            self.onStrokeDetectedListener(lost.stroke);
            self.lastStroke.getDetected().relocate(lost.stroke);

            // add current
            self.counter++;
            stroke.setStroke(self.counter);
            self.strokes.push(stroke);
            self.onStrokeDetectedListener(stroke);

            self.lastStroke = stroke;

        }
        // lost is after current
        else {

            // add current
            self.counter++;
            stroke.setStroke(self.counter);
            self.strokes.push(stroke);
            self.onStrokeDetectedListener(stroke);
            self.lastStroke.getDetected().relocate(stroke);

            // add lost
            self.counter++;
            lost.stroke.setStroke(self.counter);
            self.strokes.push(lost.stroke);
            self.onStrokeDetectedListener(lost.stroke);

            self.lastStroke = lost.stroke;
        }

        self.events = [];

    } else {
        self.events = self.consolidate(self.events, current);
    }

    if (current.isSmallerThanOrEquealToNegativeThreshold() && self.lastStroke) {
        self.lastStroke.getDetected().add(current);
    }

    self.lastEvent = current;
};

/**
 * Calculate positive and negative threshold
 * @param acceleration
 * @param value
 */
StrokeDetector.prototype.updateThresholds = function (acceleration, value) {
    var self = this;

    if (value > self.max) {
        self.max = value;
        self.maxAt = acceleration.timestamp;
    }
    if (value < self.min) {
        self.min = value;
        self.minAt = acceleration.timestamp;
    }

    // recalculate every 1 second
    if ((acceleration.timestamp - self.checkpoint) <= 1000)
        return;

    self.checkpoint = acceleration.timestamp;

    if (self.positiveMaxs.length === 3) self.positiveMaxs.shift();
    if (self.negativeMaxs.length === 3) self.negativeMaxs.shift();

    self.positiveMaxs.push(self.max);
    self.negativeMaxs.push(self.min);

    self.max = 0;
    self.min = 0;

    if (self.positiveMaxs.length === 3) {
        self.positiveThreshold =  utils.round2(self.positiveMaxs.avg() * .5);
        self.negativeThreshold = utils.round2(self.negativeMaxs.avg() * .5);
        self.onThresholdChangedListener.apply({}, [acceleration.timestamp
            , self.positiveThreshold, self.negativeThreshold]);
    }
};

/**
 * Filter acceleration based on calibration
 *
 * @param acceleration
 * @returns {number}
 */
StrokeDetector.prototype.filter = function(acceleration) {
    var self = this;
    var factor, adjustment, value;
    if (self.calibration.getPredominant() === 0) {
        factor = self.calibration.getFactorX();
        adjustment = self.calibration.getNoiseX();
        value = acceleration.x;
    } else if (self.calibration.getPredominant() === 1) {
        factor = self.calibration.getFactorY();
        adjustment = self.calibration.getNoiseY();
        value = acceleration.y;
    } else {
        factor = self.calibration.getFactorZ();
        adjustment = self.calibration.getNoiseZ();
        value = acceleration.z;
    }

    return (value - adjustment) * factor;
}

/**
 * Checks if last stroke was tracked before negative threshold and current one is after!
 * @param current
 * @param previous
 * @returns {boolean|*|*}
 */
StrokeDetector.prototype.isAccelerationCrossingThreshold = function(current, previous) {
    return previous != null && current != null && previous.isBiggerThanNegativeThreshold() && current.isSmallerThanOrEquealToNegativeThreshold();
}

StrokeDetector.prototype.findMaxAbovePositiveThreshold = function (events, acceleration, lastStroke) {

    var max = undefined;
    for (var i = 0; i < events.length; i++) {
        if (events[i].isBiggerThanPositiveThreshold()) {
            if (!events[i].isDiscarded() && (!max || events[i].getAcceleration() > max.getAcceleration())) {
                max = events[i];
            }
        }
    }

    if (!max)
        return undefined;

    if (max.getSampleAt() - lastStroke.getSampleAt() <= 300 || acceleration.timestamp - lastStroke.getDetected().getSampleAt() <= 300) {
        // This max won't ever validate... we need to give the chance to the next max to validate a new stroke!!
        max.setDiscarded(true);
        return undefined;
    }

    return max;
}

/**
 * Check if we failed to detect strokes between the last one and current potential stroke
 *
 * @param {Array} events
 * @param {Event} current   current stroke
 * @param {Event} last      previous detected stroke
 * @returns {*}
 */
StrokeDetector.prototype.didWeLostOne = function (events, current, last) {
    var self = this;
    var indexOfCurrent = indexOf(events, current);

    // Search for stroke before max
    var pre = before(after(events.slice(0, indexOfCurrent), 300), 300);
    var post = before(after(events.slice(indexOfCurrent + 1, events.length - 1), 300), 300);
    var data = pre.concat(post);

    if (data.length <= 4)
        return undefined;

    return self.findFuzzyStroke(data, current, last);
};


/**
 * Try to detect strokes that don't cross thresholds, but may feet other criteria
 *
 * @param events
 * @param current   current stroke
 * @param last      last detected stroke
 * @returns {*}
 */
StrokeDetector.prototype.findFuzzyStroke = function (events, current, last) {
    var self = this, cadence, mg;

    var extremity = minAndMax(events);
    var max = extremity.max, min = extremity.min;
    max.setDetected(min);
    max.setFuzzy(true);

    // if max is before current detected stroke, then we may find a lost stroke before current one
    if (max.getSampleAt() < current.getSampleAt()) {
        cadence = self.strokes.cadence();
        mg = magnitude(self.strokes);

        if (self.isValidStroke(max, last, current, cadence, mg)) {
            return {
                stroke: max,
                position: -1
            };
        }
        return undefined;
    }

    // lost is after current
    if (max.getSampleAt() > current.getSampleAt()) {

        cadence = self.strokes.cadence();
        mg = magnitude(self.strokes);


        max.getDetected(current.getDetected());
        var before = new Event(current.getSampleAt(), current.getAcceleration(), current.positiveThreshold, current.negativeThreshold, min);

        // check if lost makes a valid stroke if placed after current
        if (self.isValidStroke(max, before, undefined, cadence, mg)
            // check if current makes a valid stroke with last detected stroke
            && self.isValidStroke(current, last, max, cadence, mg)) {

            current.setDetected(min);
            return {
                stroke: max,
                position: 1
            }
        }

        return undefined;
    }

    return undefined;
}


StrokeDetector.prototype.isValidStroke = function(stroke, before, after, cadence, magnitude) {
    var self = this;
    var log = function (reason) {
        if (self.debug === false) return;
        console.log(self.counter, reason);
    }

    if (!cadence) {
        log('no cadence');
        return false;
    }

    // its within acceptable difference to current cadence
    if (Math.abs((cadence - (stroke.getSampleAt() - before.getSampleAt())) / cadence)>0.4) {
        log('it\'s not within accepetable difference to current cadence; actual: ' + (stroke.getSampleAt() - before.getSampleAt())
            + '; Cadence: ' + cadence + "; variation: "
            + Math.abs((cadence - (stroke.getSampleAt() - before.getSampleAt())) / cadence));
        return false;
    }

    // does not create a stroke whose interval is less than 300 milis
    if (stroke.getSampleAt() - before.getSampleAt() < 300 ||  (after && Math.abs(stroke.getSampleAt() - after.getSampleAt()) < 300)) {
        log('stroke interval would be < 300');
        return false;
    }

    // interval between detected must also be > 300
    if (stroke.getDetected().getSampleAt() - before.getDetected().getSampleAt() < 300) {
        log('interval between detected would be < 300');
        return false;
    }

    if ((stroke.getAcceleration() - stroke.getDetected().getAcceleration()) / magnitude < .8) {
        log('Variation in acceleration is to low to consider a stroke');
        return false;
    }


    return true;
}

/**
 * Ensures that we don't keep events that are older than 3 seconds
 * @param {Array} events
 * @param value
 * @returns {*}
 */
StrokeDetector.prototype.consolidate = function (events, value) {
    var self = this;
    events.push(value);
    if (value.getSampleAt() - events[0].getSampleAt() <= 3000) {
        return events;
    }
    for (var i = (events.length - 1); i >= 0; i--) {
        if (value.getSampleAt() - events[i].getSampleAt() > 3000)
            break;
    }
    if (i > 0)
        events = events.slice(events.length - i);
    return events;
};


StrokeDetector.prototype.calculateSPM = function (strokes) {
    var self = this;

    // if we don't have strokes in the past 3 seconds, set it to zero
    if (self.lastStroke && self.lastEvent && (self.lastEvent.getSampleAt() - self.lastStroke.getDetected().getPosition() > 3000)) {
        return {spm: 0, interval: 0};
    }

    if (strokes.length < SPM_STROKE_COUNT)
        return undefined;

    // --- look for strokes that don't feet well in current stroke rate and discard them (replace by average)
    var c = self.calculateIntervals(strokes);
    var intervals = c.intervals;
    var map = c.map;
    var avg = intervals.avg();
    var updated = false;
    var variance;
    var adjusted = 0;

    for (var i = intervals.length - 1; i >= 0; i--) {
        variance = (avg - intervals[i]) / avg;

        if (variance > 0 && variance >= .4) {

            // after 2 strokes, if post strokes are inline with avg, it's probably because we counted one stroke
            // more than we should
            if (intervals.length - i > 1 && adjusted == 0) {

                var which = self.pickBestMatch(avg, map[i][1], map[i][0]);
                var remove;

                // if best match is 1st, remove second
                if (which === 1) {
                    remove = map[i][0];
                } else {
                    remove = map[i][1];
                }

//                console.log('removing stroke', remove.getStroke());
                map[i][0].setDiscarded(true);
                strokes.splice(indexOf(strokes, remove), 1);

                adjusted = 0;
            } else {
//                console.log('strokes ', map[i][1].getStroke(), map[i][0].getStroke(), 'are probably a single stroke', variance);
            }

            updated = true;
            adjusted++;
            intervals.splice(i, 1);

        } else if (variance < 0 && variance <= -.4) {
            updated = true;
//            console.log('lost strokes between ', map[i][1].getStroke(), map[i][0].getStroke());
            intervals.splice(i, 1);
        }
    }

    if (intervals.length === 0) {
        // happened when stopped rowing and all the intervals were far from the variance!
        return 0;
    }

    if (updated)
        avg = intervals.avg();

    // Calculate stroke rate
    // avg interval between strokes in mili seconds (thus the division by 1000)
    var strokeRate = 60 / (avg / 1000);

//    console.log("spm: ", Math.round(strokeRate), map[0][0].getStroke()
//        , map[1][0].getStroke(), map[2][0].getStroke(), map[3][0].getStroke());
    return {spm: Math.round(strokeRate), interval: avg};
};


/**
 * When we find an extra stroke that does not feet current cadence, we have to eliminate that stroke; this method will
 * decide which stroke (from the 2 that form an interval that is to small) is to be removed
 * @param avg
 * @param first
 * @param second
 * @returns {number}
 */
StrokeDetector.prototype.pickBestMatch = function (avg, first, second) {
    var self = this;
    var positionFirst = indexOf(self.strokes, first);
    var positionSecond = indexOf(self.strokes, second);
    var beforeFirst = self.strokes[positionFirst - 1];
    var afterSecond = self.strokes[positionSecond + 1 ];

    var varianceFirstBefore = Math.abs((avg - (first.getDetected().getPosition() - beforeFirst.getDetected().getPosition())) / avg);
    var varianceFirstAfter = Math.abs((avg - (afterSecond.getDetected().getPosition() - first.getDetected().getPosition())) / avg);

    if (varianceFirstBefore < .4 && varianceFirstAfter < .4)
        return 1;

    var varianceSecondBefore = Math.abs((avg - (second.getDetected().getPosition() - beforeFirst.getDetected().getPosition())) / avg);
    var varianceSecondAfter = Math.abs((avg - (afterSecond.getDetected().getPosition() - second.getDetected().getPosition())) / avg);

    if (varianceSecondBefore < .4 && varianceSecondAfter < .4)
        return 2;

    if ((varianceFirstBefore + varianceFirstAfter) < (varianceSecondBefore + varianceSecondAfter)) {
        return 1;
    } else {
        return 2;
    }
};

/**
 * Calculate interval between strokes
 */
StrokeDetector.prototype.calculateIntervals = function (strokes) {
    var self = this, intervals = [], map = [];
    for (var i = 1, length = strokes.length; i < length; i++) {
        map.push([strokes[i], strokes[i - 1]]);
        // use minimums to calculate intervals (instead of max's) because they are tipically more stable!
        // use position, given that position assigns a middle position between all accelerations bellow negative threshold
        intervals.push(strokes[i].getDetected().getPosition() - strokes[i - 1].getDetected().getPosition());
    }
    return {
        intervals: intervals,
        map: map
    };
}



// Event
function Event(timestamp, acceleration, pt, nt, detected) {
    this._timestamp = timestamp;
    this._acceleration = acceleration;
    this._positiveThreshold = pt;
    this._negativeThreshold = nt;
    this._detected = detected;
    this._fuzzy = false;
    this._positions = [];
    this._stroke = -1;
    this._discarded = false;
}

Event.prototype.getSampleAt = function() {
    return this._timestamp;
};

Event.prototype.getAcceleration = function() {
    return this._acceleration;
};

Event.prototype.isSmallerThanOrEquealToNegativeThreshold = function () {
    return this._acceleration <= this._negativeThreshold;
};

Event.prototype.isBiggerThanNegativeThreshold = function () {
    return this._acceleration > this._negativeThreshold;
};

Event.prototype.isBiggerThanPositiveThreshold = function () {
    return this._acceleration > this._positiveThreshold;
};

Event.prototype.setDetected = function (detected) {
    this._detected = detected;
};

Event.prototype.getDetected = function () {
    return this._detected;
};

Event.prototype.setStroke = function (stroke) {
    this._stroke = stroke;
};

Event.prototype.getStroke = function() {
    return this._stroke;
};

Event.prototype.setFuzzy = function (fuzzy) {
    this._fuzzy = fuzzy;
};

Event.prototype.isFuzzy = function () {
    return this._fuzzy === true;
};

Event.prototype.add = function (event) {
    this._positions.push(event);
};

Event.prototype.setDiscarded = function (discarded) {
    this._discarded = discarded;
}

Event.prototype.isDiscarded = function () {
    return this._discarded;
}

Event.prototype.getPosition = function() {
    if (this._positions.length > 2) {
        return this._positions[Math.floor(this._positions.length / 2)].getSampleAt();
    } else {
        return this.getSampleAt();
    }
};

Event.prototype.relocate = function (before) {
    for (var i = 0; i < this._positions.length; i++) {
        if (this._positions[i].getSampleAt() > before.getSampleAt()) {
            this._positions.splice(i);
            return;
        }
    }
}


Array.prototype.avg = function () {
    if (this.length ===0) return 0;
    var value = 0;
    for (var i = 0; i < this.length; i++) {
        value += this[i];
    }
    return value / this.length;
};


// calculates cadence based on 5 strokes
Array.prototype.cadence = function() {
    if (this.length < 5) return undefined;
    var data = this.slice(0), i = 0, total = 0, current, previous;
    for (var j = data.length; i <= 5; j--) {
        current = data[j];
        if (!previous) {
            previous = current;
            i++;
            continue;
        }

        total += previous.getSampleAt() - current.getSampleAt();

        previous = current;
        i++;
    }

    return total / (i - 1);
};


/**
 *
 * @param events
 * @param value
 * @returns {number}
 */
function indexOf(events, value) {
    if (events.length === 0) return -1;

    for (var i = 0; i < events.length; i++) {
        if (events[i] === value) {
            return i;
        }
    }
    return -1;
}



/**
 * remove all events until 300 milis have passed
 * @param list
 * @param milis
 */
function after(list, milis) {
    if (list.length == 0)
        return [];

    var first = list[0].getSampleAt();
    for (var i = 0; i < list.length; i++) {

        if (list[i].getSampleAt() > first + milis)
            break;
    }
    return list.slice(i, list.length);
}

/**
 * Remove from end
 *
 * @param list
 * @param milis
 * @returns {Array}
 */
function before(list, milis) {
    if (list.length == 0)
        return [];
    var last = list[list.length - 1].getSampleAt();
    for (var i = (list.length - 1); i >= 0; i--) {

        if (list[i].getSampleAt() < last - milis)
            break;
    }
    return list.slice(0, i);
}

/**
 * calculate min and max from a list of events
 * @param events
 */
function minAndMax(events) {
    // search max and min in events
    var max = events[0], min = events[0];
    for (var i = 0; i < events.length; i++) {

        if (events[i].getAcceleration() > max.getAcceleration()) {
            max = events[i];
        }

        if (events[i].getAcceleration() < min.getAcceleration()) {
            min = events[i];
        }
    }

    return {
        min: min,
        max: max
    }
}

function magnitude(strokes) {
    var magnitude = 0;
    var i;
    for (i = 0; i < strokes.length; i++) {
        magnitude += strokes[i].getAcceleration() - strokes[i].getDetected().getAcceleration();
    }
    return magnitude / i;
}

exports.StrokeDetector = StrokeDetector;
