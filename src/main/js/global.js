'use strict';

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

    var executeSql = function (sql, args, success, error) {
        success = success || function(){};
        if (sql.toLowerCase().substr(0, 3) === 'ins') {
            success({insertId: 1234});
        } else if (sql === "SELECT * FROM settings") {
            var data = [
                {version: 1, units: 'K', sync_wifi: true, restore_layout: true}
            ];
            success({rows: {length: 14, item: function (index) {
                return data[index];
            }}})
        } else {
            var data = [
                {id: 1, session_start: new Date(), distance: 1, top_speed: 1, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 2, session_start: new Date(new Date().getTime() - 86400000), distance: 2, top_speed: 2, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 3, session_start: new Date(new Date().getTime() - (2 * 86400000)), distance: 3, top_speed: 3, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 4, session_start: new Date(new Date().getTime() - (3 * 86400000)), distance: 4, top_speed: 4, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 5, session_start: new Date(new Date().getTime() - (4 * 86400000)), distance: 5, top_speed: 5, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 6, session_start: new Date(new Date().getTime() - (4 * 86400000)), distance: 6, top_speed: 6, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 7, session_start: new Date(new Date().getTime() - (4 * 86400000)), distance: 7, top_speed: 7, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 8, session_start: new Date(new Date().getTime() - (5 * 86400000)), distance: 8, top_speed: 8, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 9, session_start: new Date(new Date().getTime() - (6 * 86400000)), distance: 9, top_speed: 9, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 10, session_start: new Date(new Date().getTime() - (6 * 86400000)), distance: 10, top_speed: 10, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 11, session_start: new Date(new Date().getTime() - (7 * 86400000)), distance: 11, top_speed: 11, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 12, session_start: new Date(new Date().getTime() - (8 * 86400000)), distance: 12, top_speed: 12, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 13, session_start: new Date(new Date().getTime() - (8 * 86400000)), distance: 13, top_speed: 13, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 14, session_start: new Date(new Date().getTime() - (9 * 86400000)), distance: 14, top_speed: 14, session_end: new Date(new Date().getTime() + 3600000)}
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

    navigator.connection = navigator.connection || {};
    window.Connection = {"WIFI": 1, "ETHERNET": 2};

    window.analytics = {startTrackerWithId: function () {
        }, trackView: function () {
        }, setUserId: function () {
    }};

    window.screen.lockOrientation = function(){};
    window.device = {};

    navigator.geolocation.watchPosition = function (callback) {
        var latitude, longitude;
        return setInterval(function () {
            if (latitude === undefined) {
                latitude = Math.random() + 1;
                longitude = Math.random() + 1;
            }
            latitude = latitude + Math.random() / 2 / 10000;
            longitude = longitude + Math.random() / 2 / 10000;


            callback({
                timestamp: new Date().getTime(),
                coords: {
                    accuracy: 1,
                    latitude: latitude,
                    longitude: longitude,
                    speed: parseInt(Math.random() * 3 + 12)
                }
            })
        }, 1000);
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


    navigator.connection = {
        type: 2
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
