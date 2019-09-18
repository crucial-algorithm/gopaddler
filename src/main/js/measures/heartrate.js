'use strict';

class HeartRate {
    constructor() {
        this.value = 0;
    }

    calculate(heartRateMeasure) {
        // @TODO: implement some smoothing logic
        this.value = heartRateMeasure;

        return this.value;
    }

    reset() {
        this.value = 0;
    }

    getValue() {
        return this.value;
    }
}

export default HeartRate;
