'use strict';

import Api from '../server/api';
import Utils from '../utils/utils';
import Database from '../db';
import {UtterCyclingUtils} from "../utils/utter-cycling-utils";

/**
 * @typedef DBSessionSummaryDetail
 * @property {number} session
 * @property {number} split
 * @property {number} rows
 * @property {number} maxDistance
 * @property {number} distance
 * @property {number} startedAt
 * @property {number} finishedAt
 * @property {number} duration
 * @property {number} maxSpeed
 * @property {number} maxSPM
 * @property {number} maxEfficiency
 * @property {number} totalSPM
 * @property {number} totalEfficiency
 * @property {number} totalHeartRate
 *
 */

class SessionDetail {
    constructor(session, timestamp, distance, speed, spm, efficiency, latitude, longitude, altitude, heartRate, split
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
        this.altitude = altitude;
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

    getAltitude() {
        return this.altitude;
    }

    setAltitude(value) {
        this.altitude = value;
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
            ", latitude, longitude, altitude, heart_rate, split, strokes, accel_magnitude, recovery, motion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [this.session, this.timestamp, this.distance, this.speed, this.spm, this.efficiency
                , this.latitude, this.longitude, this.altitude, this.heartRate, this.split, this.strokes
                , this.accelerationMagnitude, this.recovery === true ? 1 : 0, this.motion], function (res) {
                // intentionally left blank
            }, function (error) {
                console.log('Error creating session: ' + error.message);
            });
    }

    /**
     *
     * @param {number} sessionId
     * @param {function} callback
     */
    static get(sessionId, callback) {
        let connection = Database.getConnection();
        connection.executeSql("SELECT * FROM session_data WHERE session = ? ORDER BY id ASC", [sessionId], /**@param {SQLResultSet} res */ function (res) {
            try {
                callback(SessionDetail.fillResultsArray(res.rows, sessionId));
            } catch (err) {
                Utils.notify(Api.User.getProfile().name, " Failed to load records from session detail " + err);
                throw err;
            }

        }, function (error) {
            console.log('Error retrieving sessions: ' + error.message);
        });
    }

    /**
     *
     * @param sessionId
     * @param splitId
     * @return {Promise<Array<SessionDetail>>}
     */
    static getDataForSplit(sessionId, splitId) {
        return new Promise((resolve, reject) => {
            let connection = Database.getConnection();
            connection.executeSql("SELECT * FROM session_data WHERE session = ? and split = ? ORDER BY id ASC", [sessionId, splitId], /**@param {SQLResultSet} res */ function (res) {
                try {
                    resolve(SessionDetail.fillResultsArray(res.rows, sessionId));
                } catch (err) {
                    Utils.notify(Api.User.getProfile().name, " Failed to load records from session detail " + err);
                    reject(err)
                }
            }, function (error) {
                console.log('Error retrieving sessions: ' + error.message);
                reject(error.message)
            });
        });
    }

    /**
     *
     * @param {SQLResultSetRowList} list
     * @param {number} sessionId
     * @private
     * @throws
     * @return {Array<SessionDetail>}
     */
    static fillResultsArray(list, sessionId) {
        const rows = [];
        let data;
        for (let i = 0; i < list.length; i++) {
            data = list.item(i);
            rows.push(new SessionDetail(sessionId, parseFloat(data.timestamp), parseFloat(data.distance)
              , parseFloat(data.speed), parseFloat(data.spm), parseFloat(data.efficiency)
              // the following lines will fail if in equador!
              , data.latitude ? parseFloat(data.latitude) : undefined
              , data.longitude ? parseFloat(data.longitude) : undefined
              , data.altitude ? parseFloat(data.altitude) : undefined
              , data.heart_rate ? data.heart_rate : 0
              , data.split, data.strokes, data.accel_magnitude, data.recovery === 1
              , data.motion
            ));
        }
        return rows;
    }

    /**
     *
     * @param {Integer} sessionId
     * @param {Array<number>} splits
     * @param {number} pausedDuration
     * @param {function} callback
     */
    static getDetailedMetrics(sessionId, splits, pausedDuration, callback) {
        let connection = Database.getConnection();
        let SQL = [
            'SELECT session, split,',
            '       count(1)                          rows,',
            '       Max(distance)                     maxDistance,',
            '       Max(distance) - Min(distance)     distance,',
            '       Min(timestamp)                    startedAt,',
            '       Max(timestamp)                    finishedAt,',
            '       Max(timestamp) - Min(timestamp)   duration,',
            '       Max(speed)                        maxSpeed,',
            '       Max(spm)                          maxSPM,',
            '       Max(efficiency)                   maxEfficiency,',
            '       SUM(spm)                          totalSPM,',
            '       SUM(efficiency)                   totalEfficiency,',
            '       SUM(heart_rate)                   totalHeartRate',
            'FROM   session_data ',
            'WHERE  SESSION = ? ',
            'GROUP  BY session, split ',
            'ORDER  BY split ASC'
        ].join(' ');

        SessionDetail.get(sessionId, /**@param {Array<SessionDetail>} records */(records) => {
            const elevation = UtterCyclingUtils.calculateElevationGain(records);
            connection.executeSql(SQL, [sessionId], function (res) {
                let rows = [];
                try {
                    for (let i = 0; i < res.rows.length; i++) {
                        rows.push(res.rows.item(i));
                    }
                    let sdm = new SessionDetailMetrics(rows, splits, elevation, pausedDuration);
                    sdm.process().then(() => {
                        callback(sdm, records);
                    })

                } catch (err) {
                    Utils.notify(Api.User.getProfile().name, " Failed to load records from session detail " + err);
                    throw err;
                }
            }, function (error) {
                console.log('Error retrieving sessions: ' + error.message);
            });
        });
    }
}



class SessionDetailMetrics {

    /**
     *
     * @param {Array<DBSessionSummaryDetail>} rows
     * @param {number[]} splits
     * @param {number} elevation
     * @param {number} pausedDuration
     */
    constructor(rows, splits, elevation = 0, pausedDuration = 0) {
        this._rows = rows;
        this._splits = splits;
        this._elevation = elevation;
        this._pausedDuration = pausedDuration;
    }

    /**
     * Calculate detailed metrics; Alters internal state
     * @return {Promise<void>}
     */
    async process() {
        const rows = this.rows;
        const splits = this.splits;
        const elevation = this.elevation;

        if (rows.length === 0) {
            this._distance = 0;
            this._avgSpeed = 0;
            this._maxSpeed = 0;
            this._maxSPM = 0;
            this._avgSPM = 0;
            this._maxEfficiency = 0;
            this._avgEfficiency = 0;
            this._avgHeartRate = 0;
            this._elevation = isNaN(elevation) ? 0 : elevation;
            return;
        }

        let data = rows[0];
        if (rows.length > 1) { // planned session
            let workingDuration = 0, workingDistance = 0, workingSPM = 0, workingEfficiency = 0, workingHeartRate = 0;
            let maxSpeed = -1, maxSPM = -1, maxEfficiency = -1, maxDistance = -1;
            data = {};
            for (let r = 0; r < rows.length; r++) {
                let row = rows[r];

                maxDistance = Math.max(maxDistance, row.maxDistance);
                if (row.split < 0 || splits.indexOf(row.split) < 0) continue;

                let refinedData;
                if (this.wasPaused(row.rows, row.duration)
                  && (refinedData = await this.calculateDistanceAndDurationWithoutPause(row.session, row.split)) !== null) {
                    workingDuration += refinedData.duration;
                    workingDistance += refinedData.distance;
                } else {
                    workingDuration += row.duration;
                    workingDistance += row.distance;
                }

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
            data.duration -= this._pausedDuration;
            this._avgSpeed = data.distance / (data.duration / 1000) * 3600;
        }

        this._distance = data.distance;
        this._maxSpeed = data.maxSpeed;
        this._maxSPM = data.maxSPM;
        this._avgSPM = data.totalSPM / (data.duration / 1000);
        this._maxEfficiency = data.maxEfficiency;
        this._avgEfficiency = data.totalEfficiency / (data.duration / 1000);
        this._avgHeartRate = data.totalHeartRate / (data.duration / 1000);
        this._elevation = elevation;

    }

    wasPaused(nbrOfRecords, duration) {
        const seconds = Math.round(duration / 1000);
        return (seconds - nbrOfRecords) >= 3;
    }

    /**
     *
     * @param {number} sessionId
     * @param {number} splitId
     * @return {{duration: number, distance: number} | null}
     */
    async calculateDistanceAndDurationWithoutPause(sessionId, splitId) {
        const data = await SessionDetail.getDataForSplit(sessionId, splitId);
        if (data.length === 0) return null;
        let previousTs = data[0].timestamp, totalTsGap = 0;
        let previousDt = data[0].distance, totalDtGap = 0;
        for (let i = 1, l = data.length; i < l; i++) {
            const record = data[i];
            const tsGap = record.timestamp - previousTs;
            const dtGap = record.distance - previousDt;

            if (Math.floor(tsGap / 1000) > 1) {
                console.log('found gap of', tsGap)
                totalTsGap += tsGap;
                totalDtGap += dtGap;
            }
            previousTs = record.timestamp;
            previousDt = record.distance;
        }

        const first = data[0], last = data[data.length -1];

        return {
            duration: (last.timestamp - first.timestamp) - totalTsGap,
            distance: (last.distance - first.distance) - totalDtGap
        };
    }


    get rows() {
        return this._rows;
    }

    set rows(value) {
        this._rows = value;
    }

    get splits() {
        return this._splits;
    }

    set splits(value) {
        this._splits = value;
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

    get elevation() {
        return this._elevation;
    }

    set elevation(value) {
        this._elevation = value;
    }

}

export default SessionDetail;
