'use strict';
var db = require('../db');

function SessionDetail(session, timestamp, distance, speed, spm, efficiency, latitude, longitude) {
    this.connection = db.getConnection();
    this.session = session;
    this.timestamp = timestamp;
    this.distance = distance || 0;
    this.speed = speed || 0;
    this.spm = spm;
    this.efficiency = efficiency || 0;
    this.latitude = latitude;
    this.longitude = longitude;
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

SessionDetail.prototype.getLatitude = function () {
    return this.latitude;
};

SessionDetail.prototype.setLatitude = function (latitude) {
    this.latitude = latitude;
};

SessionDetail.prototype.getLongitude = function () {
    return this.longitude;
}

SessionDetail.prototype.setLongitude = function (longitude) {
    this.longitude = longitude;
};

SessionDetail.prototype.save = function () {
    this.connection.executeSql("INSERT INTO session_data (session, timestamp, distance, speed, spm, efficiency, latitude, longitude) VALUES (?,?,?,?,?,?,?,?)",
        [this.session, this.timestamp, this.distance, this.speed, this.spm, this.efficiency, this.latitude, this.longitude], function (res) {
            console.log("Session Data#" + res.insertId + " created");
        }, function (error) {
            console.log('Error creating session: ' + error.message);
        });
};

SessionDetail.get = function(sessionId, callback) {
    var connection = db.getConnection();
    connection.executeSql("SELECT timestamp, distance, speed, spm, efficiency, latitude, longitude FROM session_data WHERE session = ? ORDER BY id ASC",[sessionId], function (res) {
        var rows = [], data;
        for (var i = 0; i < res.rows.length; i++) {
            data = res.rows.item(i);
            rows.push(new SessionDetail(sessionId, parseFloat(data.timestamp), parseFloat(data.distance)
                , parseFloat(data.speed), parseFloat(data.spm), parseFloat(data.efficiency)
                // the following lines will fail if in equador!
                , data.latitude ? parseFloat(data.latitude) : undefined
                , data.longitude ? parseFloat(data.longitude) : undefined));
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

exports.SessionDetail = SessionDetail;