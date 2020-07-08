'use strict';

import Dialog from './utils/widgets/dialog';
import Api from './server/api';
import Utils from './utils/utils';

const units = {
    metric: {
        timer: {
            label: {regular: "units_metric_timer_regular", large: "units_metric_timer_large"},
            round: false
        },
        splits: {
            label: {regular: "units_metric_splits_regular", large: "units_metric_splits_large"},
            round: false
        },
        speed: {
            label: {regular: "units_metric_speed_regular", large: "units_metric_speed_large"},
            decimalPlaces: 1
        },
        averageSpeed: {
            label: {regular: "units_metric_speed_regular", large: "units_metric_speed_large"},
            decimalPlaces: 1
        },
        distance: {
            label: {regular: "units_metric_distance_regular", large: "units_metric_distance_large"},
            decimalPlaces: 2
        },
        spm: {
            label: {regular: "units_metric_spm_regular", large: "units_metric_spm_large"},
            decimalPlaces: 1
        },
        efficiency: {
            label: {regular: "units_metric_efficiency_regular", large: "units_metric_efficiency_large"},
            decimalPlaces: 1
        },
        strokes: {
            label: {regular: "units_metric_strokes_regular", large: "units_metric_strokes_large"},
            decimalPlaces: 1
        },
        pace: {
            label: {regular: "units_metric_pace_regular", large: "units_metric_pace_large"},
            round: false
        },
        heartRate: {
            label: {regular: "units_metric_heartRate_regular", large: "units_metric_heartRate_large"},
            decimalPlaces: 0
        },
        distance_in_session_list: {
            label: {regular: "units_metric_distance_in_session_list_regular", large: "units_metric_distance_in_session_list_large"},
            decimalPlaces: 2
        },
        elevation: {
            label: {regular: "units_metric_elevation_regular", large: "units_metric_elevation_large"},
            round: false
        }
    },
    imperial: {
        timer: {
            label: {regular: "units_imperial_timer_regular", large: "units_imperial_timer_large"},
            round: false
        },
        splits: {
            label: {regular: "units_imperial_splits_regular", large: "units_imperial_splits_large"},
            round: false
        },
        speed: {
            label: {regular: "units_imperial_speed_regular", large: "units_imperial_speed_large"},
            decimalPlaces: 1
        },
        averageSpeed: {
            label: {regular: "units_imperial_speed_regular", large: "units_imperial_speed_large"},
            decimalPlaces: 1
        },
        distance: {
            label: {regular: "units_imperial_distance_regular", large: "units_imperial_distance_large"},
            decimalPlaces: 2
        },
        spm: {
            label: {regular: "units_imperial_spm_regular", large: "units_imperial_spm_large"},
            decimalPlaces: 1
        },
        efficiency: {
            label: {regular: "units_imperial_efficiency_regular", large: "units_imperial_efficiency_large"},
            decimalPlaces: 1
        },
        strokes: {
            label: {regular: "units_imperial_strokes_regular", large: "units_imperial_strokes_large"},
            decimalPlaces: 1
        },
        pace: {
            label: {regular: "units_imperial_pace_regular", large: "units_imperial_pace_large"},
            decimalPlaces: 0
        },
        heartRate: {
            label: {regular: "units_imperial_heartRate_regular", large: "units_imperial_heartRate_large"},
            round: false
        },
        distance_in_session_list: {
            label: {regular: "units_imperial_distance_in_session_list_regular", large: "units_imperial_distance_in_session_list_large"},
            decimalPlaces: 2
        },
        elevation: {
            label: {regular: "units_imperial_elevation_regular", large: "units_imperial_elevation_large"},
            decimalPlaces: 0
        }
    }
};

/**
 * @typedef {Object} AppConfig
 * @property {number} distanceStep
 */

class Context {

    /**
     *
     * @return {{SPEED: string, SPM: string, DISTANCE: string, SPLITS: string, AVERAGE_SPEED: string, HEART_RATE: string, PACE: string, TIMER: string, DISTANCE_IN_SESSION_LIST: string, ELEVATION: string, EFFICIENCY: string, STROKES: string}}
     * @constructor
     */
    static FIELD_TYPES() {
        return {
            TIMER: 'timer'
            , SPLITS: 'splits'
            , SPEED: 'speed'
            , AVERAGE_SPEED: 'averageSpeed'
            , DISTANCE: 'distance'
            , SPM: 'spm'
            , EFFICIENCY: 'efficiency'
            , STROKES: 'strokes'
            , PACE: 'pace'
            , HEART_RATE: 'heartRate'
            , DISTANCE_IN_SESSION_LIST: 'distance_in_session_list'
            , ELEVATION: 'elevation'
        }
    }

    /**
     *
     * @param {Settings} settings
     * @param environment
     * @param translateFn
     * @param language
     */
    constructor(settings, environment, translateFn, language) {
        this._settings = settings;
        this._environment = environment;
        this._system = this._settings.isImperial() ? 'imperial' : 'metric';

        this._translate = translateFn;
        this._language = language;

        this._ui = Context.UI(this);

        this._coachAcceptedRequestListeners = [];
        this._userConnectedToStrava = [];

        this._coachInviteTokenResolver = null;
    }

    preferences() {
        return this._settings;
    }

    isDev() {
        return this._environment === 'dev';
    }

    isPortraitMode() {
        return this._settings.isPortraitMode();
    }

    /**
     *
     * @return {boolean}
     */
    isImperial() {
        return this._settings.isImperial()
    }

    /**
     *
     * @param {string} type
     * @param {boolean} large
     * @return {string}
     */
    getUnit(type, large) {
        var size = large === true ? "large" : "regular";

        return this.translate(units[this._system][type].label[size]);
    }

    /**
     * Should we round this type?
     * @param type
     * @returns {boolean}
     */
    round(type) {
        return units[this._system][type].round !== false && units[this._system][type].decimalPlaces >= 0;
    }

    getUnitDecimalPlaces(type) {
        return units[this._system][type].decimalPlaces;
    }

    /**
     *
     * @param {string}  type                     field name
     * @param {number}  value                    field value
     * @param {boolean} reduceNextLogicalUnit    field value
     * @return {number}
     */
    displayMetric(type, value, reduceNextLogicalUnit = false) {
        if (units[this._system][type] === undefined) {
            throw 'unknown field type - ' + type;
        }

        if (isNaN(value)) return 0;

        const isImperial = this._settings.isImperial();

        if (isImperial && type === Context.FIELD_TYPES().DISTANCE
            || type === Context.FIELD_TYPES().AVERAGE_SPEED
            || type === Context.FIELD_TYPES().SPEED) {
            value = reduceNextLogicalUnit ? Utils.meterToFeet(value * 1000) : Utils.kmToMiles(value)
        }

        if (isImperial && type === Context.FIELD_TYPES().ELEVATION) {
            value = Utils.meterToFeet(value);
        }

        if (this.round(type))
            return Utils.round(value, this.getUnitDecimalPlaces(type));

        return value;
    }

    navigate(target, clear, args) {

        if (target === 'calibration' && this._settings.isShowCalibrationTips()) {
            target = 'calibration-help';
        }

        if (target === 'home' && Api.User.isShowOnboarding()) {
            target = 'choose-sport';
        }

        if (clear === true) App.destroyStack();

        App.load(target, args, undefined, function () {
            if (clear === true)
                App.removeFromStack();
        });
    }

    triggerCoachAcceptedRequest(payload) {
        for (let callback of this._coachAcceptedRequestListeners) {
            callback.apply({}, [payload])
        }
    }

    listenToCoachAcceptedRequest(callback) {
        this._coachAcceptedRequestListeners.push(callback);
    }

    triggerUserConnectedToStrava(payload) {
        for (let callback of this._userConnectedToStrava) {
            callback.apply({}, [payload])
        }
    }

    listenToUserConnectingToStrava(callback) {
        this._userConnectedToStrava.push(callback);
    }


    isShowTouchGestures() {
        return this._settings.isShowTouchGestures();
    }

    static userHasCoach() {
        return Api.User.hasCoach();
    }

    getGpsRefreshRate() {
        return this._settings.getGpsRefreshRate();
    }

    setGpsRefreshRate(rate) {
        return this._settings.setGpsRefreshRate(rate);
    }

    getRestingHeartRate() {
        /**@type Settings*/
        return this._settings.getRestingHeartRate();
    }

    setRestingHeartRate(rate) {
        return this._settings.setRestingHeartRate(rate);
    }

    getMaxHeartRate() {
        return this._settings.getMaxHeartRate();
    }

    setMaxHeartRate(rate) {
        return this._settings.setMaxHeartRate(rate);
    }

    getServerClockGap() {
        return this._settings.getServerClockGap();
    }

    setServerClockGap(gap) {
        return this._settings.setServerClockGap(gap);
    }

    translate(key, placeholders) {
        return this._translate(key, placeholders);
    }

    setLanguage(language) {
        this._language = language;
    }

    getLanguage() {
        return this._language;
    }

    isAndroid() {
        return device.platform === "Android"
    }

    isIOS() {
        return device.platform === "iOS"
    }

    get ui() {
        return this._ui;
    }

    get coachInviteTokenResolver() {
        return this._coachInviteTokenResolver;
    }

    set coachInviteTokenResolver(value) {
        this._coachInviteTokenResolver = value;
    }

    static render(page, template) {
        let $page = $(page), $content;
        $page.append(template);

        if (($content = $page.find('[data-no-scroll="true"]')).length) {
            $content.height($(window).height())
        }

        $page.find('.paddler-back').off('click').on('click', function () {
            App.back();
        });

        $page.find('[data-back]:not([data-manual-back])').off('click').on('click', function () {
            App.back();
        })
    }

    static LiveStatus() {
        return {
            AWAITING_TO_START: 'Ready',
            RUNNING: 'Running',
            OFFLINE: 'Offline'
        }
    }

    static UI(ctx) {
        return {
            infiniteProgressBarForLi: function ($insertAfterElem, isInfinite) {
                var $progress = $('<div class="progress-line"/>');
                var $container = $('<li/>');
                var $alignLi = $('<li style="height: 0"/>');

                if (isInfinite === false) {
                    $progress
                        .removeClass('progress-line')
                        .addClass('progress-waiting-cancel');
                }

                if (ctx.isPortraitMode()) {
                    $container = $progress;
                } else {
                    $progress.appendTo($container);
                }

                $container.insertAfter($insertAfterElem);
                $alignLi.insertAfter($container);

                return {
                    cleanup: function () {
                        $container.remove();
                        $alignLi.remove();
                    },

                    $progress: function() {
                        return $progress
                    },

                    $container: function () {
                        return $container;
                    }
                }

            },

            modal: {
                alert: function (title, message, primary) {
                    return Dialog.alert(ctx.isPortraitMode(), title, message, primary);
                },

                undecorated: function ($content) {
                    return Dialog.undecorated(ctx.isPortraitMode(), $content);
                },

                confirm: function(title, message, primary, secondary) {
                    return Dialog.confirm(ctx.isPortraitMode(), title, message, primary, secondary);
                }
            }

        }
    }
}

export default Context;
