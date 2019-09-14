function MotionSensor(calibration) {

    this.hasSupport = !!window.DeviceOrientationEvent;
    this.calibration = calibration;

    this.rotation = [];
    this.leftToRight = [];
    this.frontToBack = [];

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
    window.removeEventListener("deviceorientation", this.eventHandler);
};

MotionSensor.prototype.handler = function (event) {
    var now = Date.now() - this.offset;
    // alpha: rotation around z-axis
    this.rotation.push({time: now, value: event.alpha});
    // gamma: left to right
    this.leftToRight.push({time: now, value: event.gamma});
    // beta: front back motion
    this.frontToBack.push({time: now, value: event.beta});
};

MotionSensor.prototype.read = function () {
    var rotation = compute(this.rotation, this.calibration.getAlpha());
    var frontToBack = compute(this.frontToBack, this.calibration.getBeta());
    var leftToRight = compute(this.leftToRight, this.calibration.getGamma());

    this.rotation = [];
    this.frontToBack = [];
    this.leftToRight = [];

    console.log(leftToRight.join(';') + '|' + frontToBack.join(';') + '|' + rotation.join(';'));
    return leftToRight.join(';') + '|' + frontToBack.join(';') + '|' + rotation.join(';');
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