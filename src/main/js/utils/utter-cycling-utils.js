import KalmanFilter from 'kalmanjs';

export class UtterCyclingUtils {
    /**
     *
     * @param {Array<SessionDetail>} records
     */
    static calculateElevationGain(records) {
        let filter = new KalmanFilter({R: 2, Q: 0.8});
        let previous = null, total = 0, started = false;
        for (let r of records) {
            if (isNaN(r.altitude) || r.altitude === 0 && started === false) continue;

            if (r.altitude !== 0 && started === false) {
                started = true;
                previous = r.altitude;
                continue;
            }
            let altitude = Math.floor(filter.filter(r.altitude));

            if (previous === null) {
                previous = altitude;
                continue;
            }
            let gain = altitude - previous;
            total += gain > 0 ? gain : 0;
            previous = altitude;
        }
        console.log("===> [gain] ", total);
        return Math.round(total);
    }
}