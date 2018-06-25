'use strict';

var Settings = require('../model/settings');
var Api = require('../server/api');
var template = require('./settings.art.html');
var Calibration = require('../model/calibration').Calibration;

function SettingsView(page, context, settings) {
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));
    var $calibration = $('#calibration', page)
        , $bluetooth = $('#bluetooth', page)
        , $back = $('.back-button', page)
        , $logout = $('#logout', page)
        , $page = $(page)
        , $units = $('#pick-units', page)
        , $boat = $('#pick-boat', page)
        , $blackAndWhite = $('#black-and-white', page)
        , $calibrationHelp = $('.settings-calibrate-help', page)
        , $gpsUpdateRate = $('#gps-update-rate', page)
        , $maxHeartRate = $('#max-heart-rate', page)
        , $layout = $('#layout', page)
        , $portraitMode = $('#portrait-mode', page);

    if (Api.User.getProfile().boat === "C") {
        $boat.prop('checked', true)
    }

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

    $bluetooth.on('tap', function () {
        App.load('bluetooth');
    });

    $gpsUpdateRate.on('tap', function () {
        App.load('define-gps-update-rate');
    });

    $maxHeartRate.on('tap', function () {
        App.load('define-max-heart-rate');
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

    $boat.on('change', function () {
        var choice = $boat.is(':checked') ? "C" : "K";
        Api.User.saveBoat(choice).fail(function (err) {
            var title = "Update boat failed", text = '<p>We ran unto trouble.</p><p>Please do try again later</p>';
            if (err && err.error === 504) {
                text = "<p>Internet connection is required to perform this operation</p>";
            }

            if (err && err.error === 408) {
                text = "<p>Server is unavailable!</p><p>Will be back soon!</p>"
            }

            context.ui.modal.alert(title, text, {text: "ok"});

            $boat.prop('checked', !$boat.is(':checked'));

        })
    });

    $page.on('appBeforeBack', function (e) {

        var units = $units.is(':checked') ? Settings.CONSTANTS.MI : Settings.CONSTANTS.KM;
        var blackAndWhite = $blackAndWhite.is(':checked') ;
        var layout = $layout.is(':checked');
        var isPortraitMode = $portraitMode.is(':checked');

        if (isPortraitMode !== settings.isPortraitMode()) {
            context.ui.modal.confirm('Orientation Changed'
                ,  '<p>Change in screen orientation requires new calibration</p>' +
                   '<p>Are you sure you want to continue?</p>'
                , {text: "Yes", callback: persist.bind(self)}
                , {text: "No", callback: discard.bind(self)});

        } else {
            persist();
        }

        /*  Helpers  */
        /*-----------*/
        function persist() {
            Settings.saveSettings(units, blackAndWhite, layout, isPortraitMode);

            var screenOrientationChanged = isPortraitMode !== settings.isPortraitMode();
            if (screenOrientationChanged) {
                setTimeout(function () {
                    context.ui.modal.alert('Applying changes...', '<p>Your screen will be blank for a few seconds</p>', {
                        text: "ok",
                        callback: function () {
                            Calibration.clear();
                            window.location.reload();
                        }
                    })
                }, 0);
            } else {

                // update reference that is being used globally
                settings.setUnits(units);
                settings.setShowBlackAndWhite(blackAndWhite);
                settings.setRestoreLayout(layout);
                settings.setPortraitMode(isPortraitMode);
            }
        }

        /**
         * Updates everything except for portrait / landscape mode
         */
        function discard() {
            Settings.saveSettings(units, blackAndWhite, layout, settings.isPortraitMode());

            // update reference that is being used globally
            settings.setUnits(units);
            settings.setShowBlackAndWhite(blackAndWhite);
            settings.setRestoreLayout(layout);
            context.navigate('home', true);
        }

        return isPortraitMode === settings.isPortraitMode();

    });

    $page.on('appShow', function () {
        var rate = context.getGpsRefreshRate();
        $('.settings-current-gps-rate').text(rate === 0 ? 'Auto' : rate + " sec");
        $('.settings-current-max-heart-rate').text(context.getMaxHearthRate());
    })
}


exports.SettingsView = SettingsView;
