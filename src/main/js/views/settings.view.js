'use strict';

import Context from '../context';
import Calibration from '../model/calibration';
import Api from '../server/api';
import Settings from '../model/settings';
import template from './settings.art.html';
import AppSettings from "../utils/app-settings";


class SettingsView {
    constructor(page, context, settings) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));
        let $calibration = $('#calibration', page)
            , $bluetooth = $('#bluetooth', page)
            , $back = $('.back-button', page)
            , $profile = $('#profile', page)
            , $page = $(page)
            , $units = $('#pick-units', page)
            , $boat = $('#pick-boat', page)
            , $blackAndWhite = $('#black-and-white', page)
            , $calibrationHelp = $('.settings-calibrate-help', page)
            , $gpsUpdateRate = $('#gps-update-rate', page)
            , $language = $('#language', page)
            , $coach = $('#coach', page)
            , $maxHeartRate = $('#max-heart-rate', page)
            , $strava = $('#strava', page)
            , $layout = $('#layout', page)
            , $portraitMode = $('#portrait-mode', page)
            , isPortraitMode = settings.isPortraitMode();

        if (Api.User.boat() === "C") {
            $boat.prop('checked', true)
        }

        if (settings.getUnits() === Settings.CONSTANTS().MI) {
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

        $bluetooth.on('tap', function () {
            App.load('bluetooth');
        });

        $gpsUpdateRate.on('tap', function () {
            App.load('define-gps-update-rate');
        });

        $maxHeartRate.on('tap', function () {
            App.load('define-heart-rate');
        });

        $language.on('tap', function () {
            App.load('define-language');
        });

        $coach.on('tap', function () {
            App.load('manage-coach');
        });

        $profile.on('tap', function () {
            App.load('profile');
        });

        $strava.on('tap', function () {
            App.load('strava');
        });

        $(page).on('appDestroy', function () {
            $calibration.off('touchstart');
            $back.off('touchstart');
        });

        $portraitMode.on('click', () => {
            if (isPortraitMode === true) {
                $portraitMode.removeClass('settings-option-orientation-portrait')
                    .addClass('settings-option-orientation-landscape');
            } else {
                $portraitMode.removeClass('settings-option-orientation-landscape')
                    .addClass('settings-option-orientation-portrait');
            }
            isPortraitMode = !isPortraitMode;
        });

        $('[data-selector="version"]', page).html('&nbsp;' + __VERSION__);

        $('.settings-website-text', page).on('click', function () {
            window.open(__WEB_URL__, '_system');
        });

        $boat.on('change', function () {
            var choice = $boat.is(':checked') ? "C" : "K";
            Api.User.saveBoat(choice).fail(function (err) {
                var title = context.translate('settings_update_boat_failed'), text = '<p>' + context.translate('settings_update_boat_failed_message') + '</p><p>' + context.translate('settings_update_boat_failed_try_again_later') + '</p>';
                if (err && err.error === 504) {
                    text = "<p>" + context.translate('settings_update_boat_failed_internet_is_required') + "</p>";
                }

                if (err && err.error === 408) {
                    text = "<p>" + context.translate('settings_update_boat_failed_server_unavailable') + "</p><p>" + context.translate('settings_update_boat_failed_server_back_soon') + "</p>"
                }

                context.ui.modal.alert(title, text, {text: context.translate('settings_update_boat_failed_acknowledge')});

                $boat.prop('checked', !$boat.is(':checked'));

            })
        });

        $page.on('appBeforeBack', function (e) {

            let units = $units.is(':checked') ? Settings.CONSTANTS().MI : Settings.CONSTANTS().KM;
            let blackAndWhite = $blackAndWhite.is(':checked') ;
            let layout = $layout.is(':checked');

            if (isPortraitMode !== settings.isPortraitMode() && AppSettings.requiresCalibration()) {
                context.ui.modal.confirm(context.translate('settings_update_orientation_notification')
                    ,  '<p>' + context.translate('settings_update_orientation_notification_line1') + '</p>' +
                    '<p>' + context.translate('settings_update_orientation_notification_line2') + '</p>'
                    , {text: context.translate('settings_update_orientation_notification_accept'), callback: persist.bind(self)}
                    , {text: context.translate('settings_update_orientation_notification_reject'), callback: discard.bind(self)});

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
                        context.ui.modal.alert(context.translate('settings_update_orientation_notification_applying_changes')
                            , '<p>' + context.translate('settings_update_orientation_notification_applying_changes_message') + '</p>', {
                                text: context.translate('settings_update_orientation_notification_applying_changes_acknowledge'),
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
            $('.settings-current-max-heart-rate').text(context.getRestingHeartRate() + " / " + context.getMaxHeartRate());
            $('.settings-current-language').text(context.getLanguage());
            if (Api.User.hasStrava())
                $('[data-selector="strava-current"]').text(Api.User.stravaAthleteName());
        })
    }
}

export default SettingsView;
