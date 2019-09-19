'use strict';

class StrokeEfficiency {
    constructor() {
    }

    static calculate(speed, interval) {
        if (speed === undefined || speed === 0) return 0;

        // No strokes detected... set to zero
        if (interval === undefined || interval === 0) {
            return 0;
        }

        let metersPerSecond = (speed * 1000) / 60 / 60;
        return metersPerSecond * (interval / 1000);
    }

    static calculatePer100(displacement) {
        if (displacement === 0) return 0;
        let strokes = Math.round(100 / displacement * 10) / 10;
        return strokes > 300 ? 0 : strokes;
    }
}


export default StrokeEfficiency;