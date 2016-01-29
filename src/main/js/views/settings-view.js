'use strict';

var Settings = require('../model/settings');

function SettingsView(page) {
    var $calibration = $('#calibration', page)
        , $back = $('.back-button', page)
        , $logout = $('#logout', page)
        , $page = $(page)
        , $units = $('#pick-units', page)
        , $wifi = $('#wifi', page)
        , $layout = $('#layout', page);

    Settings.loadSettings().then(function (settings) {
        if (settings.getUnits() === 'M') {
            $units.prop('checked', true);
        }

        if (settings.isSyncOnlyOnWifi()) {
            $wifi.prop('checked', true);
        }

        if (settings.getRestoreLayout()) {
            $layout.prop('checked', true);
        }
    });

    $calibration.on('touchstart', function () {
        App.load('calibration');
    });

    $logout.on('touchend', function () {
        Paddler.Session.destroy();
        window.location.reload();
    });


    $back.on('touchstart', function () {
        App.back('home', function () {
        });
    });

    $(page).on('appDestroy', function () {
        $calibration.off('touchstart');
        $back.off('touchstart');
    });

    $logout.find('.settings-facebook').html("Logout (" + Paddler.Session.getUser().getFullName() + ")");

    $page.on('appBeforeBack', function (e) {
        var units = $units.is(':checked') ? 'M' : 'K';
        var wifi = $wifi.is(':checked') ;
        var layout = $layout.is(':checked');
        Settings.saveSettings(units, wifi, layout);
    });

}



exports.SettingsView = SettingsView;