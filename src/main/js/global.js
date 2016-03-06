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
        if (sql.toLowerCase().substr(0,3) === 'ins') {
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
                {id: 1, session_start:  new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 2, session_start:  new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 3, session_start:  new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 4, session_start:  new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 5, session_start:  new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 6, session_start:  new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 7, session_start:  new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 8, session_start:  new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 9, session_start:  new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 10, session_start: new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 11, session_start: new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 12, session_start: new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 13, session_start: new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)},
                {id: 14, session_start: new Date(), distance: 16, session_end: new Date(new Date().getTime() + 3600000)}
            ];
            success({rows: {length: 14, item: function (index) {
                return data[index];
            }}})
        }
    };

    window.sqlitePlugin.openDatabase = function (args) {
        return {
            executeSql: executeSql,
            transaction: function(callback) {
                setTimeout(function () {
                    callback({executeSql: executeSql});
                }, 0);
            }
        }
    }

    navigator.connection = navigator.connection || {};
    window.Connection = {"WIFI": 1, "ETHERNET": 2};

    window.analytics = {startTrackerWithId: function () {
    }, trackView: function () {
    }, setUserId: function () {
    }};

    window.screen.lockOrientation = function(){};
    window.device = {};

    navigator.geolocation.watchPosition = function (callback) {
        return setInterval(function () {
            callback({
                coords: {
                    accuracy: 1,
                    latitude: Math.random() + 1,
                    longitude: Math.random() + 1,
                    speed: Math.random() * 10 + 10
                }
            })
        }, 1000);
    };

    navigator.geolocation.clearWatch = function (id) {
        clearInterval(id);
    };
}

exports.emulateCordova = emulateCordova;