'use strict';

var Calibration = require('../model/calibration.js').Calibration;
var Session = require('../model/session.js').Session;
var Api = require('../server/api');
var Dialog = require('../utils/dialog');

function HomeView(page, context, request) {
    request = request || {};

    var $page = $(page)
        , self = this
        , $sessions = $page.find('#btn-sessions')
        , $session = $page.find('#btn-session')
        , $settings = $page.find('#btn-settings')
        ;

    self.$homeLastRecord = $page.find('.home-last-record');
    self.$homeLastRecordDate = $page.find('.home-last-record-date');

    $sessions.on('tap', function () {
        App.load('sessions');
    });

    $session.on('tap', function () {
        var calibration = Calibration.load();
        if (calibration === undefined) {
            showNoCalibrationModal($(page), context);
            return false;
        }
        if (context.userHasCoach())
            context.navigate('select-session', false, undefined);
        else
            context.navigate('session', false, undefined);
    });

    $settings.on('tap', function () {
        App.load('settings');
    });

    $page.find('.home-username-bold').html(Api.User.getProfile().name);

    self.updateLastSessionDate();

    $page.on('appShow', function () {
        self.updateLastSessionDate();
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
        paddler: "0.8.7"
    });


    // check if we are comming from calibration and show dialog if that's the case
   if (request.from === 'calibration') {
       showFirstCalibrationCompletedModal($(page), context);
   }
}

HomeView.prototype.updateLastSessionDate = function () {
    var self = this;
    Session.last().then(function (session) {
        if (session === undefined) {
            self.$homeLastRecord.html('No sessions yet');
        } else {
            self.$homeLastRecordDate.html(moment(session.getSessionStart()).format('MMM D'));
        }
    });
};

function showNoCalibrationModal($page, context) {
    var html = [
        '<div class="info-modal-body">',
            '<div class="info-modal-title vh_height10 vh_line-height10">No calibration found</div>',
            '<div class="info-modal-content vh_height26"">',
                '<p style="text-align: center">Before you start, we need to adjust to your mount system!</p>',
                '<p class="vh_line-height11" style="text-align: center">Don\'t worry - it will only take a few seconds...</p>',
            '</div>',
            '<div class="info-modal-controls vh_height15 vh_line-height15">',
                '<div class="info-modal-secondary-action">Try it</div>',
                '<div class="info-modal-primary-action">Calibrate</div>',
            '</div>',
        '</div>'
    ];

    var $body = $(html.join(''))
        , $skip = $body.find('.info-modal-secondary-action')
        , $calibrate = $body.find('.info-modal-primary-action');

    $skip.on('tap', function () {
        Dialog.hideModal();
        context.navigate('session', true);

    });

    $calibrate.on('tap', function () {
        Dialog.hideModal();
        context.navigate('calibration', true, {from: "start-session"});
    });

    Dialog.showModal($body, {center: true});
}

function showFirstCalibrationCompletedModal($page, context) {
    var html = [
        '<div class="info-modal-body">',
        '<div class="info-modal-title vh_height10 vh_line-height10">Calibration completed</div>',
        '<div class="info-modal-content vh_height26"">',
        '<p style="text-align: center">Thanks... now you can go ahead and start a new session</p>',
        '</div>',
        '<div class="info-modal-controls vh_height15 vh_line-height15">',
        '<div class="info-modal-primary-action">OK</div>',
        '</div>',
        '</div>'
    ];

    var $body = $(html.join(''))
        , $ok = $body.find('.info-modal-primary-action');

    $ok.on('tap', function () {
        Dialog.hideModal();
    });

    Dialog.showModal($body, {center: true});
}

exports.HomeView = HomeView;
