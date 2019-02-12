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
        var data =[];
        success = success || function(){};
        if (sql.toLowerCase().substr(0, 3) === 'ins') {
            success({insertId: 1234});
        } else if (sql === "SELECT * FROM settings") {
            data = [
                {version: 1, units: 'K', black_and_white: false, restore_layout: true, portrait_mode: __IS_PORTRAIT_MODE__, gps_rate: 0, max_heart_rate: 186}
            ];
            success({
                rows: {
                    length: 14, item: function (index) {
                        return data[index];
                    }
                }
            })
        } else if (sql.indexOf("session_data") >= 0) {
            var dataSetSize = 3600;

            var session = [], timestamp = new Date().getTime() - 86400000, distance = 0;
            for (var i = 0; i < dataSetSize; i++) {
                session.push({
                    id: 1,
                    session: 1,
                    timestamp: timestamp,
                    distance: distance / 1000,
                    speed: 13 + Math.random() * (Math.random() >= 0.5 ? -1 : 1),
                    spm: 65 + Math.round(Math.random() * 3) * (Math.random() >= 0.5 ? -1 : 1),
                    efficiency: 3 + Math.random() * (Math.random() >= 0.5 ? -1 : 1),
                    heart_rate: 160 + Math.round(Math.random() * 20),
                    latitude: 1,
                    longitude: 1,
                    split: -1
                });

                timestamp += 1000;
                distance += 13 / 36 * 10;
            }

            success({rows: {length: session.length, item: function (index) {
                return session[index];
            }}})

        } else {
            data = [];

            var numberOfSessions = 30, sessionDuration = 3600000, sessionStart = Date.now(),
                sessionEnd = sessionStart + sessionDuration;
            i = 0;
            while (i < numberOfSessions) {
                var dt = 13 + Math.random() * (Math.random() >= 0.5 ? -1 : 1);
                var ef = 3 + Math.random();

                var dow = moment(sessionStart).day();
                if ( dow === 0) {
                    sessionStart -= 86400000;
                    sessionEnd = sessionStart + sessionDuration;
                    continue;
                }

                data.push({
                    id: i,
                    synced: Math.random() <= .8,
                    session_start: new Date(sessionStart),
                    session_end: new Date(sessionEnd),
                    anglez: 1,  noisex: 1, noisez: 1, factorx: 1, factorz: 1, axis: 1,
                    distance: dt,
                    avg_spm: 65,
                    top_spm: 65 + Math.round(Math.random() * 3),
                    avg_speed: dt,
                    top_speed: 13 + Math.random(),
                    avg_efficiency: ef,
                    top_efficiency: ef + Math.random(),
                    avg_heart_rate: 160 + Math.round(Math.random() * 20)
                });

                sessionStart -= 86400000;
                sessionEnd = sessionStart + sessionDuration;
                i++;
            }
            success({rows: {length: numberOfSessions, item: function (index) {
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
                    speed: 10 / multiple
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

    };
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
