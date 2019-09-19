'use strict';

import Database from '../db';

const CONSTANTS  = {
    KM: 'K',
    MI: 'M'
};

class Settings {

    constructor(version, units, syncOnlyOnWifi, restoreLayout, showTouchGestures
        , showCalibrationTips, default_session_filter, default_start_date, default_end_date
        , showBlackAndWhite, portraitMode, gpsRate, restingHeartRate, maxHeartRate, serverClockGap) {
        this._version = version;
        this._units = units;
        this._restoreLayout = restoreLayout;
        this._showTouchGestures = showTouchGestures === undefined ? true : showTouchGestures;
        this._showCalibrationTips = showCalibrationTips === undefined ? true : showCalibrationTips;
        this._defaultSessionFilter = default_session_filter;
        this._defaultStartDate = default_start_date;
        this._defaultEndDate = default_end_date;
        this._showBlackAndWhite = showBlackAndWhite;
        this._portraitMode = portraitMode;
        this._gpsRefreshRate = gpsRate;
        this._restingHeartRate = restingHeartRate;
        this._maxHeartRate = maxHeartRate;
        this._serverClockGap = serverClockGap;
    }

    getVersion() {
        return this._version;
    }

    setVersion(version) {
        this._version = version;
    }

    getUnits() {
        return this._units;
    }

    setUnits(units) {
        this._units = units;
    }

    isImperial() {
        return this._units === CONSTANTS.MI;
    }

    isRestoreLayout() {
        return this._restoreLayout;
    }

    setRestoreLayout(restoreLayout) {
        this._restoreLayout = restoreLayout;
    }

    isShowTouchGestures() {
        return this._showTouchGestures;
    }

    setShowTouchGestures(showTouchGestures) {
        this._showTouchGestures = showTouchGestures;
    }

    isShowCalibrationTips() {
        return this._showCalibrationTips;
    }

    setShowCalibrationTips(showCalibrationTips) {
        this._showCalibrationTips = showCalibrationTips;
    }

    getDefaultSessionFilter() {
        return this._defaultSessionFilter;
    }

    setDefaultSessionFilter(defaultSessionFilter) {
        this._defaultSessionFilter = defaultSessionFilter;
    }

    getDefaultStartDate() {
        return this._defaultStartDate;
    }

    setDefaultStartDate(defaultStartDate) {
        this._defaultStartDate = defaultStartDate;
    }

    getDefaultEndDate() {
        return this._defaultEndDate;
    }

    setDefaultEndDate(defaultEndDate) {
        this._defaultEndDate = defaultEndDate;
    }

    isShowBlackAndWhite() {
        return this._showBlackAndWhite;
    }

    setShowBlackAndWhite(showBlackAndWhite) {
        this._showBlackAndWhite = showBlackAndWhite;
    }

    isPortraitMode() {
        return this._portraitMode === true;
    }

    setPortraitMode(isPortraitMode) {
        this._portraitMode = isPortraitMode;
    }

    getGpsRefreshRate() {
        return this._gpsRefreshRate;
    }

    setGpsRefreshRate(rate) {
        this._gpsRefreshRate = rate;
    }

    getRestingHeartRate() {
        return this._restingHeartRate;
    }

    setRestingHeartRate(rate) {
        this._restingHeartRate = rate;
    }

    getMaxHeartRate() {
        return this._maxHeartRate;
    }

    setMaxHeartRate(rate) {
        this._maxHeartRate = rate;
    }

    getServerClockGap() {
        return this._serverClockGap;
    }

    setServerClockGap(gap) {
        if (gap === undefined) {
            console.log('invalid gap');
            return;
        }
        this._serverClockGap = gap;
    }

    touchGesturesShown() {
        let connection = Database.getConnection();
        connection.executeSql("update settings set show_touch_events_tips = ?", [0]);
        this.setShowTouchGestures(false);
    }

    calibrationTipsShown() {
        let connection = Database.getConnection();
        connection.executeSql("update settings set show_calibration_tips = ?", [0]);
        this.setShowCalibrationTips(false);
    }
    
    
    static loadSettings() {
        let defer = $.Deferred();
        let connection = Database.getConnection();

        connection.executeSql("SELECT * FROM settings", [], function success(res) {
            let row = res.rows.item(0);
            defer.resolve(
                new Settings(
                    row.version,
                    row.units,
                    row.sync_wifi,
                    row.restore_layout,
                    row.show_touch_events_tips === 1,
                    row.show_calibration_tips === 1,
                    row.default_session_filter,
                    row.default_start_date,
                    row.default_end_date,
                    row.black_and_white,
                    row.portrait_mode === 1,
                    row.gps_rate,
                    row.resting_heart_rate,
                    row.max_heart_rate,
                    row.server_clock_gap
                ));
        }, function error(e) {
            console.log('error loding settings... defaulting');
            defer.reject(err, new Settings(-1, CONSTANTS.KM, true, true));
        });

        return defer.promise();
    }

    static saveSettings(units, showBlackAndWhite, restoreLayout, portraitMode) {
        let connection = Database.getConnection();
        connection.executeSql("update settings set units = ?, black_and_white = ?, restore_layout = ?, portrait_mode = ?"
            , [units, showBlackAndWhite ? 1 : 0, restoreLayout ? 1 : 0, portraitMode ? 1 : 0]);
    }

    static updateHeartRate(resting, max) {
        let connection = Database.getConnection();
        connection.executeSql("update settings set resting_heart_rate = ?, max_heart_rate = ?", [resting, max]);
    }

    static updateGpsRefreshRate(rate) {
        let connection = Database.getConnection();
        connection.executeSql("update settings set gps_rate = ?", [rate]);
    }

    static updateServerClockGap(gap) {
        let connection = Database.getConnection();
        connection.executeSql("update settings set server_clock_gap = ?", [gap]);
    }

    static CONSTANTS() {
        return CONSTANTS;
    }
}


export default Settings;
