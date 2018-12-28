'use strict';
var db = require('../db');
var Utils = require('../utils/utils');
var Api = require('../server/api');

function SessionDetail(session, timestamp, distance, speed, spm, efficiency, latitude, longitude, heartRate, split) {
    this.connection = db.getConnection();
    this.session = session;
    this.timestamp = timestamp;
    this.distance = Utils.round(distance || 0, 4);
    this.speed = Utils.round2(speed || 0);
    this.spm = spm;
    this.efficiency = Utils.round2(efficiency || 0);
    this.latitude = latitude;
    this.longitude = longitude;
    this.heartRate = heartRate;
    this.split = split;
}

SessionDetail.prototype.getSession = function () {
    return this.session;
};

SessionDetail.prototype.setSession = function (session) {
    this.session = session;
};

SessionDetail.prototype.getTimestamp = function () {
    return this.timestamp;
};

SessionDetail.prototype.setTimestamp = function (timestamp) {
    this.timestamp = timestamp;
};

SessionDetail.prototype.getDistance = function () {
    return this.distance;
};

SessionDetail.prototype.setDistance = function (distance) {
    this.distance = distance;
};

SessionDetail.prototype.getSpeed = function () {
    return this.speed;
};

SessionDetail.prototype.setSpeed = function (speed) {
    this.speed = speed;
};

SessionDetail.prototype.getSpm = function () {
    return this.spm;
};

SessionDetail.prototype.setSpm = function (spm) {
    this.spm = spm;
};

SessionDetail.prototype.getEfficiency = function () {
    return this.efficiency;
};

SessionDetail.prototype.setEfficiency = function (efficiency) {
    this.efficiency = efficiency;
};

SessionDetail.prototype.setHeartRate = function (heartRate) {
    this.heartRate = heartRate;
};
SessionDetail.prototype.getHeartRate = function () {
    return this.heartRate;
};

SessionDetail.prototype.getLatitude = function () {
    return this.latitude;
};

SessionDetail.prototype.setLatitude = function (latitude) {
    this.latitude = latitude;
};

SessionDetail.prototype.getLongitude = function () {
    return this.longitude;
};

SessionDetail.prototype.setLongitude = function (longitude) {
    this.longitude = longitude;
};

SessionDetail.prototype.getSplit = function () {
    return this.split;
};

SessionDetail.prototype.save = function () {
    this.connection.executeSql("INSERT INTO session_data (session, timestamp, distance, speed, spm, efficiency, latitude, longitude, heart_rate, split) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [this.session, this.timestamp, this.distance, this.speed, this.spm, this.efficiency, this.latitude, this.longitude, this.heartRate, this.split], function (res) {
            // intentinaly left blank
        }, function (error) {
            console.log('Error creating session: ' + error.message);
        });
};

SessionDetail.get = function(sessionId, callback) {
    var connection = db.getConnection();
    connection.executeSql("SELECT timestamp, distance, speed, spm, efficiency, latitude, longitude, heart_rate, split FROM session_data WHERE session = ? ORDER BY id ASC",[sessionId], function (res) {
        var rows = [], data;
        try {
            for (var i = 0; i < res.rows.length; i++) {
                data = res.rows.item(i);

                rows.push(new SessionDetail(sessionId, parseFloat(data.timestamp), parseFloat(data.distance)
                    , parseFloat(data.speed), parseFloat(data.spm), parseFloat(data.efficiency)
                    // the following lines will fail if in equador!
                    , data.latitude ? parseFloat(data.latitude) : undefined
                    , data.longitude ? parseFloat(data.longitude) : undefined
                    , data.heart_rate ? data.heart_rate : 0
                    , data.split
                ));
            }
        } catch (err) {
            Utils.notify(Api.User.getProfile().name, " Failed to load records from session detail " + err);
            throw err;
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

SessionDetail.getGroupedBySplit = function(sessionId, callback) {
    var connection = db.getConnection();
    connection.executeSql("SELECT timestamp, distance, speed, spm, efficiency, latitude, longitude, heart_rate, split FROM session_data WHERE session = ? ORDER BY id ASC",[sessionId], function (res) {
        var rows = [], data;
        try {
            for (var i = 0; i < res.rows.length; i++) {
                data = res.rows.item(i);

                rows.push(new SessionDetail(sessionId, parseFloat(data.timestamp), parseFloat(data.distance)
                    , parseFloat(data.speed), parseFloat(data.spm), parseFloat(data.efficiency)
                    // the following lines will fail if in equador!
                    , data.latitude ? parseFloat(data.latitude) : undefined
                    , data.longitude ? parseFloat(data.longitude) : undefined
                    , data.heart_rate ? data.heart_rate : 0
                    , data.split
                ));
            }
        } catch (err) {
            Utils.notify(Api.User.getProfile().name, " Failed to load records from session detail " + err);
            throw err;
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

/**
 * 
 * @param {Integer} sessionId
 * @param {Array.Integer} splits
 * @param {function} callback
 */
SessionDetail.getDetailedMetrics = function(sessionId, splits, callback) {
    var connection = db.getConnection();
    var SQL = [
        'SELECT split,',
        '       Max(distance)                   maxDistance,',
        '       Max(distance) - Min(distance)   distance,',
        '       Max(timestamp) - Min(timestamp) duration,',
        '       Max(speed)                      maxSpeed,',
        '       Max(spm)                        maxSPM,',
        '       Max(efficiency)                 maxEfficiency,',
        '       SUM(spm)                        totalSPM,',
        '       SUM(efficiency)                 totalEfficiency,',
        '       SUM(heart_rate)                 totalHeartRate',
        'FROM   session_data ',
        'WHERE  SESSION = ? ',
        'GROUP  BY split ',
        'ORDER  BY split ASC'
    ].join(' ');
    connection.executeSql(SQL, [sessionId], function (res) {
        var rows = [];
        try {
            for (var i = 0; i < res.rows.length; i++) {
                rows.push(res.rows.item(i));
            }
            callback(new SessionDetailMetrics(rows, splits));
        } catch (err) {
            Utils.notify(Api.User.getProfile().name, " Failed to load records from session detail " + err);
            throw err;
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

/**
 * 
 * @param {Array}           rows
 * @param {Array.Integer}   splits
 * @constructor
 */
function SessionDetailMetrics(rows, splits) {

    var data = rows[0];
    if (rows.length > 1) {
        var workingDuration = 0, workingDistance = 0, workingSPM = 0, workingEfficiency = 0, workingHeartRate = 0;
        var maxSpeed = -1, maxSPM = -1, maxEfficiency = -1, maxDistance = -1;
        data = {};
        for (var r = 0; r < rows.length; r++) {
            var row = rows[r];

            maxDistance = maxDistance > row.maxDistance ? maxDistance : row.maxDistance;
            if (row.split < 0 || splits.indexOf(row.split) < 0) continue;

            workingDuration += row.duration;
            workingDistance += row.distance;
            workingSPM += row.totalSPM;
            workingEfficiency += row.totalEfficiency;
            workingHeartRate += row.totalHeartRate;

            maxSpeed = maxSpeed > row.maxSpeed ? maxSpeed : row.maxSpeed;
            maxSPM = maxSPM > row.maxSPM ? maxSPM : row.maxSPM;
            maxEfficiency = maxEfficiency > row.maxEfficiency ? maxEfficiency : row.maxEfficiency;
        }

        data.distance = maxDistance;
        data.duration = workingDuration;
        data.maxSpeed = maxSpeed;
        data.maxSPM = maxSPM;
        data.maxEfficiency = maxEfficiency;
        data.totalSPM = workingSPM;
        data.totalEfficiency = workingEfficiency;
        data.totalHeartRate = workingHeartRate;

        this._avgSpeed = workingDistance / (data.duration / 1000) * 3600;

    } else {
        this._avgSpeed = data.distance / (data.duration / 1000) * 3600;
    }

    this._distance = data.distance;
    this._maxSpeed = data.maxSpeed;
    this._maxSPM = data.maxSPM;
    this._avgSPM = data.totalSPM / (data.duration / 1000);
    this._maxEfficiency = data.maxEfficiency;
    this._avgEfficiency = data.totalEfficiency / (data.duration / 1000);
    this._avgHeartRate = data.totalHeartRate / (data.duration / 1000);
}

SessionDetailMetrics.prototype.getDistance = function () {
    return this._distance;
};
SessionDetailMetrics.prototype.getMaxSpeed = function () {
    return this._maxSpeed;
};
SessionDetailMetrics.prototype.getAvgSpeed = function () {
    return this._avgSpeed;
};
SessionDetailMetrics.prototype.getMaxSpm = function () {
    return this._maxSPM;
};
SessionDetailMetrics.prototype.getAvgSpm = function () {
    return this._avgSPM;
};
SessionDetailMetrics.prototype.getMaxEfficiency = function () {
    return this._maxEfficiency;
};
SessionDetailMetrics.prototype.getAvgEfficiency = function () {
    return this._avgEfficiency;
};
SessionDetailMetrics.prototype.getAvgHeartRate = function () {
    return this._avgHeartRate;
};



exports.SessionDetail = SessionDetail;
