'use strict';

var Settings = require('../model/settings');
var Api = require('../server/api');

function SettingsView(page, settings) {
    var $calibration = $('#calibration', page)
        , $back = $('.back-button', page)
        , $logout = $('#logout', page)
        , $page = $(page)
        , $units = $('#pick-units', page)
        , $blackAndWhite = $('#black-and-white', page)
        , $calibrationHelp = $('.settings-calibrate-help', page)
        , $layout = $('#layout', page);

    if (settings.getUnits() === Settings.CONSTANTS.MI) {
        $units.prop('checked', true);
    }

    if (settings.isShowBlackAndWhite()) {
        $blackAndWhite.prop('checked', true);
    }

    if (settings.isRestoreLayout()) {
        $layout.prop('checked', true);
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

    $back.on('tap', function () {
        App.back('home', function () {
        });
    });

    $(page).on('appDestroy', function () {
        $calibration.off('touchstart');
        $back.off('touchstart');
    });

    $logout.find('.settings-facebook').html("Logout (" + Api.User.getProfile().name + ")");
    
    $('[data-selector="version"]', page).html("v. 0.8.8 / u. " + Api.User.getId());

    $('.settings-website-text', page).on('click', function () {
        window.open('https://app.gopaddler.com/', '_system');
    });

    $page.on('appBeforeBack', function (e) {
        var units = $units.is(':checked') ? Settings.CONSTANTS.MI : Settings.CONSTANTS.KM;
        var blackAndWhite = $blackAndWhite.is(':checked') ;
        var layout = $layout.is(':checked');
        Settings.saveSettings(units, blackAndWhite, layout);

        // update reference that is being used globally
        settings.setUnits(units);
        settings.setShowBlackAndWhite(blackAndWhite);
        settings.setRestoreLayout(layout);
    });

}


exports.SettingsView = SettingsView;
