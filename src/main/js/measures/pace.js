'use strict';
const utils = require('../utils/utils');

class Pace {
    constructor(convertToImperial) {
        this.value = 0;
        this.convertToImperial = convertToImperial;
    }

    calculate(speed) {
        let value = utils.speedToPace(speed);
        if (value === null) {
            return 0;
        }

        this.value = value;
        return value;
    }

    getValue() {
        return this.value;
    }
}

export default Pace;
