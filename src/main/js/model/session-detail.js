'use strict';

import Api from '../server/api';
import Utils from '../utils/utils';
import Database from '../db';


class SessionDetail {
    constructor(session, timestamp, distance, speed, spm, efficiency, latitude, longitude, heartRate, split
        , strokes, magnitude, isRecovery, motion) {
        this.connection = Database.getConnection();
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
        this.strokes = strokes === undefined ? null : strokes;
        this.accelerationMagnitude = magnitude === undefined ? null : magnitude;
        this.recovery = isRecovery === true;
        this.motion = motion || null;
    }

    getSession() {
        return this.session;
    }

    setSession(session) {
        this.session = session;
    }

    getTimestamp() {
        return this.timestamp;
    }

    setTimestamp(timestamp) {
        this.timestamp = timestamp;
    }

    getDistance() {
        return this.distance;
    }

    setDistance(distance) {
        this.distance = distance;
    }

    getSpeed() {
        return this.speed;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    getSpm() {
        return this.spm;
    }

    setSpm(spm) {
        this.spm = spm;
    }

    getEfficiency() {
        return this.efficiency;
    }

    setEfficiency(efficiency) {
        this.efficiency = efficiency;
    }

    setHeartRate(heartRate) {
        this.heartRate = heartRate;
    }

    getHeartRate() {
        return this.heartRate;
    }

    getLatitude () {
        return this.latitude;
    }

    setLatitude(latitude) {
        this.latitude = latitude;
    }

    getLongitude() {
        return this.longitude;
    }

    setLongitude(longitude) {
        this.longitude = longitude;
    }

    getSplit() {
        return this.split;
    }

    getStrokes() {
        return this.strokes;
    }

    getMagnitude() {
        return this.accelerationMagnitude;
    }

    isRecovery() {
        return this.recovery;
    }

    getMotion() {
        return this.motion;
    }

    save() {
        this.connection.executeSql("INSERT INTO session_data (session, timestamp, distance, speed, spm, efficiency" +
            ", latitude, longitude, heart_rate, split, strokes, accel_magnitude, recovery, motion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [this.session, this.timestamp, this.distance, this.speed, this.spm, this.efficiency
                , this.latitude, this.longitude, this.heartRate, this.split, this.strokes
                , this.accelerationMagnitude, this.recovery === true ? 1 : 0, this.motion], function (res) {
                // intentionally left blank
            }, function (error) {
                console.log('Error creating session: ' + error.message);
            });
    }

    static get(sessionId, callback) {
        let connection = Database.getConnection();
        connection.executeSql("SELECT * " +
            "FROM session_data WHERE session = ? ORDER BY id ASC",[sessionId], function (res) {
            let rows = [], data;
            try {
                for (let i = 0; i < res.rows.length; i++) {
                    data = res.rows.item(i);

                    rows.push(new SessionDetail(sessionId, parseFloat(data.timestamp), parseFloat(data.distance)
                        , parseFloat(data.speed), parseFloat(data.spm), parseFloat(data.efficiency)
                        // the following lines will fail if in equador!
                        , data.latitude ? parseFloat(data.latitude) : undefined
                        , data.longitude ? parseFloat(data.longitude) : undefined
                        , data.heart_rate ? data.heart_rate : 0
                        , data.split, data.strokes, data.accel_magnitude, data.recovery === 1
                        , data.motion
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
    }

    /**
     *
     * @param {Integer} sessionId
     * @param {number[]} splits
     * @param {function} callback
     */
    static getDetailedMetrics(sessionId, splits, callback) {
        let connection = Database.getConnection();
        let SQL = [
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
            let rows = [];
            try {
                for (let i = 0; i < res.rows.length; i++) {
                    rows.push(res.rows.item(i));
                }
                callback(new SessionDetailMetrics(rows, splits));
            } catch (err) {
                Utils.notify(Api.User.getProfile().name, " Failed to load records from session detail " + err);
                throw err;
            }
        }, function (error) {
            console.log('Error retrieving sessions: ' + error.message);
        });
    }
}



class SessionDetailMetrics {

    /**
     *
     * @param {Array} rows
     * @param {number[]} splits
     */
    constructor(rows, splits) {
        if (rows.length === 0) {
            this._distance = 0;
            this._avgSpeed = 0;
            this._maxSpeed = 0;
            this._maxSPM = 0;
            this._avgSPM = 0;
            this._maxEfficiency = 0;
            this._avgEfficiency = 0;
            this._avgHeartRate = 0;
            return;
        }

        let data = rows[0];
        if (rows.length > 1) {
            let workingDuration = 0, workingDistance = 0, workingSPM = 0, workingEfficiency = 0, workingHeartRate = 0;
            let maxSpeed = -1, maxSPM = -1, maxEfficiency = -1, maxDistance = -1;
            data = {};
            for (let r = 0; r < rows.length; r++) {
                let row = rows[r];

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

    getDistance() {
        return this._distance;
    }

    getMaxSpeed() {
        return this._maxSpeed;
    }

    getAvgSpeed() {
        return this._avgSpeed;
    }

    getMaxSpm() {
        return this._maxSPM;
    }

    getAvgSpm() {
        return this._avgSPM;
    }

    getMaxEfficiency() {
        return this._maxEfficiency;
    }

    getAvgEfficiency() {
        return this._avgEfficiency;
    }

    getAvgHeartRate() {
        return this._avgHeartRate;
    }
}

export default SessionDetail;
