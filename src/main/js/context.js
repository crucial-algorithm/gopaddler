'use strict';

var utils = require('./utils/utils');


var units = {

    metric: {
        timer: {
            label: {regular: "", large: ""},
            decimalPlaces: 0
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
        }
    },
    imperial: {
        timer: {
            label: {regular: "", large: ""},
            decimalPlaces: 0
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
        }
    }
};


function Context(settings) {
    this._settings = settings;
    this._system = this._settings.isImperial() ? 'imperial' : 'metric';
}

Context.prototype.preferences = function () {
    return this._settings;
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
 */
Context.prototype.navigate = function (target, clear) {
    if (target === 'session' && this._settings.isShowTouchGestures()) {
        target = 'session-basic-touch-tutorial';
    }

    if (clear === true) App.destroyStack();

    App.load(target);
};

exports.Context = Context;