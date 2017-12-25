'use strict';

var Settings = require('../model/settings');
var Api = require('../server/api');
var template = require('./settings.art.html');

function SettingsView(page, context, settings) {
    context.render(page, template());
    var $calibration = $('#calibration', page)
        , $back = $('.back-button', page)
        , $logout = $('#logout', page)
        , $page = $(page)
        , $units = $('#pick-units', page)
        , $blackAndWhite = $('#black-and-white', page)
        , $calibrationHelp = $('.settings-calibrate-help', page)
        , $layout = $('#layout', page)
        , $portraitMode = $('#portrait-mode', page);

    if (settings.getUnits() === Settings.CONSTANTS.MI) {
        $units.prop('checked', true);
    }

    if (settings.isShowBlackAndWhite()) {
        $blackAndWhite.prop('checked', true);
    }

    if (settings.isRestoreLayout()) {
        $layout.prop('checked', true);
    }

    if (settings.isPortraitMode()) {
        $portraitMode.prop('checked', true);
    }

    $calibration.on('tap', function () {
        App.load('calibration');
    });

    $calibrationHelp.on('tap', function () {
        App.load('calibration-help');
    });

    $logout.on('tap', function () {
        Api.Auth.logout().done(function () {
            App.load('login');
        });
    });

    $(page).on('appDestroy', function () {
        $calibration.off('touchstart');
        $back.off('touchstart');
    });

    var user = Api.User.getProfile().name ? Api.User.getProfile().name : Api.User.getProfile().email;

    user += " / " + Api.User.getId();

    $logout.find('.settings-facebook').html("Logout (" + user + ")");

    $('[data-selector="version"]', page).html(__VERSION__);

    $('.settings-website-text', page).on('click', function () {
        window.open(__WEB_URL__, '_system');
    });

    $page.on('appBeforeBack', function (e) {
        var units = $units.is(':checked') ? Settings.CONSTANTS.MI : Settings.CONSTANTS.KM;
        var blackAndWhite = $blackAndWhite.is(':checked') ;
        var layout = $layout.is(':checked');
        var isPortraitMode = $portraitMode.is(':checked');
        Settings.saveSettings(units, blackAndWhite, layout, isPortraitMode);

        // update reference that is being used globally
        settings.setUnits(units);
        settings.setShowBlackAndWhite(blackAndWhite);
        settings.setRestoreLayout(layout);
        settings.setPortraitMode(isPortraitMode);
    });

}


exports.SettingsView = SettingsView;
