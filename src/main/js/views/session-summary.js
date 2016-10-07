'use strict';

var utils = require('../utils/utils.js');

function SessionSummaryView(page, context, sessionSummaryArguments) {
    var self           = this,
        session        = sessionSummaryArguments.session,
        isPastSession  = sessionSummaryArguments.isPastSession,
        $page          = $(page),
        $duration      = $page.find('[data-selector="duration"]'),
        $distance      = $page.find('[data-selector="distance"]'),
        $avgSpeed      = $page.find('[data-selector="avg-speed"]'),
        $maxSpeed      = $page.find('[data-selector="max-speed"]'),
        $avgSPM        = $page.find('[data-selector="avg-spm"]'),
        $maxSPM        = $page.find('[data-selector="max-spm"]'),
        $avgEfficiency = $page.find('[data-selector="avg-efficiency"]'),
        $maxEfficiency = $page.find('[data-selector="max-efficiency"]'),
        $congrats      = $page.find('#summary-congrats'),
        $details       = $page.find('#summary-details'),
        $finish        = $page.find('#summary-finish'),
        $back          = $page.find('#summary-back');

    // if session summary is loading a past session, change Finish button to Back and change Congrats to Details
    if (isPastSession === true) {
        $finish.hide();
        $congrats.hide();
        $back.show();
        $details.css('display', 'table-cell');
    }

    $page.find('#summary-congrats-session').html(moment(session.getSessionStart()).format('MMMM Do YYYY, HH:mm:ss'));
    $page.find('#summary-details-session').html(moment(session.getSessionStart()).format('MMMM Do YYYY, HH:mm:ss'));

    var duration = moment.duration(session.getSessionEnd() - session.getSessionStart());
    var durationFormatted = utils.lpad(duration.hours(), 2)
        + ':' + utils.lpad(duration.minutes(), 2) + ":" + utils.lpad(duration.seconds(), 2);

    var distance = context.displayMetric('distance', session.getDistance());
    var avgSpeed = context.displayMetric('speed', session.getAvgSpeed());
    var maxSpeed = context.displayMetric('speed', session.getTopSpeed());
    var avgSPM = context.displayMetric('spm', session.getAvgSpm());
    var maxSPM = context.displayMetric('spm', session.getTopSpm());
    var avgEfficiency = context.displayMetric('efficiency', session.getAvgEfficiency());
    var maxEfficiency = context.displayMetric('efficiency', session.getTopEfficiency());

    $duration.html('<b>' + durationFormatted + '</b>' + ' H');
    $distance.html('<b>' + distance + '</b> ' + context.getUnit('distance'));
    $avgSpeed.html('<b>' + avgSpeed + '</b> ' + context.getUnit('speed'));
    $maxSpeed.html('<b>' + maxSpeed + '</b> ' + context.getUnit('speed'));
    $avgSPM.html('<b>' + avgSPM + '</b> ' + context.getUnit('spm'));
    $maxSPM.html('<b>' + maxSPM + '</b> ' + context.getUnit('spm'));
    $avgEfficiency.html('<b>' + avgEfficiency + '</b> ' + context.getUnit('efficiency'));
    $maxEfficiency.html('<b>' + maxEfficiency + '</b> ' + context.getUnit('efficiency'));

    $finish.on('tap', function () {

        App.load('home', undefined, undefined, function () {
            App.removeFromStack();
        });
    });
}


exports.SessionSummaryView = SessionSummaryView;
