'use strict'

function StrokeDetector(sessionId, calibration, onStrokeDetected) {
    var self = this;
    self.watchId = undefined;

    self.acceleration = [];
    self.max = 0;
    self.min = 0;
    self.maxAt = undefined;
    self.minAt = undefined;
    self.maxs = [];
    self.mins = [];
    self.checkpoint = undefined;
    self.positiveMaxs = [];
    self.positiveThresholds = [];
    self.negativeMaxs = [];
    self.negativeThresholds = [];
    self.strokes = [];
    self.events = [];
    self.intervals = [];
    self.lastStroke = new Event(0, 0, 0, 0, /* detected = */ new Event(0, 0, 0, 0, undefined));
    self.counter = 0;
    self.lastEvent = undefined;

    self.intervalId = undefined;
    self.sessionId = sessionId;
    self.debugAcceleration = [];
    this.db = window.localStorage;
    self.calibration = calibration;

    // used in simulation, to represent strokes in chart
    self.onStrokeDetectedListener = onStrokeDetected || function () {};
    self.onStrokeRateChangedListener = function () {};

    initilizeLog();
}

StrokeDetector.exceptions = {
    SD_EXCP_STALLED:  "STALLED"
}

StrokeDetector.prototype.onStrokeRateChanged = function (callback) {
    var self = this;
    self.onStrokeRateChangedListener = callback;
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
        self.onAccelerationTriggered(acceleration, value);

        // for debug only
        self.debugAcceleration.push([acceleration.timestamp, acceleration.x, acceleration.y, acceleration.z, value, self.calibration.getPredominant(), self.calibration.getAngleZ(), self.calibration.getFactorX(), self.calibration.getNoiseX(), self.calibration.getFactorZ(), self.calibration.getNoiseZ(), "\n"].join(','));
        if (self.debugAcceleration.length > 1000) {
            debug(self.debugAcceleration);
            self.debugAcceleration = [];
        }
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
    range = self.strokes.slice(-5);
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
 * Process events comming from accelerometer
 *
 * @param acceleration
 * @param value
 */
StrokeDetector.prototype.onAccelerationTriggered = function (acceleration, value) {
    var self = this, current, stroke;

    if (self.checkpoint === undefined)
        self.checkpoint = acceleration.timestamp;

    value = Math.round2(value);
    self.acceleration.push([acceleration.timestamp, value]);

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
    }

    if (self.positiveMaxs.length < 3 ) return;

    var pt = Math.round2(self.positiveMaxs.avg() * .5);
    var nt = Math.round2(self.negativeMaxs.avg() * .5);
    self.positiveThresholds.push([acceleration.timestamp, pt]);
    self.negativeThresholds.push([acceleration.timestamp, nt]);

    current = new Event(acceleration.timestamp, value, pt, nt, undefined);

    if (self.isAccelerationCrossingThreshold(current, self.lastEvent) && (stroke = self.findStroke(self.events, acceleration, self.lastStroke)) !== undefined) {
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
        else if (lost.getSampleAt() < stroke.getSampleAt()) {

            // add lost
            self.counter++;
            lost.setStroke(self.counter);
            self.strokes.push(lost);
            self.onStrokeDetectedListener(lost);

            // add current
            self.counter++;
            stroke.setStroke(self.counter);
            self.strokes.push(stroke);
            self.onStrokeDetectedListener(stroke);

            self.lastStroke = stroke;

        } else {
            // lost is after current

            // add current
            self.counter++;
            stroke.setStroke(self.counter);
            self.strokes.push(stroke);
            self.onStrokeDetectedListener(stroke);

            // add lost
            self.counter++;
            lost.setStroke(self.counter);
            self.strokes.push(lost);
            self.onStrokeDetectedListener(lost);

            self.lastStroke = lost;
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
    if (self.calibration.getPredominant() == 'X') {
        factor = self.calibration.getFactorX();
        adjustment = self.calibration.getNoiseX();
        value = acceleration.x;
    } else {
        factor = self.calibration.getFactorZ();
        adjustment = self.calibration.getNoiseZ();
        value = acceleration.z
    }

    return (value - adjustment) * factor;
}

StrokeDetector.prototype.isAccelerationCrossingThreshold = function(current, previous) {
    return previous != null && current != null && previous.isBiggerThanNegativeThreshold() && current.isSmallerThanOrEquealToNegativeThreshold();
}

StrokeDetector.prototype.findStroke = function (events, acceleration, lastStroke) {

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
 * Check if we failed to detect strokes between the last one detected and current one
 *
 * @param {Array} events
 * @param {Event} last
 * @returns {*}
 * @param {Event} current
 */
StrokeDetector.prototype.didWeLostOne = function (events, current, last) {
    var self = this;
    var cadence = self.strokes.cadence();

    // check if either the interval between last stroke and current one is close to cadence or if the duration of current stroke (detect - max) is close to cadence
//    if (Math.round2((current.getSampleAt() - last.getSampleAt()) / cadence) < 1.7 && Math.round2((current.getDetected().getSampleAt() - current.getSampleAt()) / cadence) < 1.7) return undefined;

    // Search for stroke before max
    var data = events.slice(0, events.indexOf(current));
    data = data.after(300).before(300);

    var lost;
    if (data.length > 4 && (lost = self.findFuzzyStroke(data, current, last, cadence)))
        return lost;

    // search for stroke after max
    data = events.slice(events.indexOf(current) + 1, events.length);
    data = data.after(300).before(300);

    if (data.length > 4 && (lost = self.findFuzzyStroke(data, current, last, cadence)))
        return lost;

    return undefined;
}


/**
 * Try to detect strokes that don't actually cross thresholds
 *
 * @param data
 * @param current
 * @param last
 * @param cadence
 * @returns {*}
 */
StrokeDetector.prototype.findFuzzyStroke = function (data, current, last, cadence) {
    var self = this;

    // search max and for a min after 1st max
    var max = data[0], min = data[0];
    for (var i = 0; i < data.length; i++) {

        if (data[i].getAcceleration() > max.getAcceleration()) {
            max = data[i];
        }

        if (data[i].getAcceleration() < min.getAcceleration()) {
            min = data[i];
        }

    }

    if (min.getSampleAt() > max.getSampleAt()) { // lost a full stroke!!

        max.setDetected(min);
        if (self.isValidStroke(max, self.lastStroke, cadence, current)) {
            return max;
        }

    } else { // we probably have two split current in two!

        var first = new Event(current.getSampleAt(), current.getAcceleration(), current.positiveThreshold, current.negativeThreshold, min);
        var second = max;
        second.setDetected(current.getDetected());

        if (self.isValidStroke(first, self.lastStroke, cadence, second) && self.isValidStroke(second, first, cadence, undefined)) {
            current.setDetected(min);
            return max;
        }

    }

    return undefined;
}


StrokeDetector.prototype.isValidStroke = function(stroke, before, cadence, after) {
    var self = this;
    if (cadence
        // its within acceptable difference to current cadence
        && ((cadence - (stroke.getSampleAt() - before.getSampleAt())) / cadence) <= .4

        // does not create a stroke whose interval is less than 300 milis
        && stroke.getSampleAt() - before.getSampleAt() > 300 && (!after || Math.abs(stroke.getSampleAt() - after.getSampleAt()) > 300)

        // interval between detected must also be > 300
        && stroke.getDetected().getSampleAt() - before.getDetected().getSampleAt() > 300

        // interval between max and detection (min) must be at least half of what we consider the fastest stroke
        && stroke.getDetected().getSampleAt() - stroke.getSampleAt() > 300/2

        ) {
        return true;
    }
    return false;
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
        log([(new Date).getTime(), 0, "\n"].join(','));
        return 0;
    }

    if (strokes.length < 5)
        return;

    // --- look for strokes that don't feet well in current stroke rate and discard them (replace by average)
    var intervals = self.calculateIntervals(strokes);
    var avg = intervals.avg();
    var updated = false;
    var interval;

    var logA = intervals.join(','), logB;
    for (var i = 0; i < intervals.length; i++) {
        if (intervals[i] / avg < .7 || intervals[i] / avg > 1.6) {
//            console.log('looks liks ', strokes[i + 1].getStroke(), ' is out of sync');
            updated = true;
            interval = Math.round(avg);
            intervals[i] = interval;
        }
    }
    logB = intervals.join(',');

    if (updated)
        avg = intervals.avg();

    // Calculate stroke rate
    // avg interval between strokes in mili seconds (thus the division by 1000)
    var strokeRate = 60 / (avg / 1000);

    log([new Date().getTime(), Math.round(strokeRate), logA, '-', logB, "\n"].join(','));
    return Math.round(strokeRate);
}

/**
 * Assumes that we have 5 strokes to use
 */
StrokeDetector.prototype.calculateIntervals = function (strokes) {
    var self = this, intervals = [];
    for (var i = 1, length = strokes.length; i < length; i++) {
        intervals.push(strokes[i].getSampleAt() - strokes[i - 1].getSampleAt());
    }
    return intervals;
}






// Event
function Event (timestamp, acceleration, pt, nt, detected) {
    this.timestamp = timestamp;
    this.acceleration = acceleration;
    this.positiveThreshold = pt;
    this.negativeThreshold = nt;
    this.detected = detected;
}

Event.prototype.getSampleAt = function() {
    return this.timestamp;
};

Event.prototype.getAcceleration = function() {
    return this.acceleration;
};

Event.prototype.isSmallerThanOrEquealToNegativeThreshold = function () {
    return this.acceleration <= this.negativeThreshold;
}
Event.prototype.isBiggerThanNegativeThreshold = function () {
    return this.acceleration > this.negativeThreshold;
}

Event.prototype.isBiggerThanPositiveThreshold = function () {
    return this.acceleration > this.positiveThreshold;
};

Event.prototype.setDetected = function (detected) {
    this.detected = detected;
}

Event.prototype.getDetected = function () {
    return this.detected;
}

Event.prototype.setStroke = function (stroke) {
    this.stroke = stroke;
}

Event.prototype.getStroke = function() {
    return this.stroke;
}


var fsFail = function(err) {
    console.log('fs fail', err);
}

var debugFile, logFile;
function initilizeLog() {

    var success = function (dir) {
        var ts = new Date().getTime();
        dir.getFile("debug-" + ts, {create: true}, function (file) {
            debugFile = file;
        });
        dir.getFile("sr-" + ts, {create: true}, function (file) {
            logFile = file;
        });
    };

    if (window.resolveLocalFileSystemURL)
        window.resolveLocalFileSystemURL("cdvfile://localhost/sdcard/paddler/", success, function fail() {
            createDirectory(initilizeLog);
        });
}


function createDirectory(callback) {
    var root;
    var gotFS = function (fileSystem) {
        root = fileSystem.root;
        root.getDirectory("paddler", {create: true}, callback, fsFail);
    };

    var SD_CARD = 7;
    window.requestFileSystem(SD_CARD, 0, gotFS, fsFail);
}


function write(file, str) {
    if(!file) return;
    console.log("going to log " + str);
    file.createWriter(function (fileWriter) {

        fileWriter.seek(fileWriter.length);

        var blob = new Blob([str], {type: 'text/plain'});
        fileWriter.write(blob);
    }, function fail() {
        console.log("write to log failed");
    });
}

function debug(str) {
    write(debugFile, str);
}

function log(str) {
    write(logFile, str);
}