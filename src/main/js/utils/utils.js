'use strict';

function lpad(value, places) {
    var pad = new Array(places + 1).join('0');
    var str = value + "";
    return pad.substring(0, pad.length - str.length) + str;
}
function round(value, decimalPlaces) {
    if (decimalPlaces === 0) return Math.round(value);

    var precision = Math.pow(10, decimalPlaces);
    return Math.round(value * precision) / precision;
}

function round2(value) {
    if (!value) return 0;
    return Math.round(value * 100) / 100;
}

function round1(value) {
    return Math.round(value * 10) / 10;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function isNetworkConnected() {

    return navigator.connection.type === Connection.ETHERNET ||
        navigator.connection.type === Connection.WIFI ||
        navigator.connection.type === Connection.CELL_2G ||
        navigator.connection.type === Connection.CELL_3G ||
        navigator.connection.type === Connection.CELL_4G ||
        navigator.connection.type === Connection.CELL;
}

function onWifi() {
    return navigator.connection.type === Connection.ETHERNET || navigator.connection.type === Connection.WIFI;
}

function avg(arr) {
    if (arr.length === 0) return 0;
    var value = 0;
    for (var i = 0; i < arr.length; i++) {
        value += arr[i];
    }
    return value / arr.length;
}

function kmToMiles(kms) {
    return kms * 0.621371;
}

function meterToFeet(meters) {
    return meters * 3.28084;
}

/**
 * Convert actions from browser actions into native ones (by registering plugins)
 */
function mapBrowserToNative() {

    // Override default HTML alert with native dialog
    if (navigator.notification) {
        window.alert = function (message) {
            navigator.notification.alert(
                message,    // message
                null,       // callback
                "GoPaddler",  // title
                'OK'        // buttonName
            );
        };

        window.confirm = function (message, callback) {
            return navigator.notification.confirm(message, callback, "Paddler", null)
        }
    }

    document.addEventListener("backbutton", function (e) {
        try {
            App.back();
        } catch (te) {
            console.log(te);
        }
    }, false);

    window.powermanagement.acquire();

    StatusBar.overlaysWebView( false );
    StatusBar.backgroundColorByHexString('#ffffff');
    StatusBar.styleDefault();
}


function notify(username, message) {
    if (navigator.userAgent === 'gp-dev-ck') {
        console.log("[" + username + "] " + message);
        return;
    }

    $.ajax({
        type: "POST",
        url: "https://hooks.slack.com/services/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",
        data: JSON.stringify({text: "[" + username + "] " + message
            , username: "GoPaddler", icon_emoji: ":monkey_face:"}),
        dataType: "json"
    });
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function numberOrZero(n) {
    return typeof n === "number" ? n : 0

}

function EndlessIterator(from, to) {
    var position = from - 1;
    var random;

    to = numberOrZero(to);

    // not proper behavior, but required for the usage in session-view! handle from = 1 and to = 0
    if (from > to) {
        return new NeverLockIterator();
    }

    random = getRandomInt(from, to);

    this.next = function () {
        position++;

        if (position > to) {
            position = from;
        }

        return position;
    };

    /**
     * Acquired position at a regular step
     * Locked means that position matches the step
     * @returns {boolean}
     */
    this.locked = function () {
        return position === random;
    }
}

function NeverLockIterator() {
    this.next = function () {
    };
    this.locked = function () {
        return false;
    }
}

/**
 * Hack to force safari to reflow and make layout's ok again
 * @param dom
 */
function forceSafariToReflow(dom) {
    dom.style.display='none';
    dom.offsetHeight; // no need to store this anywhere, the reference is enough
    dom.style.display='';
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function loopAsync(list, callback) {
    var originalList = list.slice(0);
    list = list.slice(0);
    var value = list.pop();

    var iterator = {
        next: function () {
            value = list.pop();
            callback.apply({}, [iterator]);
        },

        current: function () {
            return value;
        },

        isFinished: function () {
            return list.length === 0;
        },

        finish: function () {
            list = [];
        },

        restart: function () {
            list = originalList.slice(0);
        }
    };

    callback.apply({}, [iterator])
}

exports.mapBrowserToNative = mapBrowserToNative;
exports.lpad = lpad;
exports.round2 = round2;
exports.round1 = round1;
exports.round = round;
exports.toRadians = toRadians;
exports.isNetworkConnected = isNetworkConnected;
exports.onWifi = onWifi;
exports.avg = avg;
exports.kmToMiles = kmToMiles;
exports.meterToFeet = meterToFeet;
exports.notify = notify;
exports.EndlessIterator = EndlessIterator;
exports.forceSafariToReflow = forceSafariToReflow;
exports.guid = guid;
exports.getRandomInt = getRandomInt;
exports.loopAsync = loopAsync;
