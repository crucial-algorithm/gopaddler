import Utils from "../utils/utils";
import Context from "../context";
import GpChart from "../utils/widgets/chart";

export default class SessionSummaryIntervals {
    /**
     *
     * @param {Session} session
     * @param {Array<SummaryInterval>} intervals
     */
    constructor(session, intervals) {
        /**@type Array<SummaryInterval> */
        this.intervals = intervals;
        this.session = session;
        /**@type Context */
        this._context = null;
    }

    render(context, template, $container) {
        let self = this;
        let position = 1, intervals = [];
        this.context = context;

        for (let i = 0; i < this.intervals.length; i++) {
            let interval = this.intervals[i];
            if (interval.recovery) continue;


            let distance = Math.round((interval.distanceEnd - interval.distanceStart) * 1000);
            let speed = Utils.calculateAverageSpeed(interval.distanceEnd - interval.distanceStart
                , interval.finishedAt - interval.startedAt);
            let spm = Math.round(interval.spmTotal / interval.count);
            let length = Utils.calculateStrokeLength(interval.spmTotal / interval.count, speed);

            intervals.push({
                index: i,
                first: intervals.length === 0,
                position: position,
                duration: Utils.duration(interval.finishedAt - interval.startedAt),
                distance: distance,
                speed: Utils.round2(speed),
                spm: spm,
                length: Utils.round2(length),
                hr: Math.round(interval.hrTotal / interval.count)
            });
            position++;
        }
        Context.render($container, template({
            isPortraitMode: context.isPortraitMode()
            , intervals: intervals, session: self.session.expression
        }));

        setTimeout(function () {
            if (!self.intervals || self.intervals.length === 0) {
                self.loadCharts([]);
                return;
            }
            self.loadCharts(self.intervals[0]);
            $container.on('click', '[data-selector="interval"]', function () {
                let $tr = $(this), interval = self.intervals[parseInt($tr.data('interval'))];
                $container.find('.summary-table-interval-selected').removeClass('summary-table-interval-selected');
                $tr.addClass('summary-table-interval-selected');
                self.loadCharts(interval);
            });

        }, 0);
    }

    /**
     *
     * @param {SummaryInterval} interval
     */
    loadCharts(interval) {
        let metrics = interval.records;
        let labels = [], speed = [], spm = [], efficiency = [], hr = []
            , first = metrics[0]
            , last = metrics[metrics.length - 1]
            , finishedAt = -1;

        metrics.map((detail) => {
            speed.push(detail.speed);
            spm.push(detail.spm);
            efficiency.push(detail.efficiency);
            hr.push(detail.heartRate);

            if (interval.isDistanceBased) {
                if (finishedAt  < 0 ) finishedAt = this.context.displayMetric(Context.FIELD_TYPES().DISTANCE
                    , last.distance - first.distance);

                if (this.context.isImperial()) {
                    let reduce = finishedAt < 1;
                    labels.push(Math.round(this.context.displayMetric(Context.FIELD_TYPES().DISTANCE,
                        detail.distance - first.distance, reduce)));
                } else {
                    labels.push(Math.round(finishedAt > 2 ? detail.distance - first.distance : (detail.distance - first.distance) * 1000));
                }
            } else {
                labels.push(Math.round((detail.timestamp - first.timestamp) / 1000));
            }
        });

        /**@type ChartOptions */
        let options = {
            /**@type ChartLabelOptions*/
            labels: {
                display: false
            },
            displayYAxisGridLines: true,
            displayXAxisGridLines: true,
            xAxisLabelMaxRotation: 50,
            paddingLeft: 10,
            paddingRight: 10
        };

        new GpChart($('#speed'), GpChart.TYPES().LINE, labels, SessionSummaryIntervals.dataset(speed), SessionSummaryIntervals.labelFormatter(speed, 2), options, false);
        new GpChart($('#spm'), GpChart.TYPES().LINE, labels, SessionSummaryIntervals.dataset(spm), SessionSummaryIntervals.labelFormatter(spm, 0), options, false);
        new GpChart($('#length'), GpChart.TYPES().LINE, labels, SessionSummaryIntervals.dataset(efficiency), SessionSummaryIntervals.labelFormatter(efficiency, 2), options, false);
        new GpChart($('#hr'), GpChart.TYPES().LINE, labels, SessionSummaryIntervals.dataset(hr), SessionSummaryIntervals.labelFormatter(hr, 0), options, false);

    }

    get context() {
        return this._context;
    }

    set context(value) {
        this._context = value;
    }

    static labelFormatter(data, places) {
        return function (value, context) {
            if (context.dataIndex === 0) return '';
            if (context.dataIndex === data.length - 1) return '';
            if (context.dataIndex % 5 === 0) return Utils.round(value, places);
            return '';
        }
    }

    /**
     *
     * @param values
     * @return {ChartDataSet}
     */
    static dataset(values) {
        return {
            data: values,
            backgroundbackColor: 'rgba(59, 61, 98, 0)',
            borderColor: 'rgba(238, 97, 86, 1)',
            borderWidth: 2,
            pointRadius: 0
        }
    }
}