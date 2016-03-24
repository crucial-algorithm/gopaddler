'use strict';

var Calibration = require('../model/calibration.js').Calibration;
var Session = require('../model/session.js').Session;
var Api = require('../server/api');
var Dialog = require('../utils/dialog');

function HomeView(page, context) {

    $('#btn-sessions', page).on('tap', function () {
        App.load('sessions');
    });

    $('#btn-session', page).on('tap', function () {
        var calibration = Calibration.load();
        if (calibration === undefined) {
            showNoCalibrationModal($(page), context);
            return false;
        }
        App.load('session');
    });

    $('#btn-settings', page).on('tap', function () {
        App.load('settings');
    });

    $('.home-username-bold', page).html(Api.User.getProfile().name);

    Session.last().then(function (session) {
        if (session === undefined) {
            $('.home-last-record', page).html('No sessions yet');
        } else {
            $('.home-last-record-date', page).html(moment(session.getSessionStart()).format('MMM D'));
        }
    });

    // store device information
    Api.User.saveDevice({
        cordova: device.cordova,
        model: device.model,
        platform: device.platform,
        uuid: device.uuid,
        version: device.version,
        manufacturer: device.manufacturer,
        isVirtual: device.isVirtual,
        serial: device.serial,
        paddler: "0.6.0"
    });
};

function showNoCalibrationModal($page, context) {
    var html = [
        '<div class="no-calibration-modal-body">',
            '<div class="no-calibration-modal-title vh_height10 vh_line-height10">No calibration found</div>',
            '<div class="no-calibration-modal-content vh_height26"">',
                '<p style="text-align: center">Before you start, we need to adjust to your mount system!</p>',
                '<p class="vh_line-height11" style="text-align: center">Don\'t worry - it will only take a few seconds...</p>',
            '</div>',
            '<div class="no-calibration-modal-controls vh_height15 vh_line-height15">',
                '<div class="no-calibration-modal-skip-btn">Ignore SPM</div>',
                '<div class="no-calibration-modal-calibrate-btn">Calibrate</div>',
            '</div>',
        '</div>'
    ];

    var $body = $(html.join(''))
        , $skip = $body.find('.no-calibration-modal-skip-btn')
        , $calibrate = $body.find('.no-calibration-modal-calibrate-btn');

    $skip.on('tap', function () {
        Dialog.hideModal();
        context.navigate('session', true);

    });

    $calibrate.on('tap', function () {
        Dialog.hideModal();
        context.navigate('calibration', true);
    });

    Dialog.showModal($body, {center: true});
}

exports.HomeView = HomeView;