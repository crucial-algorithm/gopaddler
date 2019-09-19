'use strict';

import Context from '../context';
import Calibration from '../model/calibration';
import Session from '../model/session';
import Api from '../server/api';
import landscape from './home.art.html';
import portrait from './home.portrait.art.html';
import Utils from '../utils/utils';
import Settings from '../model/settings';
import GpChart from '../utils/widgets/chart';
import 'chartjs-plugin-datalabels';


class HomeView {

    constructor(page, context, request) {
        request = request || {};

        let name = Api.User.getProfile().name ? Api.User.getProfile().name
            : Api.User.getProfile().email;

        Api.TrainingSessions.live.startListening();

        Api.TrainingSessions.live.checkApiVersion().then(function (version) {
            let appVersion = __API_VERSION__;
            if (!appVersion || version > appVersion) {
                showUpdateAvailableModal(context);
            }
        });

        if (context.isPortraitMode()) {
            Context.render(page, portrait({name: name, isAndroid: context.isAndroid()}));
        } else {
            Context.render(page, landscape({isAndroid: context.isAndroid()}));
        }

        screen.orientation.lock(context.isPortraitMode() ? 'portrait' : 'landscape-secondary');

        let $page = $(page)
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

        $session.off('tap click').on('tap click', function () {
            let calibration = Calibration.load(context.isPortraitMode());
            if (!calibration) {
                showNoCalibrationModal(context);
                return false;
            }
            if (Context.userHasCoach())
                context.navigate('select-session', false, undefined);
            else
                context.navigate('session', false, undefined);
        });

        $settings.on('tap', function () {
            App.load('settings');
        });

        $page.find('.home-username-bold').html(name);

        self.updateLastSessionDate();

        page.onAndroidBackButton.then(function () {
            navigator.app.exitApp();
        });

        page.onReady.then(function () {
            self.updateLastSessionDate();
            Utils.forceSafariToReflow($('body')[0]);
            if (context.isPortraitMode()) {
                setTimeout(function() {
                    self.loadChart();
                }, 0);
            }

            Api.User.listenForCoachRequests(function (request) {
                setTimeout(function () {
                    showCoachRequestConfirmationModal(context, request); // create a memory leak, but that's ok for now
                }, 1000);
            });

            Api.TrainingSessions.live.updateStatus(Context.LiveStatus().OFFLINE, null);
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
            console.log(['[ ', Api.User.getName(), ' ]', ' Sync clock interim message ', id, ' @', new Date().toISOString()].join(''));
            Api.TrainingSessions.live.commandSynced(id, Api.LiveEvents.SYNC_CLOCK, {begin: payload.begin, device: Api.User.getId(), clock: Date.now()})
        }, true);

        Api.TrainingSessions.live.syncClock(Api.User.getId());
        Api.TrainingSessions.live.on(Api.LiveEvents.CLOCK_SYNCED, function (id, payload) {
            console.log(['[ ', Api.User.getName(), ' ]', ' Finished clock sync ', id, ' @', new Date().toISOString()].join(''));
            Settings.updateServerClockGap(payload.serverClock);
            context.setServerClockGap(payload.serverClock);
            Api.TrainingSessions.live.commandSynced(id)
        }, true);


        let hardResetFrom = localStorage.getItem('hard_reset');
        if (hardResetFrom) {
            localStorage.removeItem('hard_reset');
            hardResetFrom = new Date(hardResetFrom);
            if (Date.now() - hardResetFrom.getTime() < 10000) {
                setTimeout(function () {
                    App.load('coach-slave');
                }, 2000);
            }
        }

        $('#exit').on('tap', function (e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            try {
                navigator.app.exitApp();
            } catch(err) {
                console.error(err);
            }
        });
    }

    updateLastSessionDate() {
        let self = this;
        Session.last().then(function (session) {
            if (session === undefined) {
                self.$homeLastRecord.html('No sessions yet');
            } else {
                self.$homeLastRecordDate.html(moment(session.sessionStart).format('MMM D'));
            }
        });
    }

    loadChart() {
        let $ctx = $("#home-chart-metrics");

        Session.getFromDate(moment().add(-15, 'days').toDate().getTime(), function(sessions) {
            let data = [],
                labels = [],
                day, total = 0;

            let indexed = indexSessionsByDay(sessions);
            eachDayInLastXDays(8, function(cal) {
                let distance;
                if (indexed[cal.day]) {
                    distance = sumSessions(indexed[cal.day]);
                } else {
                    distance = 0;
                }

                total += distance;
                data.push(distance);
                labels.push(day);
            });

            let formatter = function (value, context) {
                if (value === 0) {
                    return '';
                }
                return Math.round(value);
            };

            new GpChart($ctx, 'bar', labels, {
                data: data,
                backgroundColor: 'rgba(238, 97, 86, 1)',
                borderColor: 'rgba(238, 97, 86, 1)',
                borderWidth: 1
            }, formatter, {weight: 700, offset: -10});


            if (total ===0) {
                $('.portrait-home-user-info-chart')
                    .prepend($('<h1>No sessions yet... start paddling</h1>'));
            }

        });
    }
}



function showNoCalibrationModal(context) {
    let message = [
        '<p>' + context.translate('no_calibration_found_alert_message_line1') + '</p>',
        '<p>' + context.translate('no_calibration_found_alert_message_line2') + '</p>'
    ].join('');

    context.ui.modal.confirm(context.translate('no_calibration_found_alert_title'), message
        , {
            text: context.translate('no_calibration_found_alert_option_calibrate'), callback: function calibrate() {
                context.navigate('calibration', true, {from: "start-session"});
            }
        }
        , {
            text: context.translate('no_calibration_found_alert_option_try_it'), callback: function skip() {
                if (Context.userHasCoach())
                    context.navigate('select-session', false, undefined);
                else
                    context.navigate('session', false, undefined);
            }
        }
    );
}

function showUpdateAvailableModal(context) {
    context.ui.modal.alert(context.translate('new_version_alert_title')
        , '<p>' + context.translate('new_version_alert_message') + '</p>'
        , {text: context.translate('new_version_alert_acknowledge')}
    );
}

function showFirstCalibrationCompletedModal(context) {
    context.ui.modal.alert(context.translate('calibration_completed_alert_title')
        , '<p>' + context.translate('calibration_completed_alert_message') + '</p>'
        , {text: context.translate('calibration_completed_alert_acknowledge')}
    );
}

function showCoachRequestConfirmationModal(context, request) {
    if (!request) return;

    let message = [
        '<p>' + context.translate('coach_request_message_line1') + '</p>',
        '<p class="small">' + context.translate('coach_request_message_warning_start') +' ', request.coach ,' ' + context.translate('coach_request_message_warning_finish') + '<p>'
    ].join('');

    context.ui.modal.confirm(request.coach, message
        , {
            text: context.translate('coach_request_option_allow'), callback: function calibrate() {
                Api.User.acceptRequest(request.requestID)
            }
        }
        , {
            text: context.translate('coach_request_option_reject'), callback: function skip() {
                Api.User.rejectRequest(request.requestID)
            }
        }
    );
}

function eachDayInLastXDays(x, callback) {
    let now = moment().add(-x, 'days');
    for (let i = 0; i <= x; i++) {
        callback.apply({}, [{
            date: now.toDate(),
            day: now.format('YYYY-MM-DD')
        }]);
        now = now.add(1, 'days');
    }
}

/**
 *
 * @param {Session[]} sessions
 */
function indexSessionsByDay(sessions) {
    let session, index = {}, day;
    for (let i = 0, l = sessions.length; i < l; i++) {
        session = sessions[i];
        day = moment(session.sessionStart).format('YYYY-MM-DD');
        if (!index[day]) {
            index[day] = [];
        }
        index[day].push(session);
    }
    return index;
}

/**
 *
 * @param {Session[]} sessions
 * @return {number|*}
 */
function sumSessions(sessions) {
    if (sessions.length === 1)
        return sessions[0].distance;

    let sum = 0;
    for (let i = 0, l = sessions.length; i < l; i++) {
        sum += sessions[i].distance;
    }

    return sum;
}

export default HomeView;