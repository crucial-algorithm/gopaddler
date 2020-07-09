import {UtterCyclingUtils} from "../utils/utter-cycling-utils";
import Context from "../context";
import GpChart from "../utils/widgets/chart";
import SessionSummaryIntervals from "./session.summary.intervals";

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
        metrics.map(function (detail) {
            i++;
            let distance = self.context.displayMetric(Context.FIELD_TYPES().DISTANCE, detail.distance);

            labels.push(distance);
            altitude.push(self.context.displayMetric(Context.FIELD_TYPES().ELEVATION, detail.altitude - (min !== null ? min : 0)));
            speed.push(self.context.displayMetric(Context.FIELD_TYPES().SPEED, detail.speed));
            cadence.push(detail.spm);
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
                const value = Math.floor(label);
                if (value === 0) return null;
                if (step === null && last > 0) {
                    step = Math.floor(last / 10);
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