'use strict';

var utils = require('../utils/utils.js')
    , Api = require('../server/api')
    , sync = require('../server/sync')
    , template = require('./session.summary.art.html')
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
            self.loadCharts(self.collapseMetrics(records));
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

SessionSummaryView.prototype.collapseMetrics = function(details) {

    var step, speed = 0, spm = 0, efficiency = 0, hr = 0, count = 0, result = [], i, l
        , distance = details[details.length - 1].getDistance() * 1000, position;

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

    step = Math.floor(distance / 10);
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
};

exports.SessionSummaryView = SessionSummaryView;
