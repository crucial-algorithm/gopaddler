'use strict';

import Context from '../context';
import Sync from '../server/sync';
import Api from '../server/api';
import Utils from '../utils/utils';
import template from './session.summary.art.html';
import generalStatsTemplate from './session.summary.general.art.html';
import intervalsTemplate from './session.summary.intervals.art.html';
import zonesTemplate from './session.summary.zones.art.html';
import cyclingTemplate from './session.summary.cycling.art.html';
import GpChart from '../utils/widgets/chart';
import {MockSessionGenerator} from "../global";
import ScheduledSession from "../model/scheduled-session";
import Session from "../model/session";
import AppSettings from "../utils/app-settings";
import {UtterCyclingUtils} from "../utils/utter-cycling-utils";


/**
 * @typedef {Object}                SummaryInterval
 * @property {number}               number
 * @property {number}               count
 * @property {number}               startAt
 * @property {number}               finishedAt
 * @property {number}               distanceStart
 * @property {number}               distanceEnd
 * @property {number}               spmTotal
 * @property {number}               hrTotal
 * @property {boolean}              recovery
 * @property {boolean}              isDistanceBased
 * @property {Array<SessionDetail>} records
 */

class SessionSummaryView {

    /**
     *
     * @param page
     * @param {Context} context
     * @param sessionSummaryArguments
     */
    constructor(page, context, sessionSummaryArguments) {
        const self = this;

        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));

        /** @type Session */
        let session = sessionSummaryArguments.session;

        let isPastSession = sessionSummaryArguments.isPastSession,
            $page = $(page),
            $finish = $page.find('#summary-finish'),
            $back = $page.find('#summary-back')
        ;

        // show sample session for the 1st time user tries the product
        if (session.id === 1 && isPastSession !== true) {
            const modal = context.ui.modal.undecorated([
                '<div class="sessions-summary-sample-model">',
                '   <div class="sessions-summary-sample-model-primary">' + context.translate('sessions_summary_modal_sample_session_primary') + '</div>',
                '   <div class="sessions-summary-sample-model-secondary">' + context.translate('sessions_summary_modal_sample_session_secondary') + '</div>',
                '</div>',
            ].join(''));

            const sessionDefinition = ScheduledSession.load(false)[0];
            const generator = new MockSessionGenerator(sessionDefinition, Date.now());
            const json = generator.generate();

            session = new Session(json.session_start, json.anglez, json.noisex, json.noisez, json.factorx, json.factorz, json.axis
                , json.distance, json.avg_spm, json.top_spm, json.avg_speed, json.top_speed
                , json.avg_efficiency, json.top_efficiency, json.session_end, json.data, 0);

            session.avgHeartRate = json.avg_heart_rate;
            session.expression = sessionDefinition.expression;
            session.expressionJson = sessionDefinition.splits;

            localStorage.setItem('first_experiment_done', JSON.stringify(true));

            setTimeout(() => {
                // hide "show demo stats" modal
                modal.hide();
            }, 5000);
        }

        // calculate stats
        let duration = moment.duration(session.sessionEnd - session.sessionStart - (session.pausedDuration || 0));
        let durationFormatted = Utils.lpad(duration.hours(), 2)
            + ':' + Utils.lpad(duration.minutes(), 2) + ":" + Utils.lpad(duration.seconds(), 2);

        let distance = context.displayMetric('distance', session.distance);
        let avgSpeed = context.displayMetric('speed', session.avgSpeed);
        let avgSPM = context.displayMetric('spm', session.avgSpm);
        let avgEfficiency = context.displayMetric('efficiency', session.avgEfficiency);
        let heartRate = context.displayMetric('heartRate', session.avgHeartRate);

        // if session summary is loading a past session, change Finish button to Back and change Congrats to Details
        if (isPastSession === true) {
            $finish.hide();
            $back.show();
        } else {
            let now = Date.now();
            Api.TrainingSessions.live.finished(now);
            Api.TrainingSessions.live.update({
                spm: avgSPM,
                timestamp: now,
                distance: distance,
                speed: avgSpeed,
                efficiency: avgEfficiency,
                duration: duration.asMilliseconds()
            }, 'finished');

            Sync.uploadSessions();
        }

        $page.find('#summary-details-session').html(moment(session.sessionStart).format('MMMM Do YYYY, HH:mm') + 'h');

        $finish.on('tap', function () {
            App.load('home', undefined, undefined, function () {
                App.removeFromStack();
            });
        });

        if (session.expression === null) {
            $page.find('.summary-layout-intervals').remove();
        }

        $page.on('appShow', function () {

            session.detail().then(function (records) {
                const elevation = UtterCyclingUtils.calculateElevationGain(records);
                Context.render(document.getElementsByClassName('summary-layout-general')[0], generalStatsTemplate({
                    duration: durationFormatted,
                    distance: distance,
                    speed: avgSpeed,
                    cadence: avgSPM,
                    efficiency: avgEfficiency,
                    heartRate: heartRate,
                    elevation: context.displayMetric(Context.FIELD_TYPES().ELEVATION, elevation)
                }));

                let output = self.calculateIntervals(session, records);
                let zones = new SessionSummaryZones(session, output.working, context);
                zones.render(context, zonesTemplate, $('.summary-layout-zones'));

                if (session.version < 2) return self.stopProgressBar();

                AppSettings.switch(() => {
                }, () => {
                    let cycling = new UtterCycling(session, records, context);
                    cycling.render(cyclingTemplate, document.getElementsByClassName('summary-layout-cycling')[0])
                });

                if (!session.expression) return self.stopProgressBar();

                let intervals = new SessionSummaryIntervals(session, output.intervals);
                intervals.render(context, intervalsTemplate, $('.summary-layout-intervals'));
                self.stopProgressBar()
            });
        });
    }

    stopProgressBar() {
        $('.progress-line').hide();
    }

    /**
     *
     * @param {Session} session
     * @param {Array<SessionDetail>} details  Session data records
     * @return {{intervals: Array<SummaryInterval>, working: Array<SessionDetail>}}
     */
    calculateIntervals(session, details) {

        if (session.version < 2) {
            return {
                intervals: [],
                working: details
            }
        }

        if (!session.expression) {
            return {
                intervals: [],
                working: details
            }
        }

        let interval = null, previous = null, intervals = [], definition, workingDetails = [];
        definition = session.expressionJson;

        for (let i = 0, l = details.length; i < l; i++) {
            let record = details[i];
            if (record.split === -1) {
                if (previous) {
                    previous.finishedAt = record.getTimestamp();
                    previous.distanceEnd = record.getDistance();
                    previous = null;
                }
                continue;
            }

            interval = intervals[record.split];
            if (interval === undefined) {
                if (previous) {
                    previous.finishedAt = record.getTimestamp();
                    previous.distanceEnd = record.getDistance();
                }
                intervals[record.split] = {
                    number: record.split,
                    count: 0,
                    startedAt: record.getTimestamp(),
                    finishedAt: null,
                    distanceStart: record.getDistance(),
                    distanceEnd: null,
                    spmTotal: 0,
                    hrTotal: 0,
                    recovery: definition[record.split]._recovery === true,
                    isDistanceBased: definition[record.split]._unit.toLowerCase() === 'meters'
                        || definition[record.split]._unit.toLowerCase() === 'kilometers',
                    records: []

                }
            }

            if (intervals[record.split].recovery === false) {
                intervals[record.split].spmTotal += record.getSpm();
                intervals[record.split].hrTotal += record.getHeartRate();
                intervals[record.split].records.push(record);
                intervals[record.split].count++;
                workingDetails.push(record);
            }

            previous = interval;
        }

        if (intervals[intervals.length - 1] !== undefined && intervals[intervals.length - 1].finishedAt === null) {
            intervals[intervals.length - 1].finishedAt = record.getTimestamp();
            intervals[intervals.length - 1].distanceEnd = record.getDistance();
        }

        return {
            intervals: intervals,
            working: workingDetails
        }
    }
}

class SessionSummaryIntervals {
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

        new GpChart($('#speed'), GpChart.TYPES().LINE, labels, dataset(speed), labelFormatter(speed, 2), options, false);
        new GpChart($('#spm'), GpChart.TYPES().LINE, labels, dataset(spm), labelFormatter(spm, 0), options, false);
        new GpChart($('#length'), GpChart.TYPES().LINE, labels, dataset(efficiency), labelFormatter(efficiency, 2), options, false);
        new GpChart($('#hr'), GpChart.TYPES().LINE, labels, dataset(hr), labelFormatter(hr, 0), options, false);

    }

    get context() {
        return this._context;
    }

    set context(value) {
        this._context = value;
    }
}

function labelFormatter(data, places) {
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
function dataset(values) {
    return {
        data: values,
        backgroundbackColor: 'rgba(59, 61, 98, 0)',
        borderColor: 'rgba(238, 97, 86, 1)',
        borderWidth: 2,
        pointRadius: 0
    }
}

class SessionSummaryZones {
    /**
     *
     * @return {number}
     */
    static hidePercentageThreshold() {
        return 5;
    }

    /**
     *
     * @param {Session} session
     * @param {Array<SessionDetail>} records
     * @param {Context} context
     */
    constructor(session, records, context) {
        const athlete = Api.User.get();
        let spmZones = new Array(athlete.strokeRateZones.length).fill(0)
            , speedZones = new Array(athlete.speedZones.length).fill(0)
            , heartRateZones = new Array(athlete.heartRateZones.length).fill(0)
            , spmToSpeedZones
        ;


        this.speedZones = this.prepareZoneChartsData(records, "speed", session.avgSpeed, speedZones, athlete.speedZones);
        this.spmZones = this.prepareZoneChartsData(records, "spm", session.avgSpm, spmZones, athlete.strokeRateZones);
        this.heartRateZones = this.prepareZoneChartsData(records, "heartRate", session.avgHeartRate
            , heartRateZones, athlete.heartRateZones, (hr) => {
                return Utils.heartRateReserveCalculation(context.getRestingHeartRate(), context.getMaxHeartRate(), hr);
            });

        spmToSpeedZones = spmZones.slice();
        for (let i = 0, l = athlete.strokeRateZones.length; i < l; i++) {
            if (spmToSpeedZones[i] === 0) {
                spmToSpeedZones[i] = [];
                continue;
            }
            let zone = athlete.strokeRateZones[i];
            spmToSpeedZones[i] = [];
            for (let record of records) {
                if (record.getSpm() >= zone.start && record.getSpm() <= zone.end && record.recovery === false) {
                    spmToSpeedZones[i].push(record.getSpeed());
                }
            }
        }

        let discarding = false, percentage;
        this.spmToSpeedZones = [];
        for (let ss = 0; ss < spmToSpeedZones.length; ss++) {
            if (spmToSpeedZones[ss] === undefined || spmToSpeedZones[ss].length === 0) continue;
            percentage = Math.round(spmToSpeedZones[ss].length / records.length * 100);
            if (percentage === 0) continue;
            let stats = Utils.minMaxAvgStddev(spmToSpeedZones[ss]);
            this.spmToSpeedZones.push({
                zone: `${athlete.strokeRateZones[ss].start}-${athlete.strokeRateZones[ss].end}`,
                avg: Utils.round2(stats.avg),
                min: Utils.round2(Math.max(0, stats.avg - stats.stddev)),
                max: Utils.round2(stats.avg + stats.stddev)
            });
            discarding = false;
        }
    }

    /**
     * @param {Array<SessionDetail>}                                                    records
     * @param {string}                                                                  property
     * @param {number}                                                                  avg
     * @param {Array<number>}                                                           zones
     * @param {Array<AthleteTrainingZone>}                                              definition  zones definition
     * @param {function}                                                                process     function to process value
     * @return {Array<Object>}
     */
    prepareZoneChartsData(records, property, avg, zones, definition, process = (value) => {
        return Math.floor(value)
    }) {
        let stats = this.calculateZones(records, definition.slice(0), property, zones, [], process);
        let lower = avg - Utils.minMaxAvgStddev(records.map(function (rec) {
            return rec[property]
        })).stddev;
        let percentage, max = Utils.minMaxAvgStddev(zones).max / stats.count * 100, discarding = false;
        let result = [];
        for (let i = 0; i < zones.length; i++) {
            if (zones[i] === undefined) continue;
            percentage = Math.round(zones[i] / stats.workingCount * 100);
            if (percentage === 0) continue;
            if (i < lower && percentage < SessionSummaryZones.hidePercentageThreshold()) discarding = true;
            let zone = definition[i];
            result.push({
                zone: `${zone.start}-${zone.end}`,
                percentage: percentage,
                bar: percentage * 100 / max,
                discard: discarding
            });
            discarding = false;
        }
        return result;
    }

    render(context, template, $container) {
        const self = this;

        Context.render($container, template({
            isPortraitMode: context.isPortraitMode()
            , speedZones: self.speedZones
            , spmZones: self.spmZones
            , heartRateZones: self.heartRateZones
            , spmToSpeedZones: self.spmToSpeedZones
        }));
    }

    /**
     *
     * @param {Array<SessionDetail>}        data
     * @param {Array<AthleteTrainingZone>}  zones
     * @param {string}                      property        Property from data that should be read
     * @param {Array}                       aggregator      Write working output
     * @param {Array}                       aggregatorFull  Write full output
     * @param {function}                    process         function to process value
     * @return {{count: number, workingCount: number, total: number, working: number}}
     */
    calculateZones(data, zones, property, aggregator, aggregatorFull, process = function (value) {
        return Math.floor(value)
    }) {
        let total = 0, working = 0, workingCount = 0, count = 0;

        this.loopZones(data, zones, property, function (value, position) {
            workingCount++;
            aggregator[position] = aggregator[position] === undefined ? 1 : aggregator[position] + 1;
            working += value;
        }, function all(value, position) {
            count++
            aggregatorFull[position] = aggregatorFull[position] === undefined ? 1 : aggregatorFull[position] + 1;
            total += value;
        }, process);


        return {
            working: working,
            workingCount: workingCount,
            count: count,
            total: total
        }
    }

    /**
     *
     * @param {Array<SessionDetail>}        data
     * @param {Array<AthleteTrainingZone>}  zones
     * @param {string}                      property        Property from data that should be read
     * @param {function}                    working         Write working output
     * @param {function}                    all             Write full output
     * @param {function}                    process         function to process value

     */
    loopZones(data, zones, property, working, all, process = function (value) {
        return Math.floor(value)
    }) {
        let index = -1;

        while (zones.length > 0) {
            let zone = zones.shift();
            index++;

            for (let record of data) {
                let value = process(record[property]);

                if (value >= zone.start && value <= zone.end) {
                    all.apply({}, [record[property], index, record]);

                    if (record.recovery) continue;
                    working.apply({}, [record[property], index, record]);
                }
            }
        }
    }
}

class UtterCycling {
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
            , dataset(altitude), labelFormatter(altitude, 2)
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


export default SessionSummaryView;
