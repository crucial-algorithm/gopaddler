'use strict';


/**
 * Detect device orientation based on https://developer.mozilla.org/en-US/docs/Web/API/Detecting_device_orientation
 * For documentation on the orientation frame (on which this implementation was based, reference this doc:
 *  https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Orientation_and_motion_data_explained
 */
class MotionSensor {

    /**
     *
     * @param {Calibration} calibration
     * @param isPortraitMode
     */
    constructor(calibration, isPortraitMode) {

        this.hasSupport = !!window.DeviceOrientationEvent;
        this.calibration = calibration;
        this.isPortraitMode = !!isPortraitMode;

        this.alpha = [];
        this.gamma = [];
        this.beta = [];

        this.leftToRightListener = function(){};

        this.offset = null;

    }

    /**
     * Start listening
     * @param {number} offset   Session start timestamp, in order to get the precise moment actual data points were
     *                          caught
     */
    start(offset) {
        if (!this.hasSupport) return;
        this.offset = offset;
        this.eventHandler = this.handler.bind(this);
        window.addEventListener("deviceorientation", this.eventHandler , true);
    }

    /**
     * Stop listening
     * @public
     */
    stop() {
        if (!this.hasSupport) return;
        window.removeEventListener("deviceorientation", this.eventHandler, true);
    }

    /**
     * Handle devices' orientation events
     *
     * @private
     * @param {DeviceOrientationEvent} event
     */
    handler(event) {
        let now = Date.now() - this.offset;
        // alpha: rotation around z-axis
        this.alpha.push({time: now, value: event.alpha});
        // gamma: rotation around y axis
        this.gamma.push({time: now, value: event.gamma});
        // beta: rotation around x axis
        this.beta.push({time: now, value: event.beta});

        this.handleListeners();
    }

    /**
     * Method used during session, to retrieve the actual values that are going to be store in session data
     *
     * @public
     * @return {string}
     */
    read() {
        let rotation = [] // discarding rotation for now, until we find a way to use it properly
            , frontToBack, leftToRight;

        if (this.isPortraitMode) {
            frontToBack = this.processEvents(this.beta, this.calibration.beta);
            leftToRight = this.processEvents(this.gamma, 0);
        } else {
            frontToBack = this.processEvents(this.gamma, this.calibration.gamma);
            leftToRight = this.processEvents(this.alpha, this.calibration.alpha);
            // in landscape mode, values are negative to the right and positive to the left: lets revert that;
            leftToRight = leftToRight.map((rec) => {return rec.value * -1});

            const self = this;
            console.log(this.alpha.map((rec) => { return rec.value - self.calibration.alpha }).join(','));
        }

        this.alpha = [];
        this.gamma = [];
        this.beta = [];

        return leftToRight.join(';') + '|' + frontToBack.join(';') + '|' + rotation.join(';');
    }

    /**
     * @private
     */
    handleListeners() {
        let measures = this.isPortraitMode ? this.gamma : this.alpha, length = measures.length;
        let adjustment = this.isPortraitMode ? 0 : this.calibration.alpha;
        let direction = this.isPortraitMode ? 1 : -1;

        if (length < 2) return;

        let previous = measures[length - 2], current = measures[length - 1]
            , previousValue = (previous.value - adjustment) * direction
            , currentValue = (current.value - adjustment) * direction;

        if ((previousValue < 0 && currentValue < 0)
            || (previousValue >= 0 && currentValue >= 0)) return;

        if (currentValue < 0) {
            this.leftToRightListener.apply({}, [{left: true, right: false}]);
        } else if (currentValue > 0) {
            this.leftToRightListener.apply({}, [{left: false, right: true}]);
        } else {
            this.leftToRightListener.apply({}, [{left: false, right: false}]);
        }
    }

    /**
     * listen to left/right changes
     * @param {function} callback
     */
    listenLeftToRight(callback) {
        this.leftToRightListener = callback;
    }

    /**
     * Used during calibration, to get the relative position of the device
     * @public
     * @return {{alpha: *, beta: *, gamma: *}}
     */
    getCalibration() {
        let avg = function (list) {
            let total = 0, length = list.length;
            if (length === 0) return null;
            for (let i = 0; i < length; i++) {
                total += list[i].value;
            }
            return total / length;
        };

        return {
            alpha: avg(this.alpha),
            beta: avg(this.beta),
            gamma: avg(this.gamma)
        }
    }

    /**
     * Calculate positive and negative max with data array (used for left/right and front-back)
     *
     * @param {{time: number, value: number}[]} measures
     * @param {number} adjustment
     *
     * @private
     * @return {String[]}
     */
    processEvents(measures, adjustment) {

        let max = 0, position = null, previousBellowZero = measures[0] < 0, compute = [];
        for (let i = 0, l = measures.length; i < l; i++) {
            let when = measures[i].time;
            let value = measures[i].value - adjustment;
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
}

export default MotionSensor;