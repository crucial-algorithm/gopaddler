'use strict';

function Settings(page) {
    var $calibration = $('#calibration', page),
        $back = $('.back-button', page);

    $calibration.on('touchstart', function () {
        App.load('calibration');
    });

    $('#logout', page).on('touchend', function () {
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
}



exports.SettingsView = Settings;