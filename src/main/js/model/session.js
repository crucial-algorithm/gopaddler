'use strict';

var db = require('../db.js');
var SessionDetail = require('./session-detail').SessionDetail;
var utils = require('../utils/utils.js');

function Session(sessionStart, angleZ, noiseX, noiseZ, factorX, factorZ, axis, distance, avgSpm, topSpm, avgSpeed, topSpeed, sessionEnd) {
    this.connection = db.getConnection();
    this.id = null;
    this.remoteId = null;
    this.sessionStart = sessionStart;
    this.sessionEnd = sessionEnd;
    this.angleZ = angleZ;
    this.noiseX = noiseX;
    this.noiseZ = noiseZ;
    this.factorX = factorX;
    this.factorZ = factorZ;
    this.axis = axis;
    this.debugFile = this.sessionStart + ".csv";
    this.distance = distance;
    this.avgSpm = avgSpm;
    this.topSpm = topSpm;
    this.avgSpeed = avgSpeed;
    this.topSpeed = topSpeed;
    this.topEfficiency = undefined;
    this.avgEfficiency = undefined;

    this.dbgAttempt = undefined;
    this.dbgSyncedRows = 0;
    return this;
}

Session.prototype.setId = function (id) {
    this.id = id;
};
Session.prototype.getId = function () {
    return this.id;
};

Session.prototype.setRemoteId = function (id) {
    this.remoteId = id;
};
Session.prototype.getRemoteId = function () {
    return this.remoteId;
};

Session.prototype.setSessionStart = function (sessionStart) {
    this.sessionStart = sessionStart;
};
Session.prototype.getSessionStart = function () {
    return this.sessionStart;
};

Session.prototype.setSessionEnd = function (sessionEnd) {
    this.sessionEnd = sessionEnd;
};
Session.prototype.getSessionEnd = function () {
    return this.sessionEnd;
};
Session.prototype.setAngleZ = function (angleZ) {
    this.angleZ = angleZ;
};
Session.prototype.getAngleZ = function () {
    return this.angleZ;
};
Session.prototype.setNoiseX = function (noiseX) {
    this.noiseX = noiseX;
};
Session.prototype.getNoiseX = function () {
    return this.noiseX;
};
Session.prototype.setNoiseZ = function (noiseZ) {
    this.noiseZ = noiseZ;
};
Session.prototype.getNoiseZ = function () {
    return this.noiseZ;
};
Session.prototype.setFactorX = function (factorX) {
    this.factorX = factorX;
};
Session.prototype.getFactorX = function () {
    return this.factorX;
};
Session.prototype.setFactorZ = function (factorZ) {
    this.factorZ = factorZ;
};
Session.prototype.getFactorZ = function () {
    return this.factorZ;
};
Session.prototype.setAxis = function (axis) {
    this.axis = axis;
};
Session.prototype.getAxis = function () {
    return this.axis;
};
Session.prototype.setDebugFile = function (debug) {
    this.debugFile = debug;
};
Session.prototype.getDebugFile = function () {
    return this.debugFile;
};

Session.prototype.setAvgSpm = function (avgSpm) {
    this.avgSpm = avgSpm;
};
Session.prototype.getAvgSpm = function () {
    return this.avgSpm;
};
Session.prototype.setTopSpm = function (topSpm) {
    this.topSpm = topSpm;
};
Session.prototype.getTopSpm = function () {
    return this.topSpm;
};
Session.prototype.setAvgSpeed = function (avgSpeed) {
    this.avgSpeed = avgSpeed;
};
Session.prototype.getAvgSpeed = function () {
    return this.avgSpeed;
};
Session.prototype.setTopSpeed = function (topSpeed) {
    this.topSpeed = topSpeed;
};
Session.prototype.getTopSpeed = function () {
    return this.topSpeed;
};

Session.prototype.setTopEfficiency = function(value) {
    this.topEfficiency = value;
};

// TODO: create efficiency fields in table
Session.prototype.getTopEfficiency = function(){
    return this.topEfficiency;
};

Session.prototype.setAvgEfficiency = function(value) {
    this.avgEfficiency = value;
};

Session.prototype.getAvgEfficiency = function(){
    return this.avgEfficiency;
};

Session.prototype.setDistance = function (distance) {
    this.distance = distance;
};
Session.prototype.getDistance = function () {
    return this.distance;
};

Session.prototype.setDebugAttempt = function (attempt) {
    this.dbgAttempt = attempt;
};
Session.prototype.getDebugAttempt = function () {
    return this.dbgAttempt;
};
Session.prototype.isSynced = function () {
    return !!(this.remoteId);
};

Session.prototype.setDbgSyncedRows = function (rows) {
    this.dbgSyncedRows = rows;
};

Session.prototype.getDbgSyncedRows = function () {
    return this.dbgSyncedRows;
};

Session.prototype.createAPISession = function () {

    var self = this,
        defer = $.Deferred();

    SessionDetail.get(self.getId(), function (rows) {

        var dataPoints = [],
            row;

        for (var j = 0; j < rows.length; j++) {

            row = rows[j];

            dataPoints.push({
                timestamp: row.getTimestamp(),
                distance: utils.round2(row.getDistance()),
                speed: utils.round2(row.getSpeed()),
                spm: row.getSpm(),
                spmEfficiency: utils.round2(row.getEfficiency()),
                latitude: row.getLatitude(),
                longitude: row.getLongitude()
            });
        }

        defer.resolve({
            date: new Date(self.getSessionStart()),
            data: dataPoints,
            angleZ: self.getAngleZ(),
            noiseX: self.getNoiseX(),
            noiseZ: self.getNoiseZ(),
            factorX: self.getFactorX(),
            factorZ: self.getFactorZ(),
            axis: self.getAxis()
        });
    });

    return defer.promise();
};

Session.prototype.create = function () {
    var self = this;
    self.connection.executeSql("INSERT INTO session (id, session_start, anglez, noisex, noisez, factorx, factorz, axis, dbg_file) VALUES (?,?,?,?,?,?,?,?,?)",
        [this.id, this.sessionStart, this.angleZ, this.noiseX, this.noiseZ, this.factorX, this.factorZ, this.axis, this.debugFile], function (res) {
            console.log("Session #" + res.insertId + " created");
            self.id = res.insertId;
        }, function (error) {
            console.log(error.message);
        });
    return this;
};

Session.prototype.finish = function () {
    var self = this, defer = $.Deferred();
    self.connection.executeSql("select max(distance) total_distance, avg(speed) avg_speed, max(speed) max_speed, avg(spm) avg_spm, max(spm) top_spm, " +
        " max(efficiency) max_ef, avg(efficiency) avg_ef FROM session_data where session = ?", [self.id], function (res) {

        var record = res.rows.item(0);

        self.setSessionEnd(new Date().getTime());
        self.setDistance(record.total_distance);
        self.setAvgSpeed(record.avg_speed);
        self.setTopSpeed(record.max_speed);
        self.setAvgSpm(record.avg_spm);
        self.setTopSpm(record.top_spm);
        self.setAvgEfficiency(record.avg_ef);
        self.setTopEfficiency(record.max_ef);

        self.connection.executeSql("update session set distance = ?, avg_spm = ?, top_spm = ?, avg_speed = ?, top_speed = ?, session_end = ? where id = ?"
            , [record.total_distance, record.avg_spm, record.top_spm, record.avg_speed, record.max_speed, self.getSessionEnd(), self.id]
            , function (a) {
                defer.resolve(this);
            }, function (a) {
                console.log('error', a);
                defer.reject(this);
            })


    }, function (error) {
        console.log('Error creating session: ' + error.message);
        defer.reject(this);
    });
    return defer;
};

Session.delete = function (id) {
    var connection = db.getConnection();
    var defer = $.Deferred();
    connection.transaction(function (tx) {
        tx.executeSql("DELETE FROM session_data where session = ?", [id], function () {
            tx.executeSql("DELETE FROM session where id = ?", [id], function s() {
                defer.resolve();
            }, function () {
                defer.fail();
            });

        }, function error() {
            defer.fail();
        });
    });
    return defer.promise();
};


Session.synced = function (remoteId, id) {
    var connection = db.getConnection();
    var defer = $.Deferred();
    connection.executeSql("update session set synced = 1, synced_at = ?, remote_id = ? where id = ?", [new Date().getTime(), remoteId, id], function success() {
        defer.resolve();
    }, function error() {
        defer.fail();
    });
    return defer.promise();
};

Session.startDebugSync = function (id, total) {
    var connection = db.getConnection();
    var defer = $.Deferred();
    connection.executeSql("update session set dbg_attempt = if(dbg_attempt is null, 1, dbg_attempt + 1), dbg_tot_rows = ? where id = ?", [total, id], function success() {
        defer.resolve();
    }, function error() {
        defer.fail();
    });
    return defer.promise();
};

Session.debugSynced = function (id, rows) {
    var connection = db.getConnection();
    var defer = $.Deferred();
    connection.executeSql("update session set dbg_sync_rows = dbg_sync_rows + ? where id = ?", [rows, id], function success() {
        defer.resolve();
    }, function error() {
        defer.fail();
    });
    return defer.promise();
};

Session.debugSyncFinished = function (id, success) {
    var connection = db.getConnection();
    var defer = $.Deferred();
    connection.executeSql("update session set dbg_synced = ?, dbg_synced_at = ? where id = ?", [success ? 1 : 0, new Date().getTime(), id], function success() {
        defer.resolve();
    }, function error() {
        defer.fail();
    });
    return defer.promise();
};

Session.incrementAttempt = function (id) {
    var connection = db.getConnection();
    var defer = $.Deferred();
    connection.executeSql("update session set dbg_attempt = dbg_attempt + 1 where id = ?", [id], function success() {
        defer.resolve();
    }, function error() {
        defer.fail();
    });
    return defer.promise();
};

Session.sessionsSummary = function () {
    var defer = $.Deferred();
    var connection = db.getConnection();
    connection.executeSql("SELECT sum(distance) distance, max(top_speed) speed, sum(session_end - session_start) duration FROM session", [], function (res) {
        var record = res.rows.item(0);
        defer.resolve({
            distance: record.distance,
            speed: record.speed,
            duration: record.duration
        });
    }, function (error) {
        defer.fail(error);
    });
    return defer.promise();
};

Session.findAllNotSynced = function (callback) {
    var connection = db.getConnection();
    connection.executeSql("SELECT * FROM session WHERE synced <> 1 OR ((datetime('now','localtime') - session_start) < (604800 * 8) AND dbg_synced = 0)", [], function (res) {
        var rows = [];
        for (var i = 0; i < res.rows.length; i++) {
            rows.push(sessionFromDbRow(res.rows.item(i)));
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

Session.all = function (callback) {
    var self = this;
    var connection = db.getConnection();
    connection.executeSql("SELECT * FROM session order by id desc", [], function (res) {
        var rows = [];
        for (var i = 0; i < res.rows.length; i++) {
            rows.push(sessionFromDbRow(res.rows.item(i)));
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

Session.last = function () {
    var connection = db.getConnection();
    var defer = $.Deferred();
    connection.executeSql("SELECT * FROM session order by id desc limit 1", [], function (res) {

        if (res.rows.length > 0) {
            defer.resolve(sessionFromDbRow(res.rows.item(0)));
            return;
        }
        defer.resolve(undefined);
    }, function (error) {
        defer.reject(error.message);
    });

    return defer.promise();
};

Session.getFromDate = function (date, callback) {
    var connection = db.getConnection();

    connection.executeSql('SELECT * FROM session WHERE session_end >= ? order by id desc', [date], function (res) {
        var rows = [];
        for (var i = 0; i < res.rows.length; i++) {
            rows.push(sessionFromDbRow(res.rows.item(i)));
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

Session.getForDates = function (startDate, endDate, callback) {
    var connection = db.getConnection();

    connection.executeSql('SELECT * FROM session WHERE session_end >= ? AND session_end <= ? order by id desc', [startDate, endDate], function (res) {
        var rows = [];
        for (var i = 0; i < res.rows.length; i++) {
            rows.push(sessionFromDbRow(res.rows.item(i)));
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

Session.get = function (id) {
    var connection = db.getConnection();
    var defer = $.Deferred();
    connection.executeSql("SELECT * FROM session where id = ?", [id], function (res) {

        if (res.rows.length > 0) {
            defer.resolve(sessionFromDbRow(res.rows.item(0)));
            return;
        }
        defer.resolve(undefined);
    }, function (error) {
        defer.reject(error.message);
    });

    return defer.promise();
};


function sessionFromDbRow(data) {
    var session = new Session(
        data.session_start,
        data.anglez,
        data.noisex,
        data.noisez,
        data.factorx,
        data.factorz,
        data.axis,
        data.distance,
        data.avg_spm,
        data.top_spm,
        data.avg_speed,
        data.top_speed,
        data.session_end
    );

    session.setId(data.id);
    session.setDebugAttempt(data.dbg_attempt);
    session.setRemoteId(data.remote_id);
    session.setDbgSyncedRows(data.dbg_sync_rows);

    return session;
}


exports.Session = Session;
