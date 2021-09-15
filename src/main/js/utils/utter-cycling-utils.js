import KalmanFilter from 'kalmanjs';
import Utils from "./utils";

export class UtterCyclingUtils {
    /**
     *
     * @param {Array<SessionDetail>} records
     */
    static calculateElevationGain(records) {
        let filter = new KalmanFilter({R: .00048, Q: 0.8});
        const altitudes = Utils.collapseMetrics(100, records.map((r) => {
            return {
                ...r,
                altitude: isNaN(r.altitude) || r.altitude === 0 ? null : Math.floor(filter.filter(r.altitude))
            }
        }), records[0].timestamp - 1000).map((r) => r.altitude)
        let previous = null, total = 0, started = false;
        const discard = new Array(10);

        for (let altitude of altitudes) {
            if (isNaN(altitude) || altitude === 0 && started === false) continue;

            if (altitude !== 0 && started === false) {
                started = true;
                previous = altitude;
                continue;
            }

            if (previous === null) {
                previous = altitude;
                continue;
            }

            discard.pop();
            if (discard.length > 0) {
                previous = altitude;
                continue;
            }
            const gain = altitude - previous;
            total += gain > 0 ? gain : 0;
            previous = altitude;
        }
        console.log("===> [gain] ", total);
        return Math.round(total);
    }
}