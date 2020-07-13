import {UtterCyclingUtils} from "../utils/utter-cycling-utils";
import Context from "../context";
import GpChart from "../utils/widgets/chart";
import Utils from "../utils/utils";

export default class UtterCycling {
    /**
     *
     * @param {Session} session
     * @param {Array<SessionDetail>} records
     * @param {Context} context
     */
    constructor(session, records, context) {
        this._session = session;
        this._records = records;
        this._context = context;
        UtterCyclingUtils.calculateElevationGain(records);
    }

    /**
     *
     * @param {function} template
     * @param {Element} container
     */
    render(template, container) {
        Context.render(container, template({}));

        setTimeout(() => {
            this.loadCharts(this.records);
        }, 0);

    }

    /**
     *
     * @param {Array<SessionDetail>} metrics
     */
    loadCharts(metrics) {
        const self = this;
        let labels = [], altitude = [], speed = [], cadence = [], heartRate = [], last = 0, step = null;

        let min = null;
        for (let record of metrics) {
            let value = record.altitude;
            if (value === undefined) {
                continue;
            }
            if (min === null || value < min) {
                min = value;
            }
        }

        let i = 0;
        let values = this.reduce(metrics);
        values.map(function (detail) {
            i++;
            let distance = detail.distance;

            labels.push(detail.distance);
            altitude.push(self.context.displayMetric(Context.FIELD_TYPES().ELEVATION, detail.altitude - (min !== null ? min : 0)));
            speed.push(self.context.displayMetric(Context.FIELD_TYPES().SPEED, detail.speed));
            cadence.push(detail.cadence > 300 ? 0 : detail.cadence);
            heartRate.push(detail.heartRate);

            last = distance;
        });

        let labelsToShow = {};

        /**@type ChartOptions */
        let options = {
            /**@type ChartLabelOptions*/
            labels: {
                display: false
            },
            displayYAxisGridLines: true,
            displayXAxisGridLines: true,
            xAxisLabelMaxRotation: 0,
            paddingLeft: 10,
            paddingRight: 10,
            xAxisLabelCallback: (label, context) => {
                const value = Math.floor(label / 10);
                if (value === 0) return null;
                if (step === null && last > 0) {
                    let consideredGlobalDistance = Math.floor(last / 100) * 10;
                    step = Math.floor( consideredGlobalDistance / 10);
                }
                if (value % step !== 0) return null;
                if (labelsToShow[value] === true) return null;
                labelsToShow[value] = true;
                return value;
            }

        };

        new GpChart(document.getElementById('cycling-altitude'), GpChart.TYPES().LINE, labels
            , GpChart.dataset(altitude)
            , options, false);
        labelsToShow = {}

        let dataSetAltitudeSecondary = GpChart.dataset(altitude, GpChart.YAxis().SECOND);

        new GpChart(document.getElementById('cycling-speed'), GpChart.TYPES().LINE, labels
            , [GpChart.dataset(speed), dataSetAltitudeSecondary]
            , options, true);
        labelsToShow = {}
        new GpChart(document.getElementById('cycling-cadence'), GpChart.TYPES().LINE, labels
            , [GpChart.dataset(cadence), dataSetAltitudeSecondary]
            , options, true);
        labelsToShow = {}
        new GpChart(document.getElementById('cycling-heart-rate'), GpChart.TYPES().LINE, labels
            , [GpChart.dataset(heartRate), dataSetAltitudeSecondary]
            , options, true);

    }


    /**
     * Reduce metrics to 1 per 100 meters in metric system, 1 per 528 meters in imperial
     *
     * {Array<SessionDetail>} metrics
     * @return {[{altitude: number, speed: number, cadence: number, hearRate: number}]}
     */
    reduce(metrics) {
        let result = [];
        for (let metric of metrics) {
            let distance = metric.distance;
            if (this.context.isImperial()) {
                distance = Math.floor(Utils.meterToFeet(distance * 1000) / 528); // 1/10 mile
            } else {
                distance = Math.floor(distance * 10); // scale is hectometre
            }

            let stats = result[distance];
            if (!stats) stats = {
                distance: distance,
                altitude: 0,
                speed: 0,
                cadence: 0,
                heartRate: 0
            };

            result[distance] = {
                distance: distance,
                altitude: Math.max(stats.altitude, metric.altitude),
                speed: Math.max(stats.speed, metric.speed),
                cadence: Math.max(stats.cadence, metric.spm),
                heartRate: Math.max(stats.heartRate, metric.heartRate)
            }
        }

        return result;
    }

    get session() {
        return this._session;
    }

    get records() {
        return this._records;
    }

    get context() {
        return this._context;
    }
}