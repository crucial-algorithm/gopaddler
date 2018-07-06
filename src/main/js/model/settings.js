'use strict';

var db = require('../db.js');

var CONSTANTS  = {
    KM: 'K',
    MI: 'M'
};

function Settings(version, units, syncOnlyOnWifi, restoreLayout, showTouchGestures
    , showCalibrationTips, default_session_filter, default_start_date, default_end_date
    , showBlackAndWhite, portraitMode, gpsRate, maxHeartRate) {
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
    this._portraitMode = portraitMode;
    this._gpsRefreshRate = gpsRate;
    this._maxHeartRate = maxHeartRate;
}

Settings.prototype.getVersion = function() {
    return this._version;
};

Settings.prototype.setVersion = function(version) {
    this._version = version;
};

Settings.prototype.getUnits = function() {
    return this._units;
};

Settings.prototype.setUnits = function(units) {
    this._units = units;
};

Settings.prototype.isImperial = function(){
    return this._units === CONSTANTS.MI;
};

Settings.prototype.isRestoreLayout = function() {
    return this._restoreLayout;
};

Settings.prototype.setRestoreLayout = function(restoreLayout) {
    this._restoreLayout = restoreLayout;
};

Settings.prototype.isShowTouchGestures = function () {
    return this._showTouchGestures;
};

Settings.prototype.setShowTouchGestures = function (showTouchGestures) {
    this._showTouchGestures = showTouchGestures;
};

Settings.prototype.isShowCalibrationTips = function () {
    return this._showCalibrationTips;
};

Settings.prototype.setShowCalibrationTips = function (showCalibrationTips) {
    this._showCalibrationTips = showCalibrationTips;
};

Settings.prototype.getDefaultSessionFilter = function() {
    return this._defaultSessionFilter;
};

Settings.prototype.setDefaultSessionFilter = function(defaultSessionFilter) {
    this._defaultSessionFilter = defaultSessionFilter;
};

Settings.prototype.getDefaultStartDate = function() {
    return this._defaultStartDate;
};

Settings.prototype.setDefaultStartDate = function(defaultStartDate) {
    this._defaultStartDate = defaultStartDate;
};

Settings.prototype.getDefaultEndDate = function() {
    return this._defaultEndDate;
};

Settings.prototype.setDefaultEndDate = function(defaultEndDate) {
    this._defaultEndDate = defaultEndDate;
};

Settings.prototype.isShowBlackAndWhite = function() {
    return this._showBlackAndWhite;
};

Settings.prototype.setShowBlackAndWhite = function(showBlackAndWhite) {
    this._showBlackAndWhite = showBlackAndWhite;
};

Settings.prototype.isPortraitMode = function() {
    return this._portraitMode === true;
};

Settings.prototype.setPortraitMode = function(isPortraitMode) {
    this._portraitMode = isPortraitMode;
};

Settings.prototype.getGpsRefreshRate = function() {
    return this._gpsRefreshRate;
};

Settings.prototype.setGpsRefreshRate = function(rate) {
    this._gpsRefreshRate = rate;
};

Settings.prototype.getMaxHeartRate = function() {
    return this._maxHeartRate;
};

Settings.prototype.setMaxHeartRate = function(rate) {
    this._maxHeartRate = rate;
};


Settings.prototype.touchGesturesShown = function () {
    var connection = db.getConnection();
    connection.executeSql("update settings set show_touch_events_tips = ?", [0]);
    this.setShowTouchGestures(false);
};

Settings.prototype.calibrationTipsShown = function () {
    var connection = db.getConnection();
    connection.executeSql("update settings set show_calibration_tips = ?", [0]);
    this.setShowCalibrationTips(false);
};


function loadSettings() {
    var defer = $.Deferred();
    var connection = db.getConnection();

    connection.executeSql("SELECT * FROM settings", [], function success(res) {
        var row = res.rows.item(0);
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
                row.max_heart_rate
            ));
    }, function error(e) {
        console.log('error loding settings... defaulting');
        defer.reject(err, new Settings(-1, CONSTANTS.KM, true, true));
    });

    return defer.promise();
}

function saveSettings(units, showBlackAndWhite, restoreLayout, portraitMode) {
    var connection = db.getConnection();
    connection.executeSql("update settings set units = ?, black_and_white = ?, restore_layout = ?, portrait_mode = ?"
        , [units, showBlackAndWhite ? 1 : 0, restoreLayout ? 1 : 0, portraitMode ? 1 : 0]);
}

function updateMaxHeartRate(value) {
    var connection = db.getConnection();
    connection.executeSql("update settings set max_heart_rate = ?", [value]);
}

function updateGpsRefreshRate(rate) {
    var connection = db.getConnection();
    connection.executeSql("update settings set gps_rate = ?", [rate]);
}

exports.loadSettings = loadSettings;
exports.saveSettings = saveSettings;
exports.updateMaxHeartRate = updateMaxHeartRate;
exports.Settings = Settings;
exports.updateGpsRefreshRate = updateGpsRefreshRate;
exports.CONSTANTS  = CONSTANTS;
