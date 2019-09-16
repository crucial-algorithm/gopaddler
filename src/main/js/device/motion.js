function MotionSensor(calibration) {

    this.hasSupport = !!window.DeviceOrientationEvent;
    this.calibration = calibration;

    this.rotation = [];
    this.leftToRight = [];
    this.frontToBack = [];

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
    this.rotation.push({time: now, value: event.alpha});
    // gamma: left to right
    this.leftToRight.push({time: now, value: event.gamma});
    // beta: front back motion
    this.frontToBack.push({time: now, value: event.beta});

    this.handleListeners();
};

MotionSensor.prototype.read = function () {
    var rotation = compute(this.rotation, this.calibration.getAlpha());
    var frontToBack = compute(this.frontToBack, this.calibration.getBeta());
    var leftToRight = compute(this.leftToRight, this.calibration.getGamma());

    this.rotation = [];
    this.frontToBack = [];
    this.leftToRight = [];

    return leftToRight.join(';') + '|' + frontToBack.join(';') + '|' + rotation.join(';');
};

/**
 *
 */
MotionSensor.prototype.handleListeners = function () {
    var length = this.leftToRight.length;
    if (length < 2) return;

    var previous = this.leftToRight[length - 2], current = this.leftToRight[length - 1];
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
        alpha: avg(this.rotation),
        beta: avg(this.frontToBack),
        gamma: avg(this.leftToRight)
    }
};


/**
 * Calculate positive and negative max with data array (used for left/right and front-back)
 * @param data
 * @param adjustment
 * @return {*}
 */
function compute(data, adjustment) {
    var max = 0, position = null, previousBellowZero = data[0] < 0, compute = [];
    for (var i = 0, l = data.length; i < l; i++) {
        var when = data[i].time;
        var value = data[i].value - adjustment;
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

    if (compute.length > 0 && compute[compute.length - 1].position < data.length - 1) {
        compute.push({time: position, value: max});
    }

    return compute.map(function (record) {
        return [record.time, Math.floor(record.value)].join('&')
    });
}


exports.MotionSensor = MotionSensor;