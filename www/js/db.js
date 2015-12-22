'use strict';

var connection;

// Array with DDL to be applied to each version of database; Each position corresponds to a version number
var ddl = [
    [
        ["CREATE TABLE IF NOT EXISTS meta (",
            "version INTEGER NOT NULL",
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
            "top_spm REAL,",
            "top_speed REAL,",
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
            ")"]
    ]
];


var success = function () {
    console.log('table created successfully')
};
var error = function (e) {
    console.log('error creating table', e);
};


/**
 * This method should apply all changes in ddl (currently only applies for version 0)
 */
function init() {
    connection = window.sqlitePlugin.openDatabase({name: "sessions.db", "location": 2});
    connection.transaction(function (tx) {
        var v1 = ddl[0], sql;
        for (var i = 0; i < v1.length; i++) {
            sql = v1[i].join('');
            tx.executeSql(sql, [], success, error);
        }
    });
}


exports.init = init;
exports.getConnection = function () {
    return connection;
}