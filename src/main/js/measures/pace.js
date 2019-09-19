'use strict';

import Utils from '../utils/utils';

class Pace {
    constructor(convertToImperial) {
        this.value = 0;
        this.convertToImperial = convertToImperial;
    }

    calculate(speed) {
        let value = Utils.speedToPace(speed, this.convertToImperial);
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
