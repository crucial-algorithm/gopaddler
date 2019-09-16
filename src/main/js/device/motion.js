function MotionSensor(calibration, isPortraitMode) {

    this.hasSupport = !!window.DeviceOrientationEvent;
    this.calibration = calibration;
    this.isPortraitMode = !!isPortraitMode;

    this.alpha = [];
    this.gamma = [];
    this.beta = [];

    this.leftToRightListener = function(){};

    this.offset = null;

}

MotionSensor.prototype.start = function(offset) {
    if (!this.hasSupport) return;
    this.offset = offset;
    this.eventHandler = this.handler.bind(this);
    window.addEventListener("deviceorientation", this.eventHandler , true);
};


MotionSensor.prototype.stop = function() {
    if (!this.hasSupport) return;
    window.removeEventListener("deviceorientation", this.eventHandler, true);
};

MotionSensor.prototype.handler = function (event) {
    var now = Date.now() - this.offset;
    // alpha: rotation around z-axis
    this.alpha.push({time: now, value: event.alpha});
    // gamma: rotation around y axis
    this.gamma.push({time: now, value: event.gamma});
    // beta: rotation around x axis
    this.beta.push({time: now, value: event.beta});

    this.handleListeners();
};

MotionSensor.prototype.read = function () {
    var rotation = [] // discarding rotation for now, until we find a way to use it properly
        , frontToBack, leftToRight;

    if (this.isPortraitMode) {
        frontToBack = compute(this.beta, this.calibration.getBeta());
        leftToRight = compute(this.gamma, this.calibration.getGamma());
    } else {
        frontToBack = compute(this.gamma, this.calibration.getGamma());
        leftToRight = compute(this.alpha, this.calibration.getAlpha());
    }

    this.alpha = [];
    this.gamma = [];
    this.beta = [];

    return leftToRight.join(';') + '|' + frontToBack.join(';') + '|' + rotation.join(';');
};

/**
 *
 */
MotionSensor.prototype.handleListeners = function () {
    var measures = this.isPortraitMode ? this.gamma : this.alpha,  length = measures.length;
    if (length < 2) return;

    var previous = measures[length - 2], current = measures[length - 1];
    if ((previous.value < 0 && current.value < 0) || (previous.value  >= 0 && current.value >= 0)) return;

    if (current.value < 0) {
        this.leftToRightListener.apply({}, [{left: true, right: false}]);
    } else if (current.value > 0) {
        this.leftToRightListener.apply({}, [{left: false, right: true}]);
    } else {
        this.leftToRightListener.apply({}, [{left: false, right: false}]);
    }
};


/**
 * listen to left/right changes
 * @param {function} callback
 */
MotionSensor.prototype.listenLeftToRight = function (callback) {
    this.leftToRightListener = callback;
};


MotionSensor.prototype.getCalibration = function () {
    var avg = function (list) {
        var total = 0, length = list.length;
        if (length === 0) return null;
        for (var i = 0; i < length; i++) {
            total += list[i].value;
        }
        return total / length;
    };

    return {
        alpha: avg(this.alpha),
        beta: avg(this.beta),
        gamma: avg(this.gamma)
    }
};


/**
 * Calculate positive and negative max with data array (used for left/right and front-back)
 * @param {{time: number, value: number}[]} measures
 * @param {number} adjustment
 * @return {*}
 */
function compute(measures, adjustment) {
    var max = 0, position = null, previousBellowZero = measures[0] < 0, compute = [];
    for (var i = 0, l = measures.length; i < l; i++) {
        var when = measures[i].time;
        var value = measures[i].value - adjustment;
        if (Math.abs(value) > Math.abs(max)) {
            position = when;
            max = value;
        }

        if (value >= 0 && previousBellowZero === true || value < 0 && previousBellowZero === false) {
            compute.push({time: position, value: max});
            max = 0;
        }

        previousBellowZero = value < 0;
    }

    if (compute.length > 0 && compute[compute.length - 1].position < measures.length - 1) {
        compute.push({time: position, value: max});
    }

    return compute.map(function (record) {
        return [record.time, Math.floor(record.value)].join('&')
    });
}


exports.MotionSensor = MotionSensor;