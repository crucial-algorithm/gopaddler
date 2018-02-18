'use strict';
var db = require('../db');
var Utils = require('../utils/utils');
var Api = require('../server/api');

function SessionDetail(session, timestamp, distance, speed, spm, efficiency, latitude, longitude, heartRate, split) {
    this.connection = db.getConnection();
    this.session = session;
    this.timestamp = timestamp;
    this.distance = distance || 0;
    this.speed = speed || 0;
    this.spm = spm;
    this.efficiency = efficiency || 0;
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

exports.SessionDetail = SessionDetail;
