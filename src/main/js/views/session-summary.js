'use strict';

var utils = require('../utils/utils.js');

function SessionSummaryView(page, context, session) {
    var self = this ,$page = $(page)
        , $duration = $page.find('[data-selector="duration"]')
        , $distance = $page.find('[data-selector="distance"]')
        , $avgSpeed = $page.find('[data-selector="avg-speed"]')
        , $maxSpeed = $page.find('[data-selector="max-speed"]')
        , $avgSPM = $page.find('[data-selector="avg-spm"]')
        , $maxSPM = $page.find('[data-selector="max-spm"]')
        , $avgEfficiency = $page.find('[data-selector="avg-efficiency"]')
        , $maxEfficiency = $page.find('[data-selector="max-efficiency"]')
        , $finish = $page.find('#summary-finish')
        ;

    $page.find('.summary-congrats-session').html(moment(session.getSessionStart()).format('MMMM Do YYYY, HH:mm:ss'));

    var duration = moment.duration(session.getSessionEnd() - session.getSessionStart());
    var durationFormatted = utils.lpad(duration.hours(), 2)
        + ':' + utils.lpad(duration.minutes(), 2) + ":" + utils.lpad(duration.seconds(), 2);

    $duration.html('<b>' + durationFormatted + '</b>' + ' H');
    $distance.html('<b>' + (session.getDistance() || 0) + '</b> ' + context.getUnit('distance'));
    $avgSpeed.html('<b>' + (session.getAvgSpeed() || 0) + '</b> ' + context.getUnit('speed'));
    $maxSpeed.html('<b>' + (session.getTopSpeed() || 0) + '</b> ' + context.getUnit('speed'));
    $avgSPM.html('<b>' + (session.getAvgSpm() || 0) + '</b> ' + context.getUnit('spm'));
    $maxSPM.html('<b>' + (session.getTopSpm() || 0) + '</b> ' + context.getUnit('spm'));
    $avgEfficiency.html('<b>' + (session.getAvgEfficiency() || 0) + '</b> ' + context.getUnit('efficiency'));
    $maxEfficiency.html('<b>' + (session.getTopEfficiency() || 0) + '</b> ' + context.getUnit('efficiency'));

    $finish.on('click', function () {
        App.destroyStack();
        App.load('home');

    });
}


exports.SessionSummaryView = SessionSummaryView;