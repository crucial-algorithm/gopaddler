'use strict';

var utils = require('./utils/utils');

// override functions when in testing (deviceready not triggered)
// --------------------------------------------------------------

if (!window.sqlitePlugin) {

    var _open = window.openDatabase;
    window.sqlitePlugin = window;

    window.sqlitePlugin.openDatabase = function (args) {
        return _open(args.name, "1.0", "Static desc", 200000);
    }
}

function emulateCordova () {
    var _open = window.openDatabase;
    window.sqlitePlugin = window;

    window.cordova = {
        InAppBrowser: {open: window.open}
    };

    var executeSql = function (sql, args, success, error) {
        success = success || function(){};
        if (sql.toLowerCase().substr(0, 3) === 'ins') {
            success({insertId: 1234});
        } else if (sql === "SELECT * FROM settings") {
            var data = [
                {version: 1, units: 'K', black_and_white: false, restore_layout: true, portrait_mode: __IS_PORTRAIT_MODE__, gps_rate: 0, max_heart_rate: 186}
            ];
            success({
                rows: {
                    length: 14, item: function (index) {
                        return data[index];
                    }
                }
            })
        } else if (sql.indexOf("FROM session_data") >= 0) {
            var session = [
                {id: 1, session:1, timestamp: 1, distance: 1, speed:  1, spm: 50, efficiency: 2.2, latitude: 1, longitude: 1, split: -1},
                {id: 1, session:1, timestamp: 1, distance: 1, speed:  1, spm: 50, efficiency: 2.2, latitude: 1, longitude: 1, split: -1},
                {id: 1, session:1, timestamp: 1, distance: 1, speed: 10, spm: 80, efficiency: 4.0, latitude: 1, longitude: 1, split: 0},
                {id: 1, session:1, timestamp: 1, distance: 1, speed: 15, spm: 90, efficiency: 4.5, latitude: 1, longitude: 1, split: 0},
                {id: 1, session:1, timestamp: 1, distance: 1, speed:  1, spm: 50, efficiency: 2.2, latitude: 1, longitude: 1, split: 1},
                {id: 1, session:1, timestamp: 1, distance: 1, speed:  1, spm: 50, efficiency: 2.2, latitude: 1, longitude: 1, split: 1},
                {id: 1, session:1, timestamp: 1, distance: 1, speed: 10, spm: 80, efficiency: 4.0, latitude: 1, longitude: 1, split: 2},
                {id: 1, session:1, timestamp: 1, distance: 1, speed: 15, spm: 90, efficiency: 4.5, latitude: 1, longitude: 1, split: 2},
                {id: 1, session:1, timestamp: 1, distance: 1, speed:  1, spm: 50, efficiency: 2.2, latitude: 1, longitude: 1, split: 3},
                {id: 1, session:1, timestamp: 1, distance: 1, speed:  1, spm: 50, efficiency: 2.2, latitude: 1, longitude: 1, split: 3}
            ];

            success({rows: {length: session.length, item: function (index) {
                return session[index];
            }}})

        } else {
            var data = [
                {id: 1, synced: true, session_start: new Date(), distance: 1, top_speed: 1, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 2, synced: false, session_start: new Date(new Date().getTime() - 86400000), distance: 2, top_speed: 2, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 3, synced: false, session_start: new Date(new Date().getTime() - (2 * 86400000)), distance: 12.34, top_speed: 3, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 4, synced: true, session_start: new Date(new Date().getTime() - (3 * 86400000)), distance: 4, top_speed: 4, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 5, synced: true, session_start: new Date(new Date().getTime() - (4 * 86400000)), distance: 5, top_speed: 5, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 6, synced: true, session_start: new Date(new Date().getTime() - (4 * 86400000)), distance: 6, top_speed: 6, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 7, synced: true, session_start: new Date(new Date().getTime() - (4 * 86400000)), distance: 7, top_speed: 7, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 8, synced: true, session_start: new Date(new Date().getTime() - (5 * 86400000)), distance: 8, top_speed: 8, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 9, synced: false, session_start: new Date(new Date().getTime() - (6 * 86400000)), distance: 9, top_speed: 9, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 10, synced: false, session_start: new Date(new Date().getTime() - (6 * 86400000)), distance: 10, top_speed: 10, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 11, synced: false, session_start: new Date(new Date().getTime() - (7 * 86400000)), distance: 11, top_speed: 11, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 12, synced: false, session_start: new Date(new Date().getTime() - (8 * 86400000)), distance: 12, top_speed: 12, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 13, synced: false, session_start: new Date(new Date().getTime() - (8 * 86400000)), distance: 13, top_speed: 13, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 14, synced: false, session_start: new Date(new Date().getTime() - (9 * 86400000)), distance: 14, top_speed: 14, session_end: new Date(new Date().getTime() + 3600000)}
            ];
            success({rows: {length: 14, item: function (index) {
                return data[index];
            }}})
        }
    };

    window.sqlitePlugin.openDatabase = function (args) {
        return {
            executeSql: executeSql,
            transaction: function (callback) {
                setTimeout(function () {
                    callback({executeSql: executeSql});
                }, 0);
            }
        }
    };

    if (!navigator.connection) {
        navigator.connection = {
            type: 2
        };
    }

    window.Connection = {"WIFI": 1, "ETHERNET": 2};

    window.analytics = {startTrackerWithId: function () {
        }, trackView: function () {
        }, setUserId: function () {
    }};

    window.screen = {
        orientation: {
            lock: function () {
            }
        }
    };
    window.device = {};

    navigator.geolocation.watchPosition = function (callback) {
        // 10 meters per sec (36km/h)       increment = 0.0000904100000
        var latitude = 0.00009041, longitude = 10, increment = 0.0000904100000, multiple = 3;
        return setInterval(function () {
            latitude += increment / multiple;

            callback({
                timestamp: Date.now(),
                coords: {
                    accuracy: 1,
                    latitude: latitude,
                    longitude: longitude,
                    speed: 36 / multiple * 1000 / 3600
                }
            })
        }, 1000);
        // ios: 14km/h -> 1909 update rate
        // ios: 06km/h -> 3537 update rate
    };

    navigator.geolocation.clearWatch = function (id) {
        clearInterval(id);
    };

    navigator.accelerometer = navigator.accelerometer || {};
    navigator.accelerometer.watchAcceleration = function (callback) {
        return setInterval(function () {
            callback({
                timestamp: new Date().getTime(),
                x: 1,
                y: 1,
                z: 1
            });
        }, 10);
    };

    navigator.accelerometer.clearWatch = function (id) {
        clearInterval(id);
    };


    window.bluetoothle = {
        initialize: function (callback) {
            setTimeout(function () {
                callback.apply({}, [{status: 'enabled'}])
            }, 0);
        },
        connect: function (success) {
            setTimeout(function () {
                success.apply({}) // intentionally left blank
            }, 5000);
        },
        disconnect: function (callback) {
            setTimeout(function () {
                callback.apply({}) // intentionally left blank
            }, 0);
        },
        subscribe: function (callback) {
            setTimeout(function () {
                callback.apply({}, [{value: utils.getRandomInt(100, 200)}])
            }, 0);
        },
        unsubscribe: function (callback) {
            setTimeout(function () {
                callback.apply({}) // intentionally left blank
            }, 0);
        },
        close: function (callback) {
            setTimeout(function () {
                callback.apply({}) // intentionally left blank
            }, 0);
        },
        discover: function (success) {
            setTimeout(function () {
                success.apply({}, [{
                    services: {
                        forEach: function (servicesCallback) {
                            setTimeout(function () {
                                servicesCallback.apply({}, [{
                                    characteristics: {
                                        forEach: function (characteristicsCallback) {
                                            setTimeout(function () {
                                                characteristicsCallback.apply({}, [{
                                                    uuid: '2A37'
                                                }])
                                            }, 0)
                                        }
                                    } // characteristics
                                }])
                            }, 0)
                        }
                    } // services
                }])
            }, 0);
        },
        retrieveConnected: function (callback) {
            setTimeout(function () {
                callback.apply({}, [[{name: "Polar H7 AB3F9CX34P", address: "PO:12:PO:93:PO"}, {
                    name: "Garmin Go BLE",
                    address: "GA:12:PO:93:GA"
                }]])
            }, 0);
        },
        startScan: function (callback) {
            setTimeout(function () {
                callback.apply({}, [{status: "scanStarted"}])
            }, 0);

            setTimeout(function () {
                callback.apply({}, [{name: "Polar H7 PONEWDEVICE", address: "PO:NW:DE:93:PO"}])
            }, 0);
        },
        stopScan: function (callback) {
            setTimeout(function () {
                callback = callback || function(){};
                callback.apply({}) // intentionally left blank
            }, 0);
        }

    }


}

jQuery.fn.center = function () {
    this.css("position","absolute");
    this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) +
        $(window).scrollTop()) + "px");
    this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +
        $(window).scrollLeft()) + "px");
    return this;
};

exports.emulateCordova = emulateCordova;
