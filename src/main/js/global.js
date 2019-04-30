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
    var sessions = generateHistorySessions();
    window.sqlitePlugin = window;

    window.cordova = {
        InAppBrowser: {open: window.open}
    };

    var executeSql = function (sql, args, success, error) {
        var data =[];
        success = success || function(){};

        // INSERT
        if (sql.toLowerCase().substr(0, 6) === 'insert') {
            success({insertId: 1234});
            return;
        }

        // ALTER TABLE
        if (sql.toLowerCase().substr(0, 5) === 'alter') {
            success({insertId: 1234});
            return;
        }


        // SELECT SETTINGS
        if (sql.toLowerCase().indexOf("settings") >= 0) {
            data = [
                {version: 2000, units: 'K', black_and_white: false, restore_layout: true, portrait_mode: __IS_PORTRAIT_MODE__, gps_rate: 0, max_heart_rate: 186}
            ];
            success({
                rows: {
                    length: 14, item: function (index) {
                        return data[index];
                    }
                }
            });

            return;
        }

        // SELECT SESSION_DATA
        if (sql.indexOf("session_data") >= 0) {
            var sessionId = args[0], session = null;

            for (var s = 0, l = sessions.length; s < l; s++) {
                if (sessions[s].id === sessionId) {
                    session = sessions[s];
                }
            }

            success({rows: {length: session.data.length, item: function (index) {
                if (!session)
                    return null;

                return session.data[index]
            }}});

            return;

        }

        // SELECT SESSION
        success({rows: {length: sessions.length, item: function (index) {
            return sessions[index];
        }}})
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

function generateHistorySessions() {
    var numberOfSessions = 30
        , sessionStart = Date.now(), sessions = [], session, i = 0;

    while (i < numberOfSessions) {

        var dow = moment(sessionStart).day();
        if ( dow === 0) {
            sessionStart -= 86400000;
            continue;
        }

        session = new MockSessionGenerator(randomSessions[utils.getRandomInt(0, randomSessions.length - 1)], sessionStart);
        sessions.push(session.generate());
        sessionStart -= 86400000;
        i++;

    }
    return sessions;
}

function MockSessionGenerator(definition, startedAt) {

    this.definition = definition === null ? null : {
        expression: definition.expression,
        splits: definition.splits.slice()
    };

    this.data = [];
    this.position = 0;
    this.id =  utils.guid();
    this.startedAt = startedAt;
    this.distance = 0;
    this.output = null;

}

MockSessionGenerator.prototype.generateWarmUp = function () {
    this.generateFreeSection(15 * 60);
};

MockSessionGenerator.prototype.generateAfterSessionRecovery = function () {
    this.generateFreeSection(10 * 60);
};

MockSessionGenerator.prototype.generateWork = function () {
    if (this.definition === null) {
        this.generateFreeSection(40 * 60);
    } else {
        this.generateIntervals();
    }
};

MockSessionGenerator.prototype.generateIntervals = function () {
    var interval = null, position = -1, intervals = this.definition.splits.slice(), measures, overrideSpeed;
    while(intervals.length > 0) {
        interval = intervals.shift();

        if (interval._unit === "seconds") {
            measures = interval._duration;
            overrideSpeed = null;
        } else if (interval._unit === 'meters') {
            var speed = 18;
            measures = Math.floor(interval._duration / (speed * 1000 / 3600));
            overrideSpeed = interval._recovery === true ? null : speed;
        } else {
            throw 'Only seconds supported';
        }
        position++;

        for (var i = 0; i < measures; i++) {
            this.data.push(this.generateDataRecord(interval._recovery === true, position, overrideSpeed));
        }
    }
};

/**
 *
 * @param {number} duration in seconds
 */
MockSessionGenerator.prototype.generateFreeSection = function (duration) {
    for (var i = 0; i < duration; i++) {
        this.data.push(this.generateDataRecord(true, -1, null));
    }
};

/**
 * Generates a record for array .data in session
 *
 * @param isRecovery
 * @param split
 * @param overrideSpeed
 * @returns {{spm: number, efficiency: number, split: number, distance: number, session: (number|*), latitude: number, heart_rate: number, id: number, speed: number, timestamp: *, longitude: number}}
 */
MockSessionGenerator.prototype.generateDataRecord = function (isRecovery, split, overrideSpeed) {
    var speedVariation = Math.random() * (Math.random() >= 0.5 ? -1 : 1)
        , speed = isRecovery ? 10 + speedVariation : 13 + speedVariation
        , spmVariation = Math.round(Math.random() * 3) * (Math.random() >= 0.5 ? -1 : 1)
        , spm = isRecovery ? 60 + spmVariation : 75 + spmVariation
        , hrVariation = Math.round(Math.random() * 20)
        , hr = isRecovery ? 140 + hrVariation : 160 + hrVariation
    ;

    if (overrideSpeed !== null)
        speed = overrideSpeed;

    var record = {
        id: this.position++,
        session: this.id,
        timestamp: this.startedAt + this.position * 1000,
        distance: this.distance / 1000,
        speed: speed,
        spm: spm,
        efficiency: 3 + Math.random() * (Math.random() >= 0.5 ? -1 : 1),
        heart_rate: hr,
        latitude: 1,
        longitude: 1,
        split: split,
        recovery: isRecovery === true ? 1 : 0
    };

    this.distance += Math.round((speed * 1000)/3600 * 10000) / 10000;

    return record;
};

/**
 * @returns {null}
 */
MockSessionGenerator.prototype.generate = function () {
    if (this.output !== null) return this.output;

    this.generateWarmUp();
    this.generateWork();
    this.generateAfterSessionRecovery();

    var dt = 13 + Math.random() * (Math.random() >= 0.5 ? -1 : 1);
    var ef = 3 + Math.random();

    this.output = {
        expression: this.definition ? this.definition.expression : null,
        id: this.id,
        synced: Math.random() < 0.8 ? 1 : 0,
        session_start: new Date(this.startedAt),
        session_end: new Date(this.data[this.data.length - 1].timestamp),
        anglez: 1, noisex: 1, noisez: 1, factorx: 1, factorz: 1, axis: 1,
        distance: dt,
        avg_spm: 65,
        top_spm: 65 + Math.round(Math.random() * 3),
        avg_speed: dt,
        top_speed: 13 + Math.random(),
        avg_efficiency: ef,
        top_efficiency: ef + Math.random(),
        avg_heart_rate: 160 + Math.round(Math.random() * 20),
        data: this.data,
        version: 2,
        expr_json: this.definition ? JSON.stringify(this.definition.splits) : null
    };
    return this.output;
};

var randomSessions = [null,
    {

        expression: "10 x 4'/2'",
        splits: [
            {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}
        ]
    },
    {

        expression: "6 x 5'/2'",
        splits: [
            {_duration: 300, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 300, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 300, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 300, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 300, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 300, _recovery: false, _unit: 'seconds'}
        ]
    },
    {

        expression: "2 x (6'/2' + 5'/2' +4'/2' + 3'/2' + 2'/2')/4'",
        splits: [
            {_duration: 360, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 300, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 180, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 120, _recovery: false, _unit: 'seconds'}, {_duration: 240, _recovery: true, _unit: 'seconds'}
            , {_duration: 360, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 300, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 240, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 180, _recovery: false, _unit: 'seconds'}, {_duration: 120, _recovery: true, _unit: 'seconds'}
            , {_duration: 120, _recovery: false, _unit: 'seconds'}
        ]
    },
    {
        expression: "2 x (5 x (1'/1' + 30''/1' + 30''/1'))/7'",
        splits: [
            {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}

            , {_duration: 420, _recovery: true, _unit: 'seconds'}

            , {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 60, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}
            , {_duration: 30, _recovery: false, _unit: 'seconds'}
        ]
    },
    {

        expression: "400m/5' + 500m/5' + 600m/5' + 500m/5' + 400m/5'",
        splits: [
            {_duration: 400, _recovery: false, _unit: 'meters'}, {_duration: 300, _recovery: true, _unit: 'seconds'}
            , {_duration: 500, _recovery: false, _unit: 'meters'}, {_duration: 300, _recovery: true, _unit: 'seconds'}
            , {_duration: 600, _recovery: false, _unit: 'meters'}, {_duration: 300, _recovery: true, _unit: 'seconds'}
            , {_duration: 500, _recovery: false, _unit: 'meters'}, {_duration: 300, _recovery: true, _unit: 'seconds'}
            , {_duration: 400, _recovery: false, _unit: 'meters'}
        ]
    }
];


exports.emulateCordova = emulateCordova;
