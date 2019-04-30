'use strict';

var utils = require('../utils/utils.js')
    , Api = require('../server/api')
    , sync = require('../server/sync')
    , template = require('./session.summary.art.html')
    , detailTemplate = require('./session.summary.detail.art.html')
    , GpChart = require('../utils/widgets/chart').GpChart
;


function SessionSummaryView(page, context, sessionSummaryArguments) {
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));

    var self           = this,
        session        = sessionSummaryArguments.session,
        isPastSession  = sessionSummaryArguments.isPastSession,
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

    // if session summary is loading a past session, change Finish button to Back and change Congrats to Details
    if (isPastSession === true) {
        $finish.hide();
        $congrats.hide();
        $back.show();
    } else {
        if (context.isPortraitMode() === false) {
            $details.hide();
        }
        sync.uploadSessions();
    }

    $page.find('#summary-congrats-session').html(moment(session.getSessionStart()).format('MMMM Do YYYY, HH:mm') + 'h');
    $page.find('#summary-details-session').html(moment(session.getSessionStart()).format('MMMM Do YYYY, HH:mm') + 'h');

    var duration = moment.duration(session.getSessionEnd() - session.getSessionStart());
    var durationFormatted = utils.lpad(duration.hours(), 2)
        + ':' + utils.lpad(duration.minutes(), 2) + ":" + utils.lpad(duration.seconds(), 2);

    var distance = context.displayMetric('distance', session.getDistance());
    var avgSpeed = context.displayMetric('speed', session.getAvgSpeed());
    var avgSPM = context.displayMetric('spm', session.getAvgSpm());
    var avgEfficiency = context.displayMetric('efficiency', session.getAvgEfficiency());
    var heartRate = context.displayMetric('heartRate', session.getAvgHeartRate());

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
            if (session.getId() === 1 && isPastSession !== true) {
                context.ui.modal.alert(context.translate('phone_mount_cta_title')
                    , '<p>' + context.translate('phone_mount_cta_message', ['https://gopaddler.com/waterproof-smartphone-mount/?utm_source=app-notification']) + '</p>'
                    , context.translate('phone_mount_cta_acknowledge'));
            }
        });
    });


    $page.on('appShow', function () {

        session.detail().then(function (records) {
            self.loadCharts(collapseMetrics(records));
            if (session.getVersion() < 2) return;

            if (!session.getExpression()) return;

            var detail = new SessionSummaryIntervals(session, records);
            detail.render(context, detailTemplate, $('.summary-layout-intervals'));

            setTimeout(function () {
                $('[data-selector="slick"]').slick({
                    dots: true,
                    speed: 300,
                    infinite: false,
                    arrows: false
                });
            }, 0);
        });
    });
}

SessionSummaryView.prototype.loadCharts = function(collapsedMetrics) {
    var labels = [], speed = [], spm = [], efficiency = [], hr = [];

    collapsedMetrics.map(function(detail) {
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
            if (context.dataIndex % 3 === 0) return utils.round(value, places);
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
};

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


function SessionSummaryIntervals(session, details) {
    var interval = null, previous = null, intervals = [], definition = session.getExpressionJson() || [];

    if (session.getVersion() < 2) {
        return;
    }

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
                recovery: record.isRecovery(),
                isDistanceBased: definition[record.split]._unit.toLowerCase() === 'meters'
                    || definition[record.split]._unit.toLowerCase() === 'kilometers',
                records: []

            }
        }

        intervals[record.split].spmTotal += record.getSpm();
        intervals[record.split].hrTotal += record.getHeartRate();
        intervals[record.split].records.push(record);
        intervals[record.split].count++;
        previous = interval;
    }

    console.log(session.expression, intervals);
//    intervals.map(function (split) {
//        if (split.recovery) return;
//        console.log(['duration = ', split.finishedAt - split.startedAt, ' of ', split.recovery ? 'recovery' : 'work'
//            , 'in a ', split.isDistanceBased ? 'distance' : 'time', ' based interval, having performed '
//            , Math.round((split.distanceEnd - split.distanceStart) * 1000), ' m'
//        ].join(''));
//    });

    this.intervals = intervals;
    this.session = session;
}

SessionSummaryIntervals.prototype.render = function(context, template, $container) {
    var self = this;
    var position = 1, intervals = [];

    for (var i = 0; i < this.intervals.length; i++) {
        var interval = this.intervals[i];
        if (interval.recovery) continue;


        var distance = Math.round((interval.distanceEnd - interval.distanceStart) * 1000);
        var speed = utils.calculateAverageSpeed(interval.distanceEnd - interval.distanceStart
            , interval.finishedAt - interval.startedAt);
        var spm = Math.round(interval.spmTotal / interval.count);
        var length = utils.calculateStrokeLength(interval.spmTotal / interval.count, speed);

        intervals.push({
            index: i,
            first: intervals.length === 0,
            position: position,
            duration: utils.duration(interval.finishedAt - interval.startedAt),
            distance: distance,
            speed: utils.round2(speed),
            spm: spm,
            length: utils.round2(length),
            hr: Math.round(interval.hrTotal / interval.count)
        });
        position++;
    }
    context.render($container, template({isPortraitMode: context.isPortraitMode()
        , intervals: intervals, session: self.session.getExpression()}));


    setTimeout(function () {
        self.loadCharts(collapseMetrics(self.intervals[0].records, 50));
        $container.on('click', '[data-selector="interval"]', function () {
            var $tr = $(this), interval = self.intervals[parseInt($tr.data('interval'))];
            $container.find('.summary-table-interval-selected').removeClass('summary-table-interval-selected');
            $tr.addClass('summary-table-interval-selected');
            self.loadCharts(collapseMetrics(interval.records, 50));
        });

    }, 0);
};

SessionSummaryIntervals.prototype.loadCharts = function(metrics) {
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
            if (context.dataIndex % 5 === 0) return utils.round(value, places);
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

};

exports.SessionSummaryView = SessionSummaryView;
