'use strict';

var utils = require('./utils/utils');
var Api = require('./server/api');
var Dialog = require('./utils/widgets/dialog');


var units = {

    metric: {
        timer: {
            label: {regular: "", large: ""},
            round: false
        },
        splits: {
            label: {regular: "", large: ""},
            round: false
        },
        speed: {
            label: {regular: "Km/h", large: "Km/h"},
            decimalPlaces: 1
        },
        distance: {
            label: {regular: "meters", large: "meters"},
            decimalPlaces: 2
        },
        spm: {
            label: {regular: "SPM", large: "SPM"},
            decimalPlaces: 1
        },
        efficiency: {
            label: {regular: "m", large: "meters"},
            decimalPlaces: 1
        },
        pace: {
            label: {regular: "Min/Km", large: "Min/Km"},
            round: false
        },
        heartRate: {
            label: {regular: "BPM", large: "BPM"},
            round: false
        },
        distance_in_session_list: {
            label: {regular: "Km", large: "Km"},
            decimalPlaces: 2
        }
    },
    imperial: {
        timer: {
            label: {regular: "", large: ""},
            round: false
        },
        splits: {
            label: {regular: "", large: ""},
            round: false
        },
        speed: {
            label: {regular: "Mi/h", large: "Mi/h"},
            decimalPlaces: 1
        },
        distance: {
            label: {regular: "Mi", large: "Mi"},
            decimalPlaces: 2
        },
        spm: {
            label: {regular: "SPM", large: "SPM"},
            decimalPlaces: 1
        },
        efficiency: {
            label: {regular: "ft", large: "ft"},
            decimalPlaces: 1
        },
        pace: {
            label: {regular: "Min/Mi", large: "Min/Mi"},
            round: false
        },
        heartRate: {
            label: {regular: "BPM", large: "BPM"},
            round: false
        },
        distance_in_session_list: {
            label: {regular: "Mi", large: "Mi"},
            decimalPlaces: 2
        }
    }
};


function Context(settings, environment) {
    this._settings = settings;
    this._environment = environment;
    this._system = this._settings.isImperial() ? 'imperial' : 'metric';
    this.ui = new UI(this);
}

Context.prototype.preferences = function () {
    return this._settings;
};

Context.prototype.isDev = function () {
    return this._environment === 'dev';
};

Context.prototype.isPortraitMode = function () {
    return this._settings.isPortraitMode();
};

/**
 *
 * @param type
 * @param large
 * @returns {*}
 */
Context.prototype.getUnit = function (type, large) {
    var size = large === true ? "large" : "regular";

    return units[this._system][type].label[size];
};

/**
 * Should we round this type?
 * @param type
 * @returns {boolean}
 */
Context.prototype.round = function (type) {
    return units[this._system][type].round !== false && units[this._system][type].decimalPlaces > 0;
};

/**
 *
 * @param type
 * @returns {*}
 */
Context.prototype.getUnitDecimalPlaces = function (type) {
    return units[this._system][type].decimalPlaces;
};

Context.prototype.displayMetric = function (type, value) {
    if (units[this._system][type] === undefined) {
        throw 'unkown field type - ' + type;
    }

    if (isNaN(value)) return 0;

    return utils.round(value, this.getUnitDecimalPlaces(type));
};

/**
 * navigate to target
 * @param target
 * @param clear
 * @param args
 */
Context.prototype.navigate = function (target, clear, args) {
    if (target === 'session' && this._settings.isShowTouchGestures()) {
        target = 'session-basic-touch-tutorial';
    }

    if (target === 'calibration' && this._settings.isShowCalibrationTips()) {
        target = 'calibration-help';
    }

    if (clear === true) App.destroyStack();

    App.load(target, args, undefined, function () {
        if (clear === true)
            App.removeFromStack();
    });
};

Context.prototype.userHasCoach = function () {
    return Api.User.hasCoach();
};

Context.prototype.getGpsRefreshRate = function () {
    return this._settings.getGpsRefreshRate();
};

Context.prototype.setGpsRefreshRate = function (rate) {
    return this._settings.setGpsRefreshRate(rate);
};

Context.prototype.getMaxHearthRate = function () {
    return this._settings.getMaxHeartRate();
};

Context.prototype.setMaxHeartRate = function (rate) {
    return this._settings.setMaxHeartRate(rate);
};

Context.prototype.getServerClockGap = function () {
    return this._settings.getServerClockGap();
};

Context.prototype.setServerClockGap = function (gap) {
    return this._settings.setServerClockGap(gap);
};

Context.prototype.render = function (page, template) {
    var $page = $(page), $content;
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
};


var UI = function (ctx) {
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
};

exports.Context = Context;
