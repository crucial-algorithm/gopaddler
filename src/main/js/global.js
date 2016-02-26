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
                {id: 1, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 2, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 3, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 4, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 5, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 6, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 7, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 8, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 9, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 10, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 11, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 12, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 13, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0},
                {id: 14, session_at: 1449330144249, anglez: 1, noisex: 1, noisey: 1, factorx: 1, factorz: 1, axis: 0}
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
}

exports.emulateCordova = emulateCordova;