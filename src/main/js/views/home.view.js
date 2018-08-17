'use strict';

var Calibration = require('../model/calibration.js').Calibration;
var Session = require('../model/session.js').Session;
var Api = require('../server/api');
var landscape = require('./home.art.html');
var portrait = require('./home.portrait.art.html');
var Chart = require('chart.js');
var Utils = require('../utils/utils');
var Settings = require('../model/settings');
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
        var calibration = Calibration.load(context.isPortraitMode());
        if (calibration === undefined) {
            showNoCalibrationModal(context);
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

    page.onShown.then(function () {
        self.updateLastSessionDate();
        Utils.forceSafariToReflow($('body')[0]);
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
        showFirstCalibrationCompletedModal(context);
    }

    // reply with current time in order to allow server to calculate the difference between device and server clock
    Api.TrainingSessions.live.on(Api.LiveEvents.SYNC_CLOCK, function (id, payload) {

        Api.TrainingSessions.live.commandSynced(id, Api.LiveEvents.SYNC_CLOCK, {begin: payload.begin, device: Api.User.getId(), clock: Date.now()})
    }, true);

    Api.TrainingSessions.live.on(Api.LiveEvents.CLOCK_SYNCED, function (id, payload) {
        Settings.updateServerClockGap(payload.serverClock);
        context.setServerClockGap(payload.serverClock);
        Api.TrainingSessions.live.commandSynced(id)
    }, true);

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
            backgroundColor = [],
            borderColor = [],
            day, total = 0;

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

        if (total ===0) {
            $('.portrait-home-user-info-chart')
                .prepend($('<h1>No sessions yet... start paddling</h1>'));
        }

    });
};

function showNoCalibrationModal(context) {
    var message = [
        '<p>Before you start, we need to adjust to your mount system!</p>',
        '<p>Don\'t worry - it will only take a few seconds...</p>'
    ].join('');

    context.ui.modal.confirm('No calibration found', message
        , {
            text: "Calibrate", callback: function calibrate() {
                context.navigate('calibration', true, {from: "start-session"});
            }
        }
        , {
            text: "Try it", callback: function skip() {
                if (context.userHasCoach())
                    context.navigate('select-session', false, undefined);
                else
                    context.navigate('session', false, undefined);
            }
        }
    );
}

function showFirstCalibrationCompletedModal(context) {
    context.ui.modal.alert('Calibration completed'
        , '<p>Thanks... now you can go ahead and start a new session</p>'
        , {text: "OK"}
    );
}

function eachDayInLastXDays(x, callback) {
    var now = moment().add(-x, 'days');
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
