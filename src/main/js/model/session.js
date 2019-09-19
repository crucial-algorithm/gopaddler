'use strict';

import SessionDetail from './session-detail';

var db = require('../db.js');
var utils = require('../utils/utils.js');
var VERSION_WITH_RECOVERY_IN_DATA = 2;


class Session {

    constructor(sessionStart, angleZ, noiseX, noiseZ, factorX, factorZ, axis, distance, avgSpm, topSpm
        , avgSpeed, topSpeed, avgEfficiency, topEfficiency, sessionEnd) {

        this.connection = db.getConnection();
        this._id = null;
        this._remoteId = null;
        this._sessionStart = sessionStart;
        this._scheduledSessionId = null;
        this._scheduledSessionStart = null;
        this._angleZ = angleZ;
        this._noiseX = noiseX;
        this._noiseZ = noiseZ;
        this._factorX = factorX;
        this._factorZ = factorZ;
        this._axis = axis;
        this._distance = distance;
        this._avgSpm = avgSpm;
        this._topSpm = topSpm;
        this._avgSpeed = avgSpeed;
        this._topSpeed = topSpeed;
        this._avgEfficiency = avgEfficiency;
        this._topEfficiency = topEfficiency;
        this._sessionEnd = sessionEnd;
        this._debugFile = null;
        this._avgHeartRate = 0;
        this._synced = false;
        this._syncedAt = null;
        this._serverClockGap = 0;

        this._expression = null;

        this._dbgAttempt = undefined;
        this._dbgSyncedRows = 0;

        this._version = VERSION_WITH_RECOVERY_IN_DATA;
        this._expressionJson = null;
    }

    handleMotionString(string) {
        if (!string) return {leftToRight: [], frontToBack: [], rotation: []};

        let parts = string.split('|')
            , leftToRight = parts[0].split(';')
            , frontToBack = parts[1].split(';')
            , rotation = parts[2].split(';');

        const parse = function (list) {
            let result = [];
            for (let i = 0, l = list.length; i < l; i++) {
                let parts = list[i].split('&');
                let duration = parseInt(parts[0]);
                let value = parseInt(parts[1]);
                if (isNaN(value)) continue;
                result.push({duration: duration, value: value});
            }
            return result;
        };

        leftToRight = parse(leftToRight);
        frontToBack = parse(frontToBack);
        rotation = parse(rotation);

        return {
            leftToRight: leftToRight, frontToBack: frontToBack, rotation: rotation
        }
    }

    createAPISession() {

        const self = this,
            defer = $.Deferred();

        SessionDetail.get(self.id, function (rows) {

            let dataPoints = [],
                row, next, motion = self.handleMotionString(null);

            for (let j = 0; j < rows.length; j++) {

                row = rows[j];
                next = rows[j + 1];
                motion = self.handleMotionString(next ? next.getMotion() : null);

                dataPoints.push({
                    timestamp: row.getTimestamp(),
                    distance: utils.round(row.getDistance(), 4),
                    speed: utils.round2(row.getSpeed()),
                    spm: row.getSpm(),
                    spmEfficiency: utils.round2(row.getEfficiency()),
                    latitude: row.getLatitude(),
                    longitude: row.getLongitude(),
                    heartRate: row.getHeartRate(),
                    split: row.getSplit(),
                    strokes: row.getStrokes(),
                    magnitude: row.getMagnitude(),
                    leftToRight: motion.leftToRight,
                    frontToBack: motion.frontToBack,
                    rotation: motion.rotation
                });
            }

            defer.resolve({
                timestamp: new Date(self.sessionStart).getTime(),
                serverClockGap: self.serverClockGap,
                data: dataPoints,
                angleZ: self.angleZ,
                noiseX: self.noiseX,
                noiseZ: self.noiseZ,
                factorX: self.factorX,
                factorZ: self.factorZ,
                axis: self.axis,
                coachTrainingSessionId: self.scheduledSessionId,
                coachTrainingSessionStart: self.scheduledSessionStart,
                expression: self.expression,
                version: __SESSION_FORMAT_VERSION__
            });
        });

        return defer.promise();
    }

    persist() {
        const self = this;
        self.connection.executeSql("INSERT INTO session (id, session_start, anglez, noisex, noisez," +
            " factorx, factorz, axis, dbg_file, server_clock_gap, version, expr_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            [this.id, this.sessionStart, this.angleZ, this.noiseX, this.noiseZ, this.factorX, this.factorZ, this.axis
                , this.debugFile, this.serverClockGap, this.version, JSON.stringify(this.expressionJson)], function (res) {
                self.id = res.insertId;
            }, function (error) {
                console.log(error.message);
            });
        return this;
    }

    finish(splits, expression) {
        const self = this, defer = $.Deferred();

        let sessionEndAt = Date.now();
        self.sessionEnd = sessionEndAt;

        self.calculateMetrics(splits).then(function (/**@type SessionDetailMetrics */ metrics) {
            self.distance = metrics.getDistance();
            self.avgSpeed = metrics.getAvgSpeed();
            self.topSpeed = metrics.getMaxSpeed();
            self.avgSpm = metrics.getAvgSpm();
            self.topSpm = metrics.getMaxSpm();
            self.avgEfficiency = metrics.getAvgEfficiency();
            self.topEfficiency = metrics.getMaxEfficiency();
            self.avgHeartRate = metrics.getAvgHeartRate();
            self.expression = expression;
            self.expressionJson = splits;

            self.connection.executeSql("update session set distance = ?, avg_spm = ?, top_spm = ?, avg_speed = ?" +
                ", top_speed = ?, avg_efficiency = ?, top_efficiency = ?, avg_heart_rate = ?, session_end = ?" +
                ", scheduled_session_id = ?,  scheduled_session_start = ?, expression = ?, expr_json = ? where id = ?"
                , [metrics.getDistance(), metrics.getAvgSpm(), metrics.getMaxSpm(), metrics.getAvgSpeed(), metrics.getMaxSpeed()
                    , metrics.getAvgEfficiency(), metrics.getMaxEfficiency(), metrics.getAvgHeartRate(), sessionEndAt
                    , self.scheduledSessionId, self.scheduledSessionStart
                    , self.expression, JSON.stringify(self.expressionJson), self.id]
                , function (a) {
                    defer.resolve(this);
                }, function (a) {
                    console.log('error', a);
                    defer.reject(this);
                });
        });

        return defer;
    }

    /**
     * Get session_data for this session
     * @returns {*}
     */
    detail() {
        const self = this,
            defer = $.Deferred();

        SessionDetail.get(self.id, function (rows) {
            defer.resolve(rows);
        });

        return defer.promise();
    }

    calculateMetrics(splits) {
        const self = this,
            defer = $.Deferred();

        let relevantSplits = [];
        if (splits && splits.length > 0) {
            for (let i = 0; i < splits.length; i++) {
                if (splits[i]._recovery === true) continue;
                relevantSplits.push(i);
            }
        }

        SessionDetail.getDetailedMetrics(self.id, relevantSplits, function (/**@type SessionDetailMetrics */metrics) {
            defer.resolve(metrics);
        });

        return defer.promise();
    }

    static delete(id) {
        const connection = db.getConnection();
        const defer = $.Deferred();
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
    }

    /**
     * Mark session as having been synced
     * @param remoteId
     * @param id
     * @return {*}
     */
    static synced(remoteId, id) {
        const connection = db.getConnection();
        const defer = $.Deferred();
        connection.executeSql("update session set synced = 1, synced_at = ?, remote_id = ? where id = ?", [Date.now(), remoteId, id], function success() {
            defer.resolve();
        }, function error() {
            defer.fail();
        });
        return defer.promise();
    }

    static startDebugSync(id, total) {
        const connection = db.getConnection();
        const defer = $.Deferred();
        connection.executeSql("update session set dbg_attempt = if(dbg_attempt is null, 1, dbg_attempt + 1), dbg_tot_rows = ? where id = ?", [total, id], function success() {
            defer.resolve();
        }, function error() {
            defer.fail();
        });
        return defer.promise();
    }

    static debugSynced(id, rows) {
        const connection = db.getConnection();
        const defer = $.Deferred();
        connection.executeSql("update session set dbg_sync_rows = dbg_sync_rows + ? where id = ?", [rows, id], function success() {
            defer.resolve();
        }, function error() {
            defer.fail();
        });
        return defer.promise();
    }

    static debugSyncFinished(id, success) {
        const connection = db.getConnection();
        const defer = $.Deferred();
        connection.executeSql("update session set dbg_synced = ?, dbg_synced_at = ? where id = ?", [success ? 1 : 0, new Date().getTime(), id], function success() {
            defer.resolve();
        }, function error() {
            defer.fail();
        });
        return defer.promise();
    }

    static incrementAttempt(id) {
        const connection = db.getConnection();
        const defer = $.Deferred();
        connection.executeSql("update session set dbg_attempt = dbg_attempt + 1 where id = ?", [id], function success() {
            defer.resolve();
        }, function error() {
            defer.fail();
        });
        return defer.promise();
    }

    static sessionsSummary() {
        const connection = db.getConnection();
        const defer = $.Deferred();
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
    }

    static findAllNotSynced(callback) {
        const connection = db.getConnection();
        connection.executeSql("SELECT * FROM session WHERE synced <> 1 OR (dbg_synced = 0 AND (strftime('%s', 'now') - session_start/1000) < (86400 * 5))", [], function (res) {
            var rows = [];
            for (var i = 0; i < res.rows.length; i++) {
                rows.push(sessionFromDbRow(res.rows.item(i)));
            }
            callback(rows);
        }, function (error) {
            console.log('Error retrieving sessions: ' + error.message);
        });
    }

    static all(callback) {
        const self = this;
        const connection = db.getConnection();
        connection.executeSql("SELECT * FROM session order by id desc", [], function (res) {
            let rows = [];
            for (let i = 0; i < res.rows.length; i++) {
                rows.push(sessionFromDbRow(res.rows.item(i)));
            }
            callback(rows);
        }, function (error) {
            console.log('Error retrieving sessions: ' + error.message);
        });
    }

    static last() {
        const connection = db.getConnection();
        const defer = $.Deferred();
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
    }

    static getFromDate(date, callback) {
        const connection = db.getConnection();

        connection.executeSql('SELECT * FROM session WHERE session_end >= ? order by id desc', [date], function (res) {
            var rows = [];
            for (var i = 0; i < res.rows.length; i++) {
                rows.push(sessionFromDbRow(res.rows.item(i)));
            }
            callback(rows);
        }, function (error) {
            console.log('Error retrieving sessions: ' + error.message);
        });
    }

    static getForDates(startDate, endDate, callback) {
        const connection = db.getConnection();

        connection.executeSql('SELECT * FROM session WHERE session_end >= ? AND session_end <= ? order by id desc', [startDate, endDate], function (res) {
            var rows = [];
            for (var i = 0; i < res.rows.length; i++) {
                rows.push(sessionFromDbRow(res.rows.item(i)));
            }
            callback(rows);
        }, function (error) {
            console.log('Error retrieving sessions: ' + error.message);
        });
    }

    static get(id) {
        const connection = db.getConnection();
        const defer = $.Deferred();
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
    }

    get sessionStart() {
        return this._sessionStart;
    }

    set sessionStart(value) {
        this._sessionStart = value;
        this.debugFile = this.sessionStart + ".csv";
    }

    get angleZ() {
        return this._angleZ;
    }

    set angleZ(value) {
        this._angleZ = value;
    }

    get noiseX() {
        return this._noiseX;
    }

    set noiseX(value) {
        this._noiseX = value;
    }

    get noiseZ() {
        return this._noiseZ;
    }

    set noiseZ(value) {
        this._noiseZ = value;
    }

    get factorX() {
        return this._factorX;
    }

    set factorX(value) {
        this._factorX = value;
    }

    get factorZ() {
        return this._factorZ;
    }

    set factorZ(value) {
        this._factorZ = value;
    }

    get axis() {
        return this._axis;
    }

    set axis(value) {
        this._axis = value;
    }

    get distance() {
        return this._distance;
    }

    set distance(value) {
        this._distance = value;
    }

    get avgSpm() {
        return this._avgSpm;
    }

    set avgSpm(value) {
        this._avgSpm = value;
    }

    get topSpm() {
        return this._topSpm;
    }

    set topSpm(value) {
        this._topSpm = value;
    }

    get avgSpeed() {
        return this._avgSpeed;
    }

    set avgSpeed(value) {
        this._avgSpeed = value;
    }

    get topSpeed() {
        return this._topSpeed;
    }

    set topSpeed(value) {
        this._topSpeed = value;
    }

    get avgEfficiency() {
        return this._avgEfficiency;
    }

    set avgEfficiency(value) {
        this._avgEfficiency = value;
    }

    get topEfficiency() {
        return this._topEfficiency;
    }

    set topEfficiency(value) {
        this._topEfficiency = value;
    }

    get sessionEnd() {
        return this._sessionEnd;
    }

    set sessionEnd(value) {
        this._sessionEnd = value;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get remoteId() {
        return this._remoteId;
    }

    set remoteId(value) {
        this._remoteId = value;
    }

    get scheduledSessionId() {
        return this._scheduledSessionId;
    }

    set scheduledSessionId(value) {
        this._scheduledSessionId = value;
    }

    get scheduledSessionStart() {
        return this._scheduledSessionStart;
    }

    set scheduledSessionStart(value) {
        this._scheduledSessionStart = value;
    }

    get debugFile() {
        return this._debugFile;
    }

    set debugFile(value) {
        this._debugFile = value;
    }

    get avgHeartRate() {
        return this._avgHeartRate;
    }

    set avgHeartRate(value) {
        this._avgHeartRate = value;
    }

    get synced() {
        return this._synced;
    }

    set synced(value) {
        this._synced = (value === true);
    }

    get syncedAt() {
        return this._syncedAt;
    }

    set syncedAt(value) {
        this._syncedAt = value;
    }

    get serverClockGap() {
        return this._serverClockGap;
    }

    set serverClockGap(value) {
        this._serverClockGap = value;
    }

    get expression() {
        return this._expression;
    }

    set expression(value) {
        this._expression = value;
    }

    get debugAttempt() {
        return this._dbgAttempt;
    }

    set debugAttempt(value) {
        this._dbgAttempt = value;
    }

    get dbgSyncedRows() {
        return this._dbgSyncedRows;
    }

    set dbgSyncedRows(value) {
        this._dbgSyncedRows = value;
    }

    get version() {
        return this._version;
    }

    set version(value) {
        this._version = value;
    }

    get expressionJson() {
        return this._expressionJson;
    }

    set expressionJson(value) {
        this._expressionJson = value;
    }
}

function sessionFromDbRow(data) {
    let session = new Session(
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

    session.id = data.id;
    session.debugAttempt = data.dbg_attempt;
    session.remoteId = data.remote_id;
    session.dbgSyncedRows = data.dbg_sync_rows;
    session.scheduledSessionId = data.scheduled_session_id;
    session.scheduledSessionStart = data.scheduled_session_start;
    session.syncedAt = data.synced_at;
    session.synced = data.synced === 1;
    session.expression = data.expression;
    session.serverClockGap = data.server_clock_gap;
    session.avgHeartRate = data.avg_heart_rate;
    session.version = data.version;
    session.expressionJson = JSON.parse(data.expr_json);

    return session;
}

export default Session;
