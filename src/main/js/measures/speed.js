'use strict';
import KalmanFilter from 'kalmanjs';

class Speed {
    constructor(context) {
        this.weight = context.getGpsRefreshRate() === 0 ? 5 : context.getGpsRefreshRate();
        this.value = 0;
        this.previous = null;
        this.distance = 0;
        this.context = context;
        this.kalmanFilter = new KalmanFilter({R: 2, Q: 0.8});
        this.speeds = [];
    }

    calculate(position) {

        if (this.previous === null) {
            this.previous = position;
            return 0;
        }

        let speed = this.kalmanFilter.filter(position.coords.speed);

        if (this.speeds.length > 5) {
            this.speeds.shift();
        }

        this.speeds.push(speed);
        this.value = this.average();

        this.previous = position;
        return this.value * 3.6;
    }

    reset() {
        this.value = 0;
        this.distance = 0;
    }

    /**
     * @private
     * @return {number|*}
     */
    average() {
        if (this.speeds.length === 0) {
            return 0;
        }

        if (this.weight === 1) {
            return this.speeds[this.speeds.length - 1];
        }

        let count = 0, total = 0, i = this.speeds.length - 1;
        while (i >= 0) {
            total += this.speeds[i];
            count++;
            i--;

            if (count === this.weight) {
                return total / count;
            }
        }

        return total / count;
    }

    /**
     *
     * @param distance
     * @param movingDuration    Duration without pause time
     * @return {number}
     */
    avgSessionSpeed(distance, movingDuration) {
        if (movingDuration === 0 || distance === 0) return 0;
        let value = distance * (3600000 / movingDuration);
        if (isNaN(value)) value = 0;
        return value;
    }

    getValue() {
        return this.value * 3.6;
    }
}

export default Speed;
