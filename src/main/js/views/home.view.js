'use strict';

var Calibration = require('../model/calibration.js').Calibration;
var Session = require('../model/session.js').Session;
var Api = require('../server/api');
var Dialog = require('../utils/dialog');
var landscape = require('./home.art.html');
var portrait = require('./home.portrait.art.html');
var Chart = require('chart.js');
require('chartjs-plugin-datalabels');

function HomeView(page, context, request) {
    request = request || {};

    var name = Api.User.getProfile().name ? Api.User.getProfile().name
        : Api.User.getProfile().email;

    if (context.isPortraitMode()) {
        context.render(page, portrait({name: name}));
    } else {
        context.render(page, landscape());
    }

    screen.orientation.lock(context.isPortraitMode() ? 'portrait' : 'landscape-secondary');

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

    $page.find('.home-username-bold').html(name);

    self.updateLastSessionDate();

    $page.off('appShow').on('appShow', function () {
        self.updateLastSessionDate();
        if (context.isPortraitMode()) {
            setTimeout(function() {
                self.loadChart();
            }, 0);
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
        paddler: __VERSION__
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

HomeView.prototype.loadChart = function() {
    var $ctx = $("#home-chart-metrics");

    Session.getFromDate(moment().add(-15, 'days').toDate().getTime(), function(sessions) {
        var data = [],
            labels = [],
            session, backgroundColor = [],
            borderColor = [],
            indexedData = {},
            day, index = [], total = 0;

        var indexed = indexSessionsByDay(sessions);
        eachDayInLastXDays(15, function(cal) {
            var distance;
            if (indexed[cal.day]) {
                distance = sumSessions(indexed[cal.day]);
            } else {
                distance = 0;
            }

            total += distance;
            data.push(distance);
            labels.push(day);
            backgroundColor.push('rgba(239, 97, 86, .2)');
            borderColor.push('rgba(239, 97, 86, 1)');
        });

        if (total ===0) {
            $('.portrait-home-user-info-chart')
                .append($('<h1>No sessions yet... start paddling</h1>'));
        }

        new Chart($ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                legend: {
                    display: false
                },
                tooltips: {
                    enabled: false
                },
                scales: {
                    yAxes: [{
                        display: false
                    }],
                    xAxes: [{
                        display: false
                    }]
                },
                plugins: {
                   datalabels: {
                      display: true,
                      align: 'end',
                      anchor: 'end',
                      formatter: Math.round
                   }
                }
            }
        });
    });
}

function showNoCalibrationModal($page, context) {
    var html = [
        '<div class="info-modal-body">',
            '<div class="info-modal-title">No calibration found</div>',
            '<div class="info-modal-content"">',
                '<p>Before you start, we need to adjust to your mount system!</p>',
                '<p>Don\'t worry - it will only take a few seconds...</p>',
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
        '   <div class="info-modal-title">Calibration completed</div>',
        '   <div class="info-modal-content"">',
        '       <p>Thanks... now you can go ahead and start a new session</p>',
        '   </div>',
        '   <div class="info-modal-controls">',
        '       <div class="info-modal-primary-action">OK</div>',
        '   </div>',
        '</div>'
    ];

    var $body = $(html.join(''))
        , $ok = $body.find('.info-modal-primary-action');

    $ok.on('tap', function () {
        Dialog.hideModal();
    });

    Dialog.showModal($body, {center: true});
}

function eachDayInLastXDays(x, callback) {
    var today = new Date();
    var begin = moment().add(-x, 'days');
    var now = begin;
    for (var i = 0; i <= x; i++) {
        callback.apply({}, [{
            date: now.toDate(),
            day: now.format('YYYY-MM-DD')
        }]);
        now = now.add(1, 'days');
    }
}

function indexSessionsByDay(sessions) {
    var session, index = {}, day;
    for (var i = 0, l = sessions.length; i < l; i++) {
        session = sessions[i];
        day = moment(session.getSessionStart()).format('YYYY-MM-DD');
        if (!index[day]) {
            index[day] = [];
        }
        index[day].push(session);
    }
    return index;
}

function sumSessions(sessions) {
    if (sessions.length === 1)
        return sessions[0].getDistance();

    var sum = 0;
    for (var i = 0, l = sessions.length; i < l; i++) {
        sum += sessions[i].getDistance();
    }

    return sum;
}

exports.HomeView = HomeView;
