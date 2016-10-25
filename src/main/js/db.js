'use strict';

var connection;

// Array with DDL to be applied to each version of database; Each position corresponds to a version number
var ddl = [
    [
        ["CREATE TABLE IF NOT EXISTS settings (",
            "version INTEGER NOT NULL,",
            "units TEXT not null default 'K',",
            "sync_wifi integer not null default 1,",
            "restore_layout integer not null default 1",
            "show_touch_events_tips integer not null default 1",
            "show_calibration_tips integer not null default 1",
            "default_session_filter TEXT DEFAULT NULL",
            "default_start_date INTEGER",
            "default_end_date INTEGER",
            ")"],

        ["CREATE TABLE IF NOT EXISTS session (",
            "id INTEGER NOT NULL PRIMARY KEY,",
            "remote_id TEXT,",
            "session_start INTEGER NOT NULL,",
            "session_end INTEGER,",
            "anglez REAL NOT NULL,",
            "noisex REAL NOT NULL,",
            "noisez REAL NOT NULL,",
            "factorx REAL NOT NULL,",
            "factorz REAL NOT NULL,",
            "axis INTEGER NOT NULL,",
            "distance REAL,",
            "avg_spm REAL,",
            "avg_speed REAL,",
            "avg_efficiency REAL,",
            "top_spm REAL,",
            "top_speed REAL,",
            "top_efficiency REAL,",
            "synced INTEGER DEFAULT 0,",
            "synced_at INTEGER,",
            "dbg_file TEXT,",
            "dbg_attempt integer,",
            "dbg_tot_rows integer,",
            "dbg_sync_rows INTEGER DEFAULT 0,",
            "dbg_synced INTEGER DEFAULT 0,",
            "dbg_synced_at INTEGER",
            ")"],

        ["CREATE TABLE IF NOT EXISTS session_data (",
            "id INTEGER NOT NULL PRIMARY KEY,",
            "session INTEGER NOT NULL,",
            "timestamp INTEGER NOT NULL,",
            "distance REAL,",
            "speed REAL,",
            "spm INTEGER,",
            "efficiency REAL",
            "latitude REAL",
            "longitude REAL",

            ")"],
        ["insert into settings (version) values (1)"]
    ]
];


var success = function () {
    console.log('table created successfully')
};
var error = function (e) {
    console.log('error creating table', e);
};


/**
 * This method should apply all changes in ddl
 */
function init() {
    connection = window.sqlitePlugin.openDatabase({name: "sessions.db", "location": 2});

    determineDbVersion().then(function (version) {
        connection.transaction(function (tx) {
            var sql;
            for (var d = version; d < ddl.length; d++) {

                for (var i = 0; i < ddl[d].length; i++) {
                    sql = ddl[d][i].join('');
                    tx.executeSql(sql, [], success, error);
                }
            }
        });
    });
}


function determineDbVersion() {
    var defer = $.Deferred();
    connection.executeSql("select version from settings", [], function success(res) {
        defer.resolve(res.rows.item(0).version);
    }, function error(err) {
        defer.resolve(0);
    });
    return defer.promise();
}


exports.init = init;
exports.getConnection = function () {
    return connection;
}
