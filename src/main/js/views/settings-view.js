'use strict';

var Settings = require('../model/settings');
var Api = require('../server/api');

function SettingsView(page, settings) {
    var $calibration = $('#calibration', page)
        , $back = $('.back-button', page)
        , $logout = $('#logout', page)
        , $page = $(page)
        , $units = $('#pick-units', page)
        , $wifi = $('#wifi', page)
        , $layout = $('#layout', page);

    if (settings.getUnits() === Settings.CONSTANTS.MI) {
        $units.prop('checked', true);
    }

    if (settings.isSyncOnlyOnWifi()) {
        $wifi.prop('checked', true);
    }

    if (settings.isRestoreLayout()) {
        $layout.prop('checked', true);
    }

    $calibration.off('touchstart').on('touchstart', function () {
        App.load('calibration');
    });

    $logout.off('touchend').on('touchend', function () {
        Api.Auth.logout().done(function () {
            App.load('login');
        });
    });

    $back.off('touchstart').on('touchstart', function () {
        App.back('home', function () {
        });
    });

    $(page).on('appDestroy', function () {
        $calibration.off('touchstart');
        $back.off('touchstart');
    });

    $logout.find('.settings-facebook').html("Logout (" + Api.User.getProfile().name + ")");

    $('[data-selector="version"]', page).html("v. 0.6.0 / u. " + Api.User.getId());

    $page.on('appBeforeBack', function (e) {
        var units = $units.is(':checked') ? Settings.CONSTANTS.MI : Settings.CONSTANTS.KM;
        var wifi = $wifi.is(':checked') ;
        var layout = $layout.is(':checked');
        Settings.saveSettings(units, wifi, layout);

        // update referece that is being used globally
        settings.setUnits(units);
        settings.setSyncOnlyOnWifi(wifi);
        settings.setRestoreLayout(layout);
    });

}


exports.SettingsView = SettingsView;