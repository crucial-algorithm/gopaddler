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
        let labels = [], altitude = [], last = 0, step = null;

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
            let value = self.context.displayMetric(Context.FIELD_TYPES().ELEVATION, detail.altitude - (min !== null ? min : 0));

            labels.push(distance);
            altitude.push(value);

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
            xAxisLabelCallback: (label) => {
                const value = Math.floor(label);
                if (value === 0) return null;
                if (step === null && last > 0) {
                    console.log(last, last/6, metrics[metrics.length -1].distance);
                    step = Math.floor(last / 6);
                }
                if (value % step !== 0) return null;
                if (labelsToShow[value] === true) return null;
                labelsToShow[value] = true;
                return value;
            }

        };

        new GpChart(document.getElementById('cycling-altitude'), GpChart.TYPES().LINE, labels
            , SessionSummaryIntervals.dataset(altitude), SessionSummaryIntervals.labelFormatter(altitude, 2)
            , options, false);
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