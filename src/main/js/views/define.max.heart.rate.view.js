var Settings = require('../model/settings');
var template = require('./define.max.heart.rate.art.html');
var Api = require('../server/api');

function DefineMaxHeartRateView(page, context) {
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));
    var current = context.getMaxHearthRate();

    var $page = $(page);
    var selected = current;
    var changed = false;
    $page.on('click', 'li', function (e) {
        var $target = $(e.target);
        var option = $target.data('option');

        $('li').removeClass('selected');
        $target.addClass('selected');

        selected = option;
        changed = true;
    });

    $page.on('appBeforeBack', function () {
        if (!changed) return;

        Api.User.saveMaxHeartRate(parseInt(selected));
        context.setMaxHeartRate(selected);
        Settings.updateMaxHeartRate(selected);
    });

    page.onShown.then(function () {
        var $li = $('li[data-option="' + current + '"]').addClass('selected');

        $li[0].scrollIntoView();

    })
}

exports.DefineMaxHeartRateView = DefineMaxHeartRateView;
