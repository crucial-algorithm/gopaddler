'use strict';

var db = require('../db.js');
var SessionDetail = require('./session-detail').SessionDetail;
var utils = require('../utils/utils.js');
var MeasureEnhancement = require('../core/measure-enhancement').MeasureEnhancement;

function Session(sessionStart, angleZ, noiseX, noiseZ, factorX, factorZ, axis, distance, avgSpm, topSpm
    , avgSpeed, topSpeed, avgEfficiency, topEfficiency, sessionEnd) {
    this.connection = db.getConnection();
    this.id = null;
    this.remoteId = null;
    this.sessionStart = sessionStart;
    this.scheduledSessionId = null;
    this.scheduledSessionStart = null;
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
    this.topEfficiency = topEfficiency;
    this.avgEfficiency = avgEfficiency;

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

Session.prototype.setScheduledSessionId = function (id) {
    this.scheduledSessionId = id;
};
Session.prototype.getScheduledSessionId = function () {
    return this.scheduledSessionId;
};

Session.prototype.setScheduledSessionStart = function (timestamp) {
    this.scheduledSessionStart = timestamp;
};
Session.prototype.getScheduledSessionStart = function () {
    return this.scheduledSessionStart;
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

Session.prototype.setTopEfficiency = function (value) {
    this.topEfficiency = value;
};

Session.prototype.getTopEfficiency = function () {
    return this.topEfficiency;
};

Session.prototype.setAvgEfficiency = function (value) {
    this.avgEfficiency = value;
};

Session.prototype.getAvgEfficiency = function () {
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

Session.prototype.getSyncedAt = function () {
    return this.syncedAt;
};

Session.prototype.setSyncedAt = function (syncedAt) {
    this.syncedAt = syncedAt;
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
                longitude: row.getLongitude(),
                split: row.getSplit()
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
            axis: self.getAxis(),
            coachTrainingSessionId: self.getScheduledSessionId(),
            coachTrainingSessionStart: self.getScheduledSessionStart()
        });
    });

    return defer.promise();
};

Session.prototype.create = function () {
    var self = this;
    self.connection.executeSql("INSERT INTO session (id, session_start, anglez, noisex, noisez, factorx, factorz, axis, dbg_file) VALUES (?,?,?,?,?,?,?,?,?)",
        [this.id, this.sessionStart, this.angleZ, this.noiseX, this.noiseZ, this.factorX, this.factorZ, this.axis, this.debugFile], function (res) {
            self.id = res.insertId;
        }, function (error) {
            console.log(error.message);
        });
    return this;
};

Session.prototype.finish = function (splits) {
    var self = this, defer = $.Deferred();
    
    var sessionEndAt = new Date().getTime();

    self.detail().then(function (rows) {

        var measureEnhancement = new MeasureEnhancement();
        var maxSpm = 0;

        var distance = 0, avgSpeed, avgSpm, avgSpmEfficiency
            , totalSpeed = 0, totalSpm = 0, totalEfficiency = 0
            , maxSpeed = 0, maxSpmEfficiency = 0;

        var length = rows.length, count = 0, split, hasSplits = splits.length > 0;
        for (var i = 0; i < length; i++) {
            split = splits[rows[i].getSplit()];
            if (hasSplits && (!split || split._recovery === true)) {
                continue;
            }
            
            count++;
            distance = rows[i].getDistance();
            totalSpeed += rows[i].getSpeed();
            totalSpm += rows[i].getSpm();
            totalEfficiency += rows[i].getEfficiency();


            if (rows[i].getSpeed() > maxSpeed) maxSpeed = rows[i].getSpeed();
            if (rows[i].getEfficiency() > maxSpmEfficiency) maxSpmEfficiency = rows[i].getEfficiency();
            if (rows[i].getSpm() > maxSpm) maxSpm = rows[i].getSpm();
        }

        avgSpeed = totalSpeed / count;
        avgSpm = totalSpm / count;
        avgSpmEfficiency = totalEfficiency / count;

        try {
            maxSpm = measureEnhancement.getMaxSPM(rows);
        } catch (err) {
            console.log('failed to calculate max SPM', err);
        }


        self.setSessionEnd(sessionEndAt);
        self.setDistance(distance);
        self.setAvgSpeed(avgSpeed);
        self.setTopSpeed(maxSpeed);
        self.setAvgSpm(avgSpm);
        self.setTopSpm(maxSpm);
        self.setAvgEfficiency(avgSpmEfficiency);
        self.setTopEfficiency(maxSpmEfficiency);

        self.connection.executeSql("update session set distance = ?, avg_spm = ?, top_spm = ?, avg_speed = ?" +
            ", top_speed = ?, avg_efficiency = ?, top_efficiency = ?, session_end = ?" +
            ", scheduled_session_id = ?,  scheduled_session_start = ? where id = ?"
            , [distance, avgSpm, maxSpm, avgSpeed, maxSpeed, avgSpmEfficiency, maxSpmEfficiency, sessionEndAt
                , self.getScheduledSessionId(), self.getScheduledSessionStart(), self.id]
            , function (a) {
                defer.resolve(this);
            }, function (a) {
                console.log('error', a);
                defer.reject(this);
            });
    });
    return defer;
};

/**
 * Get session_data for this session
 * @returns {*}
 */
Session.prototype.detail = function () {
    var self = this,
        defer = $.Deferred();

    SessionDetail.get(self.getId(), function (rows) {

        var dataPoints = [],
            row;

        for (var j = 0; j < rows.length; j++) {

            row = rows[j];

            row.setDistance(utils.round2(row.getDistance()));
            row.setSpeed(utils.round2(row.getSpeed()));
            row.setEfficiency(utils.round2(row.getEfficiency()));

            dataPoints.push(row);
        }

        defer.resolve(dataPoints);
    });

    return defer.promise();
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
    connection.executeSql("SELECT * FROM session WHERE synced <> 1 OR (dbg_synced = 0 AND (strftime('%s', 'now') - session_start/1000) < (86400 * 5))", [], function (res) {
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
        data.avg_efficiency,
        data.top_efficiency,
        data.session_end
    );

    session.setId(data.id);
    session.setDebugAttempt(data.dbg_attempt);
    session.setRemoteId(data.remote_id);
    session.setDbgSyncedRows(data.dbg_sync_rows);
    session.setScheduledSessionId(data.scheduled_session_id);
    session.setScheduledSessionStart(data.scheduled_session_start);
    session.setSyncedAt(data.synced_at);

    return session;
}


exports.Session = Session;
