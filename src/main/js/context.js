'use strict';

var utils = require('./utils/utils');
var Api = require('./server/api');


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
            label: {regular: "Km", large: "Km"},
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
        }
    }
};


function Context(settings, environment) {
    this._settings = settings;
    this._environment = environment;
    this._system = this._settings.isImperial() ? 'imperial' : 'metric';
}

Context.prototype.preferences = function () {
    return this._settings;
};

Context.prototype.isDev = function () {
    return this._environment === 'dev';
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

exports.Context = Context;