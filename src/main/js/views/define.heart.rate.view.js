var Settings = require('../model/settings');
var template = require('./define.heart.rate.art.html');
var Api = require('../server/api');

function DefineHeartRateView(page, context) {
    var max = context.getMaxHeartRate()
        , resting = context.getRestingHeartRate();

    context.render(page, template({
        isPortraitMode: context.isPortraitMode()
        , resting: resting, max: max
    }));

    var $page = $(page), changed = false, $max = $page.find('#max-heart-rate')
        , $resting = $page.find('#resting-heart-rate');

    $page.find('input').off('change').on('change', function () {
        changed = true;
    });



    $page.on('appBeforeBack', function () {
        if (!changed) return;

        resting = parseInt($resting.val());
        max = parseInt($max.val());

        Api.User.saveHeartRate(resting, max);
        context.setRestingHeartRate(resting);
        context.setMaxHeartRate(max);
        Settings.updateHeartRate(resting, max);
    });

    page.onReady.then(function () {

    })
}

exports.DefineHeartRateView = DefineHeartRateView;
