'use strict';
var db = require('../db');

function SessionDetail(session, timestamp, distance, speed, spm, efficiency) {
    this.connection = db.getConnection();
    this.session = session;
    this.timestamp = timestamp;
    this.distance = distance || 0;
    this.speed = speed || 0;
    this.spm = spm;
    this.efficiency = efficiency || 0;
}

SessionDetail.prototype.getSession = function () {
    return this.session;
}

SessionDetail.prototype.setSession = function (session) {
    this.session = session;
}

SessionDetail.prototype.getTimestamp = function () {
    return this.timestamp;
}

SessionDetail.prototype.setTimestamp = function (timestamp) {
    this.timestamp = timestamp;
}

SessionDetail.prototype.getDistance = function () {
    return this.distance;
}

SessionDetail.prototype.setDistance = function (distance) {
    this.distance = distance;
}

SessionDetail.prototype.getSpeed = function () {
    return this.speed;
}

SessionDetail.prototype.setSpeed = function (speed) {
    this.speed = speed;
}

SessionDetail.prototype.getSpm = function () {
    return this.spm;
}

SessionDetail.prototype.setSpm = function (spm) {
    this.spm = spm;
}

SessionDetail.prototype.getEfficiency = function () {
    return this.efficiency;
}

SessionDetail.prototype.setEfficiency = function (efficiency) {
    this.efficiency = efficiency;
}


SessionDetail.prototype.save = function () {
    this.connection.executeSql("INSERT INTO session_data (session, timestamp, distance, speed, spm, efficiency) VALUES (?,?,?,?,?,?)",
        [this.session, this.timestamp, this.distance, this.speed, this.spm, this.efficiency], function (res) {
            console.log("Session Data#" + res.insertId + " created");
        }, function (error) {
            console.log('Error creating session: ' + error.message);
        });
};

SessionDetail.get = function(sessionId, callback) {
    var connection = db.getConnection();
    connection.executeSql("SELECT timestamp, distance, speed, spm, efficiency FROM session_data WHERE session = ?",[sessionId], function (res) {
        var rows = [], data;
        for (var i = 0; i < res.rows.length; i++) {
            data = res.rows.item(i);
            rows.push(new SessionDetail(sessionId, data.timestamp, data.distance, data.speed, data.spm, data.efficiency));
        }
        callback(rows);
    }, function (error) {
        console.log('Error retrieving sessions: ' + error.message);
    });
};

exports.SessionDetail = SessionDetail;