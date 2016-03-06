'use strict';

function lpad(value, places) {
    var pad = new Array(places + 1).join('0');
    var str = value + "";
    return pad.substring(0, pad.length - str.length) + str;
}
function round(value, decimalPlaces) {
    if (decimalPlaces === 0) return value;

    var precision = Math.pow(10, decimalPlaces);
    return Math.round(value * precision) / precision;
}

function round2(value) {
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
                "Paddler",  // title
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

    // set to either landscape
    screen.lockOrientation('portrait');

    window.powermanagement.acquire();

    StatusBar.overlaysWebView( false );
    StatusBar.backgroundColorByHexString('#ffffff');
    StatusBar.styleDefault();
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