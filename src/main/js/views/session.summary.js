'use strict';

import Context from '../context';
import Sync from '../server/sync';
import Api from '../server/api';
import Utils from '../utils/utils';
import template from './session.summary.art.html';
import intervalsTemplate from './session.summary.intervals.art.html';
import zonesTemplate from './session.summary.zones.art.html';
import GpChart from '../utils/widgets/chart';
import {MockSessionGenerator} from "../global";
import ScheduledSession from "../model/scheduled-session";
import Session from "../model/session";


class SessionSummaryView {

    /**
     *
     * @param page
     * @param {Context} context
     * @param sessionSummaryArguments
     */
    constructor(page, context, sessionSummaryArguments) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));

        const self = this;
        /** @type Session */
        let session = sessionSummaryArguments.session;

        let isPastSession  = sessionSummaryArguments.isPastSession,
            $page          = $(page),
            $duration      = $page.find('[data-selector="duration"]'),
            $distance      = $page.find('[data-selector="distance"]'),
            $avgSpeed      = $page.find('[data-selector="avg-speed"]'),
            $avgSPM        = $page.find('[data-selector="avg-spm"]'),
            $avgEfficiency = $page.find('[data-selector="avg-efficiency"]'),
            $avgHeartRate  = $page.find('[data-selector="avg-heart-rate"]'),
            $congrats      = $page.find('#summary-congrats'),
            $details       = $page.find('#summary-details'),
            $finish        = $page.find('#summary-finish'),
            $back          = $page.find('#summary-back');

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
                , json.avg_efficiency, json.top_efficiency, json.session_end, json.data);

            session.avgHeartRate = json.avg_heart_rate;
            session.expression = sessionDefinition.expression;
            session.expressionJson = sessionDefinition.splits;


            setTimeout(() => {
                modal.hide();
            }, 5000);
        }

        // if session summary is loading a past session, change Finish button to Back and change Congrats to Details
        if (isPastSession === true) {
            $finish.hide();
            $congrats.hide();
            $back.show();
        } else {
            if (context.isPortraitMode() === false) {
                $details.hide();
            }
            Sync.uploadSessions();
        }

        $page.find('#summary-congrats-session').html(moment(session.sessionStart).format('MMMM Do YYYY, HH:mm') + 'h');
        $page.find('#summary-details-session').html(moment(session.sessionStart).format('MMMM Do YYYY, HH:mm') + 'h');

        let duration = moment.duration(session.sessionEnd - session.sessionStart);
        let durationFormatted = Utils.lpad(duration.hours(), 2)
            + ':' + Utils.lpad(duration.minutes(), 2) + ":" + Utils.lpad(duration.seconds(), 2);

        var distance = context.displayMetric('distance', session.distance);
        var avgSpeed = context.displayMetric('speed', session.avgSpeed);
        var avgSPM = context.displayMetric('spm', session.avgSpm);
        var avgEfficiency = context.displayMetric('efficiency', session.avgEfficiency);
        var heartRate = context.displayMetric('heartRate', session.avgHeartRate);

        var now = Date.now();
        Api.TrainingSessions.live.finished(now);

        Api.TrainingSessions.live.update({
            spm: avgSPM,
            timestamp: now,
            distance: distance,
            speed: avgSpeed,
            efficiency: avgEfficiency,
            duration: duration.asMilliseconds()
        }, 'finished');

        $duration.html('<b>' + durationFormatted + '</b>');
        $distance.html('<b>' + distance + '</b>' + context.getUnit('distance_in_session_list'));
        $avgSpeed.html('<b>' + avgSpeed + '</b>');
        $avgSPM.html('<b>' + avgSPM + '</b>');
        $avgEfficiency.html('<b>' + avgEfficiency + '</b>');
        $avgHeartRate.html('<b>' + heartRate + '</b>');

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
                $('[data-selector="slick"]').slick({
                    dots: true,
                    speed: 300,
                    infinite: false,
                    arrows: false
                });
                self.loadCharts(collapseMetrics(records));
                var output = calculateIntervals(session, records);
                var zones = new SessionSummaryZones(session, output.working);
                zones.render(context, zonesTemplate, $('.summary-layout-zones'));

                if (session.version < 2) return;

                if (!session.expression) return;

                var intervals = new SessionSummaryIntervals(session, output.intervals);
                intervals.render(context, intervalsTemplate, $('.summary-layout-intervals'));
            });
        });
    }

    loadCharts(collapsedMetrics) {
        let labels = [], speed = [], spm = [], efficiency = [], hr = [];

        collapsedMetrics.map(function(detail) {
            labels.push(detail.timestamp);
            speed.push(detail.speed);
            spm.push(detail.spm);
            efficiency.push(detail.efficiency);
            hr.push(detail.heartRate);
        });

        let labelFormatter = function(data, places) {
            return function (value, context) {
                if (context.dataIndex === 0) return '';
                if (context.dataIndex === data.length -1 ) return '';
                if (context.dataIndex % 3 === 0) return Utils.round(value, places);
                return '';
            }
        };

        var dataset = function(values) {
            return {
                data: values,
                backgroundbackColor: 'rgba(59, 61, 98, 0)',
                borderColor: 'rgba(238, 97, 86, 1)',
                borderWidth: 2,
                pointRadius: 0
            }
        };

        var labelOptions = {
            weight: 700,
            size: 10,
            align: 'start',
            anchor: 'start',
            clamp: true
        };

        new GpChart($('[data-selector="speed-chart"]'), 'line', labels, dataset(speed), labelFormatter(speed, 2), labelOptions, false);
        new GpChart($('[data-selector="spm-chart"]'), 'line', labels, dataset(spm), labelFormatter(spm, 0), labelOptions, false);
        new GpChart($('[data-selector="efficiency-chart"]'), 'line', labels, dataset(efficiency), labelFormatter(efficiency, 2), labelOptions, false);
        new GpChart($('[data-selector="heart-rate-chart"]'), 'line', labels, dataset(hr), labelFormatter(hr, 0), labelOptions, false);
    }
}


class SessionSummaryIntervals {
    constructor(session, intervals) {
        this.intervals = intervals;
        this.session = session;
    }

    render(context, template, $container) {
        var self = this;
        var position = 1, intervals = [];

        for (var i = 0; i < this.intervals.length; i++) {
            var interval = this.intervals[i];
            if (interval.recovery) continue;


            var distance = Math.round((interval.distanceEnd - interval.distanceStart) * 1000);
            var speed = Utils.calculateAverageSpeed(interval.distanceEnd - interval.distanceStart
                , interval.finishedAt - interval.startedAt);
            var spm = Math.round(interval.spmTotal / interval.count);
            var length = Utils.calculateStrokeLength(interval.spmTotal / interval.count, speed);

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
        Context.render($container, template({isPortraitMode: context.isPortraitMode()
            , intervals: intervals, session: self.session.expression}));


        setTimeout(function () {
            if (!self.intervals || self.intervals.length === 0) {
                self.loadCharts([]);
                return;
            }
            self.loadCharts(collapseMetrics(self.intervals[0].records, 50));
            $container.on('click', '[data-selector="interval"]', function () {
                var $tr = $(this), interval = self.intervals[parseInt($tr.data('interval'))];
                $container.find('.summary-table-interval-selected').removeClass('summary-table-interval-selected');
                $tr.addClass('summary-table-interval-selected');
                self.loadCharts(collapseMetrics(interval.records, 50));
            });

        }, 0);
    }

    loadCharts(metrics) {
        var labels = [], speed = [], spm = [], efficiency = [], hr = [];

        metrics.map(function(detail) {
            labels.push(detail.timestamp);
            speed.push(detail.speed);
            spm.push(detail.spm);
            efficiency.push(detail.efficiency);
            hr.push(detail.heartRate);
        });

        var labelFormatter = function(data, places) {
            return function (value, context) {
                if (context.dataIndex === 0) return '';
                if (context.dataIndex === data.length -1 ) return '';
                if (context.dataIndex % 5 === 0) return Utils.round(value, places);
                return '';
            }
        };

        var dataset = function(values) {
            return {
                data: values,
                backgroundbackColor: 'rgba(59, 61, 98, 0)',
                borderColor: 'rgba(238, 97, 86, 1)',
                borderWidth: 2,
                pointRadius: 0
            }
        };

        var labelOptions = {
            weight: 700,
            size: 10,
            align: 'start',
            anchor: 'start',
            clamp: true
        };

        new GpChart($('#speed'), 'line', labels, dataset(speed), labelFormatter(speed, 2), labelOptions, false);
        new GpChart($('#spm'), 'line', labels, dataset(spm), labelFormatter(spm, 0), labelOptions, false);
        new GpChart($('#length'), 'line', labels, dataset(efficiency), labelFormatter(efficiency, 2), labelOptions, false);
        new GpChart($('#hr'), 'line', labels, dataset(hr), labelFormatter(hr, 0), labelOptions, false);

    }
}

class SessionSummaryZones {
    /**
     *
     * @param {Session} session
     * @param records
     */
    constructor(session, records) {
        var SPM_ZONE_STEP = Api.User.getProfile().boat === "C" ? 5 : 10
            , spmZones = [], speedZones = [], heartRateZones = [], spmToSpeedZones = [], level = 0
            , HIDE_PERCENTAGE_THRESHOLD = 5
        ;

        for (var i = 0; i < records.length; i++) {
            var record = records[i];
            level = Math.floor(record.getSpm() / SPM_ZONE_STEP);
            if (spmZones[level] === undefined) spmZones[level] = 0;
            if (spmToSpeedZones[level] === undefined) spmToSpeedZones[level] = [];
            spmZones[level]++;
            spmToSpeedZones[level].push(record.getSpeed());

            level = Math.floor(record.getSpeed());
            if (speedZones[level] === undefined) speedZones[level] = 0;
            speedZones[level]++;

            level = Math.floor(record.getHeartRate() / 10);
            if (heartRateZones[level] === undefined) heartRateZones[level] = 0;
            heartRateZones[level]++;
        }

        this.speedZones = [];
        var percentage, max = Utils.minMaxAvgStddev(speedZones).max / records.length * 100;
        var lower = session.avgSpeed - Utils.minMaxAvgStddev(records.map(function (rec) {return rec.speed})).stddev;
        var discarding = false;
        for (var sz = 0; sz < speedZones.length; sz++) {
            if (speedZones[sz] === undefined) continue;
            percentage = Math.round(speedZones[sz] / records.length * 100);
            if (percentage === 0) continue;
            if (sz < lower && percentage < HIDE_PERCENTAGE_THRESHOLD) discarding = true;
            this.speedZones.push({zone: sz, percentage: percentage, bar: percentage * 100/ max, discard: discarding});
            discarding = false;
        }

        this.spmZones = [];
        max = Utils.minMaxAvgStddev(spmZones).max / records.length * 100;
        lower = session.avgSpm - Utils.minMaxAvgStddev(records.map(function (rec) {return rec.spm})).stddev;
        discarding = false;
        for (var spm = 0; spm < spmZones.length; spm++) {
            if (spmZones[spm] === undefined) continue;
            percentage = Math.round(spmZones[spm] / records.length * 100);
            if (percentage === 0) continue;
            if (spm * SPM_ZONE_STEP < lower && percentage < HIDE_PERCENTAGE_THRESHOLD) discarding = true;
            this.spmZones.push({zone: spm * SPM_ZONE_STEP, percentage: percentage, bar: percentage * 100/ max, discard: discarding});
            discarding = false;
        }


        this.spmToSpeedZones = [];
        lower = session.avgSpm - Utils.minMaxAvgStddev(records.map(function (rec) {return rec.spm})).stddev;
        for (var ss = 0; ss < spmToSpeedZones.length; ss++) {
            if (spmToSpeedZones[ss] === undefined || spmToSpeedZones[ss].length === 0) continue;
            percentage = Math.round(spmToSpeedZones[ss].length / records.length * 100);
            if (percentage === 0) continue;
            if (ss * SPM_ZONE_STEP < lower && percentage < HIDE_PERCENTAGE_THRESHOLD) continue;
            var stats = Utils.minMaxAvgStddev(spmToSpeedZones[ss]);
            this.spmToSpeedZones.push({
                zone: ss * SPM_ZONE_STEP,
                avg: Utils.round2(stats.avg),
                min: Utils.round2(Math.max(0, stats.avg - stats.stddev)),
                max: Utils.round2(stats.avg + stats.stddev)
            });
            discarding = false;
        }

        this.heartRateZones = [];
        max = Utils.minMaxAvgStddev(heartRateZones).max / records.length * 100;
        for (var hr = 0; hr < heartRateZones.length; hr++) {
            if (heartRateZones[hr] === undefined) continue;
            percentage = Math.round(heartRateZones[hr] / records.length * 100);
            if (percentage === 0) continue;
            this.heartRateZones.push({zone: hr * 10, percentage: percentage, bar: percentage * 100/ max});
        }

    }

    render(context, template, $container) {
        var self = this;

        Context.render($container, template({isPortraitMode: context.isPortraitMode()
            , speedZones: self.speedZones
            , spmZones: self.spmZones
            , heartRateZones: self.heartRateZones
            , spmToSpeedZones: self.spmToSpeedZones
        }));

        setTimeout(function () {

        }, 0);
    }
}

function collapseMetrics(details, nbrOfPoints) {
    var step, speed = 0, spm = 0, efficiency = 0, hr = 0, count = 0, result = [], i, l
        , distance = details[details.length - 1].getDistance() * 1000, position;

    if (!nbrOfPoints) nbrOfPoints = 10;

    if (details.length === 0 || distance < 100) {
        for (i = 0, l = 10; i < l; i++) {
            result.push({speed: 0, spm: 0, efficiency: 0, heartRate: 0, timestamp: i});
        }
        return result;

    }

    if (details.length <= 15) {
        for (i = 0, l = 15; i < l; i++) {
            if (details.length - 1 > i) {
                result.push({
                    speed: details[i].getSpeed(),
                    spm: details[i].getSpm(),
                    efficiency: details[i].getEfficiency(),
                    heartRate: details[i].getHeartRate(),
                    timestamp: i
                });
            } else {
                result.push({speed: 0, spm: 0, efficiency: 0, heartRate: 0, timestamp: i});
            }
        }
        return result;
    }

    step = Math.floor(distance / nbrOfPoints);
    position = step;
    for (i = 0, l = details.length; i < l; i++) {
        var detail = details[i];
        if (detail.getDistance() * 1000 > position) {
            result.push({
                speed: speed / count,
                spm: spm / count,
                efficiency: efficiency / count,
                heartRate: hr / count,
                timestamp: detail.getTimestamp()
            });
            speed = 0;
            spm = 0;
            efficiency = 0;
            hr = 0;
            count = 0;
            position += step;
        }

        speed += detail.getSpeed();
        spm += detail.getSpm();
        efficiency += detail.getEfficiency();
        hr += detail.getHeartRate();

        count++;
    }

    if (count > 0) {
        result.push({
            speed: speed / count,
            spm: spm / count,
            efficiency: efficiency / count,
            heartRate: hr / count
        });
    }

    return result;
}

/**
 *
 * @param {Session} session
 * @param details  Session data records
 */
function calculateIntervals(session, details) {

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

    var interval = null, previous = null, intervals = [], definition, workingDetails = [];
    definition = session.expressionJson;

    for (var i = 0, l = details.length; i < l; i++) {
        var record = details[i];
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

    if (intervals[intervals.length -1] !== undefined && intervals[intervals.length -1].finishedAt === null) {
        intervals[intervals.length -1].finishedAt = record.getTimestamp();
        intervals[intervals.length -1].distanceEnd = record.getDistance();
    }

    return {
        intervals: intervals,
        working: workingDetails
    }
}

export default  SessionSummaryView;
