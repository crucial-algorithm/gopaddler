'use strict';

function pdOnDeviceReady(successCallback, failureCallback, interval) {
    if (document.pd_device_ready) {
        clearInterval(interval);
        successCallback.apply(undefined, []);
        return;
    }
    if (interval === undefined) {
        interval = setInterval(function () {
            pdOnDeviceReady(successCallback, failureCallback, interval);
        }, 1000);

        document['retries_' + interval] = 0;

    }

    if (document['retries_' + interval] >= 10) {
        // give up... we are probably in developer mode
        clearInterval(interval);

        if ($.isFunction(failureCallback))
            failureCallback.apply(undefined, []);


        // clean up
        delete document['retries_' + interval];
        return;
    }

    document['retries_' + interval]++;
}

function lpad(value, places) {
    var pad = new Array(places + 1).join('0');
    var str = value + "";
    return pad.substring(0, pad.length - str.length) + str;
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function onWifi() {
    return navigator.connection.type === Connection.ETHERNET || navigator.connection.type === Connection.WIFI;
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
    screen.lockOrientation('landscape');

    window.powermanagement.acquire();

    StatusBar.overlaysWebView( false );
    StatusBar.backgroundColorByHexString('#ffffff');
    StatusBar.styleDefault();
}

exports.pdOnDeviceReady = pdOnDeviceReady;
exports.mapBrowserToNative = mapBrowserToNative;
exports.lpad = lpad;
exports.round2 = round2;
exports.toRadians = toRadians;
exports.onWifi = onWifi;