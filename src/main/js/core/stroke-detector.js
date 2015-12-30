'use strict'

var utils = require('../utils/utils');

var SPM_STROKE_COUNT = 8;

function StrokeDetector(session, calibration, onStrokeDetected, onAccelerationTriggered) {
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
    self.strokes = [];
    self.events = [];
    self.intervals = [];
    self.lastStroke = new Event(0, 0, 0, 0, /* detected = */ new Event(0, 0, 0, 0, undefined));
    self.counter = 0;
    self.lastEvent = undefined;

    self.intervalId = undefined;
    self.session = session;
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
}

StrokeDetector.prototype.onStrokeRateChanged = function (callback) {
    var self = this;
    self.onStrokeRateChangedListener = callback;
}

StrokeDetector.prototype.onAccelerationTriggered = function (callback) {
    var self = this;
    self.onAccelerationTriggeredListener = callback;
}

StrokeDetector.prototype.onThresholdChanged = function (callback) {
    var self = this;
    self.onThresholdChangedListener = callback;
}

StrokeDetector.prototype.onStrokeDetected = function (callback) {
    var self = this;
    self.onStrokeDetectedListener = callback;
}

StrokeDetector.prototype.stop = function () {
    var self = this;
    navigator.accelerometer.clearWatch(self.watchId);
    clearInterval(self.intervalId);
}

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

    self.intervalId = setInterval(self.refreshSPM.bind(self), 1500);
}


StrokeDetector.prototype.refreshSPM = function () {
    var self = this, range, strokeRate;
    range = self.strokes.slice(-SPM_STROKE_COUNT);
    strokeRate = self.calculateSPM(range);
    self.onStrokeRateChangedListener(strokeRate);
    self.strokes = range;

    if (strokeRate === 0) {
        self.onStrokeRateChangedListener(0);
        self.strokes = [];
    }
    return strokeRate;
}


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

    if (value > self.max) {
        self.max = value;
        self.maxAt = acceleration.timestamp;
    }
    if (value < self.min) {
        self.min = value;
        self.minAt = acceleration.timestamp;
    }

    // recalculate thresholds every 1 sec
    if ((acceleration.timestamp - self.checkpoint) > 1000) {
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
    }

    if (self.positiveMaxs.length < 3 ) return;

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

    self.lastEvent = current;
}

/**
 * Filter acceleration based on calibration
 *
 * @param acceleration
 * @returns {number}
 */
StrokeDetector.prototype.filter = function(acceleration) {
    var self = this;
    var factor, adjustment, value;
    if (self.calibration.getPredominant() == 0) {
        factor = self.calibration.getFactorX();
        adjustment = self.calibration.getNoiseX();
        value = acceleration.x;
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
            if (!max || events[i].getAcceleration() > max.getAcceleration()) {
                max = events[i];
            }
        }
    }

    if (!max)
        return undefined;

    if (max.getSampleAt() - lastStroke.getSampleAt() <= 300 || acceleration.timestamp - lastStroke.getDetected().getSampleAt() <= 300)
        return undefined;

    return max;
}

/**
 * Check if we failed to detect strokes between the last one and current potential stroke
 *
 * @param {Array} events
 * @param {Event} last
 * @returns {*}
 * @param {Event} current
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
 * @param current
 * @param last
 * @returns {*}
 */
StrokeDetector.prototype.findFuzzyStroke = function (events, current, last) {
    var self = this, cadence, mg;

    var extremity = minAndMax(events);
    var max = extremity.max, min = extremity.min;
    max.setDetected(min);
    max.setFuzzy(true);

    // lost is before current
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
}


StrokeDetector.prototype.calculateSPM = function (strokes) {
    var self = this;

    // if we don't have strokes in the past 3 seconds, set it to zero
    if (self.lastStroke && self.lastEvent && (self.lastEvent.getSampleAt() - self.lastStroke.getSampleAt() > 3000)) {
        return 0;
    }

    if (strokes.length < SPM_STROKE_COUNT)
        return;

    // --- look for strokes that don't feet well in current stroke rate and discard them (replace by average)
    var c = self.calculateIntervals(strokes);
    var intervals = c.intervals;
    var map = c.map;
    var avg = intervals.avg();
    var updated = false;
    var interval;
    var variance;

    for (var i = 0; i < intervals.length; i++) {
        variance = (avg - intervals[i]) / avg;
        if (variance > 0 && variance >= .4) {
            updated = true;
            console.log('strokes ', map[i][1].getStroke(), map[i][0].getStroke(), 'are probably a single stroke', variance);

            interval = Math.round(avg);
            intervals[i] = interval;

        } else if (variance < 0 && variance <= -.4) {
            updated = true;
            console.log('lost strokes between ', map[i][1].getStroke(), map[i][0].getStroke());
            interval = Math.round(avg);
            intervals[i] = interval;

        }
    }

    if (updated)
        avg = intervals.avg();

    // Calculate stroke rate
    // avg interval between strokes in mili seconds (thus the division by 1000)
    var strokeRate = 60 / (avg / 1000);

    return Math.round(strokeRate);
}

/**
 * Calculate interval between strokes
 */
StrokeDetector.prototype.calculateIntervals = function (strokes) {
    var self = this, intervals = [], map = [];
    for (var i = 1, length = strokes.length; i < length; i++) {
        map.push([strokes[i], strokes[i - 1]]);
        intervals.push(strokes[i].getSampleAt() - strokes[i - 1].getSampleAt());
    }
    return {
        intervals: intervals,
        map: map
    };
}




// Event
function Event(timestamp, acceleration, pt, nt, detected) {
    this.timestamp = timestamp;
    this.acceleration = acceleration;
    this.positiveThreshold = pt;
    this.negativeThreshold = nt;
    this.detected = detected;
    this.fuzzy = false;
}

Event.prototype.getSampleAt = function() {
    return this.timestamp;
};

Event.prototype.getAcceleration = function() {
    return this.acceleration;
};

Event.prototype.isSmallerThanOrEquealToNegativeThreshold = function () {
    return this.acceleration <= this.negativeThreshold;
};

Event.prototype.isBiggerThanNegativeThreshold = function () {
    return this.acceleration > this.negativeThreshold;
};

Event.prototype.isBiggerThanPositiveThreshold = function () {
    return this.acceleration > this.positiveThreshold;
};

Event.prototype.setDetected = function (detected) {
    this.detected = detected;
};

Event.prototype.getDetected = function () {
    return this.detected;
};

Event.prototype.setStroke = function (stroke) {
    this.stroke = stroke;
};

Event.prototype.getStroke = function() {
    return this.stroke;
};

Event.prototype.setFuzzy = function (fuzzy) {
    this.fuzzy = fuzzy;
};

Event.prototype.isFuzzy = function () {
    return this.fuzzy === true;
};


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