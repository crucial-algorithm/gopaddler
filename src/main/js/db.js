'use strict';

// Array with DDL to be applied to each version of database; Each position corresponds to a version number
import AppSettings from "./utils/app-settings";

const ddl = [
    [
        ["CREATE TABLE IF NOT EXISTS settings (",
            "version INTEGER NOT NULL,",
            "units TEXT not null default 'K',",
            "sync_wifi integer not null default 1,",
            "restore_layout integer not null default 1,",
            "show_touch_events_tips integer not null default 1,",
            `show_calibration_tips integer not null default ${AppSettings.isShowCalibrationTips() ? 1 : 0},`,
            "default_session_filter TEXT DEFAULT NULL,",
            "default_start_date INTEGER,",
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
            "efficiency REAL,",
            "latitude REAL,",
            "longitude REAL",
            ")"],
        ["insert into settings (version) values (1)"]
    ],

    [
        ["ALTER TABLE session add column scheduled_session_id TEXT"],
        ["ALTER TABLE session add column scheduled_session_start integer"],
        ["ALTER TABLE settings add column start_immediately integer default 0"],
        ["ALTER TABLE session_data add column split INTEGER default -1"],
        ["UPDATE settings SET version = 2"]
    ],

    // v. 0.8.9
    [
        ["ALTER TABLE settings add column black_and_white integer default 0"],
        ["UPDATE settings SET version = 3"]
    ],


    // v. 0.9.2
    [
        ["UPDATE session set synced = 0 WHERE remote_id like 'ignored:%'"],
        ["UPDATE settings SET version = 4"]
    ],

    // v. 0.9.7
    [
        ["ALTER TABLE session add column expression TEXT"],
        ["UPDATE settings SET version = 5"]
    ],

    // v.0.9.8
    [
        ["ALTER TABLE settings add column portrait_mode integer default 0"],
        ["UPDATE settings SET version = 6"]
    ],

    // v.0.9.9
    [
        ["ALTER TABLE settings add column boat TEXT"],
        ["ALTER TABLE settings add column gps_rate integer default 0"],
        ["ALTER TABLE session_data add column heart_rate INTEGER default 0"],
        ["UPDATE settings SET version = 7"]
    ],

    // v.1.0
    [
        ["ALTER TABLE settings add column max_heart_rate integer default 200"],
        ["UPDATE settings SET version = 8"]
    ],

    // v.1.0.1
    [
        ["ALTER TABLE settings add column server_clock_gap REAL default 0"],
        ["ALTER TABLE session add column server_clock_gap REAL default 0"],
        ["UPDATE settings SET version = 9"]
    ],

    // v.1.1
    [
        ["ALTER TABLE session add column avg_heart_rate REAL default 0"],
        ["UPDATE settings SET version = 10, portrait_mode = 1"]
    ],

    // v.1.2
    [
        ["ALTER TABLE session_data add column strokes INTEGER default 0"],
        ["ALTER TABLE session_data add column accel_magnitude REAL default 0"],
        ["UPDATE settings SET version = 11"]
    ],

    // v.1.3
    [
        ["ALTER TABLE session_data add column recovery INTEGER default 0"],
        ["ALTER TABLE session add column version INTEGER default 1"],
        ["ALTER TABLE session add column expr_json INTEGER default 1"],
        ["UPDATE settings SET version = 12"]
    ],

    // v.1.4
    [
        ["ALTER TABLE settings add column resting_heart_rate INTEGER default 60"],
        ["ALTER TABLE session_data add column motion TEXT"],
        ["UPDATE settings SET version = 13"]
    ],

    // v.1.4.2
    [
        ["ALTER TABLE settings add column token TEXT"],
        ["UPDATE settings SET version = 14"]
    ],

    // v.1.7.0
    [
        ["ALTER TABLE session_data add column altitude REAL"],
        ["ALTER TABLE session add column paused_duration INTEGER default 0"],
        ["ALTER TABLE session add column elevation INTEGER default 0"],
        ["UPDATE settings SET version = 15"]
    ]

];


const success = function () {
    console.log('table created successfully')
};
const error = function (e) {
    console.log('error creating table', e);
};



function determineDbVersion() {
    let defer = $.Deferred();
    connection.executeSql("select version from settings", [], function success(res) {
        defer.resolve(res.rows.item(0).version);
    }, function error(err) {
        defer.resolve(0);
    });
    return defer.promise();
}


let connection;

class Database {

    static init() {

        const defer = $.Deferred();
        connection = window.sqlitePlugin.openDatabase({name: AppSettings.databaseName()
            , location: AppSettings.databaseLocation()});

        determineDbVersion().then(function (version) {
            connection.transaction(function (tx) {
                let sql;
                for (let d = version; d < ddl.length; d++) {

                    for (let i = 0; i < ddl[d].length; i++) {
                        sql = ddl[d][i].join('');
                        tx.executeSql(sql, [], success, error);
                    }
                }

                defer.resolve();
            });
        });

        return defer.promise();
    }

    static getConnection() {
        return connection;
    }

    static updateToken(token) {
        connection.executeSql("UPDATE settings SET token = ?", [token], function success() {
            console.log('token updated');
        });
    }
}

export default Database;
