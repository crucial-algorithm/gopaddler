'use strict';


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
            decimalPlaces: 1
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
}

Context.prototype.preferences = function () {
    return this._settings;
}

/**
 *
 * @param type
 * @param large
 * @returns {*}
 */
Context.prototype.getUnit = function (type, large) {
    var system = this._settings.isImperial() ? 'imperial' : 'metric';
    var size = large === true ? "large" : "regular";

    return units[system][type].label[size];
};

/**
 *
 * @param type
 * @returns {*}
 */
Context.prototype.getUnitDecimalPlaces = function (type) {
    var system = this._settings.isImperial() ? 'imperial' : 'metric';

    return units[system][type].decimalPlaces;
};


exports.Context = Context;