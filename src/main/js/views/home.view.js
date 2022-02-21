'use strict';

import Context from '../context';
import Calibration from '../model/calibration';
import Session from '../model/session';
import Api from '../server/api';
import template from './home.portrait.art.html';
import Utils from '../utils/utils';
import Settings from '../model/settings';
import GpChart from '../utils/widgets/chart';
import AppSettings from "../utils/app-settings";


class HomeView {

    /**
     *
     * @param page
     * @param {Context} context
     * @param request
     */
    constructor(page, context, request) {
        request = request || {};

        let name = Api.User.getName();

        Api.TrainingSessions.live.startListening();

        Api.TrainingSessions.live.checkApiVersion().then(function (version) {
            let appVersion = __API_VERSION__;
            if (!appVersion || version > appVersion) {
                showUpdateAvailableModal(context);
            }
        });


        Context.render(page, template({isPortraitMode: context.isPortraitMode()
            , hasName: !!name, name: name, isAndroid: context.isAndroid()}));

        this.orientation = context.isPortraitMode() ? 'portrait-primary' : 'landscape-secondary';
        /**@type Promise */
        this.orientationDefinitionPromise = screen.orientation.lock(this.orientation);

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
            if (AppSettings.requiresCalibration() === false) {
                context.navigate('select-session', false, undefined);
                return;
            }

            let calibration = Calibration.load(context.isPortraitMode());
            if (!calibration && JSON.parse(localStorage.getItem("first_experiment_done")) === true) {
                showNoCalibrationModal(context);
                return false;
            }
            context.navigate('select-session', false, undefined);
        });

        $settings.on('tap', function () {
            App.load('settings');
        });

        self.updateLastSessionDate();

        page.onAndroidBackButton.then(function () {
            navigator.app.exitApp();
        });

        page.onReady.then(function () {
            self.updateLastSessionDate();
            Utils.forceSafariToReflow($('body')[0]);

            self.applyDimensionsToChart.apply(self, []).then(($canvas) => {
                self.loadChart($canvas);
            });

            Api.User.listenForCoachRequests(function (request) {
                setTimeout(function () {
                    showCoachRequestConfirmationModal(context, request); // create a memory leak, but that's ok for now
                }, 1000);
            });

            Api.TrainingSessions.live.updateStatus(Context.LiveStatus().OFFLINE, null);

            $('#exit').on('tap', function (e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                try {
                    navigator.app.exitApp();
                } catch(err) {
                    console.error(err);
                }
            });

            if (context.coachInviteTokenResolver) {
                context.coachInviteTokenResolver.then((token) => {
                    Api.User.acceptCoachInvite(Api.User.getId(), token).then((info) => {
                        context.ui.modal.alert(context.translate('universal_link_join_team_title')
                            , '<p>' + context.translate('universal_link_join_team_success', [info.coachName]) + '</p>'
                            , {text: context.translate('universal_link_join_team_acknowledge')}
                        );
                    }).fail((err) => {
                        context.ui.modal.alert(context.translate('universal_link_join_team_title')
                            , '<p>' + context.translate('universal_link_join_team_error') + '</p>'
                            , {text: context.translate('universal_link_join_team_acknowledge')}
                        );
                    });
                })
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


        // check if we are coming from calibration and show dialog if that's the case
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

        Api.User.onCoachAcceptedTeamRequest(function (id, payload) {
            Api.TrainingSessions.live.commandSynced(id);
            context.triggerCoachAcceptedRequest(payload);
        });

        Api.User.onUserConnectedToStrava(function (id, payload) {
            Api.TrainingSessions.live.commandSynced(id);
            context.triggerUserConnectedToStrava(payload)
        });


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

        /**@type Context */
        this.context = context;
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


    /**
     *
     * @return {Promise<Element>}
     */
    applyDimensionsToChart() {
        return new Promise((resolve, reject) => {
            const $canvas =  $("#home-chart-metrics");
            const $container = $('.home-user-info-chart');
            this.calculateWithAndHeightForChart.apply(this, [$container]).then((dimensions) => {
                $canvas.css(dimensions);
                resolve($canvas);
            }).catch((err) => {
                console.error(err);
                resolve($canvas)
            });
        });
    }

    /**
     *
     * @return {Promise<{width: number, height: number}>}
     */
    calculateWithAndHeightForChart($container) {
        return new Promise((resolve, reject) => {
            this.isDeviceOrientationSet().then(() => {
                // unfortunately, if browser does not support lock natively, plugin will call Android/ios native functions
                // to handle orientation and resolve promise before actually it gets applied! So, we need to add a
                // timeout and hope for the best
                setTimeout(() => {
                    const height = $container.innerHeight() - this.context.isAndroid() ? 20 : 0;
                    const width  = $container.innerWidth() - this.context.isAndroid() ? 20 : 0;
                    resolve({width: width, height: height});
                }, 250);
            }).catch((err) => {
                reject(err);
            })
        });
    }

    isDeviceOrientationSet() {
        return new Promise((resolve) => {
            this.orientationDefinitionPromise.finally(() => {
                if (this.context.isAndroid()) {
                    return resolve();
                }

                const pluginOrientation = screen.orientation.type;
                if (pluginOrientation !== this.orientation) {
                    // -> in iOS, if app is in landscape but device is in portrait, render get's messed up
                    // this is a hack to try to prevent that
                    console.log('orientation differs - hacking');
                    screen.orientation.unlock();
                    setTimeout(() => {
                        screen.orientation.lock(this.orientation).finally(() => {
                            console.log('orientation = ', screen.orientation.type);
                            resolve();
                        });
                    }, 3000);
                } else {
                    console.log('orientation properly set');
                    resolve();
                }
            })
        });
    }

    loadChart($ctx) {
        const self = this
            , NBR_OF_DAYS = 20;


        Session.getFromDate(moment().add(-NBR_OF_DAYS, 'days').toDate().getTime(), function(sessions) {
            let data = [], labels = [], total = 0;


            let indexed = indexSessionsByDay(sessions);
            eachDayInLastXDays(NBR_OF_DAYS, function(cal) {
                let distance;
                if (indexed[cal.day]) {
                    distance = sumSessions(indexed[cal.day]);
                } else {
                    distance = 0;
                }

                total += distance;
                if (distance === 0) return;
                data.push(self.context.displayMetric(Context.FIELD_TYPES().DISTANCE, distance));
                labels.push(cal.day);
            });

            let title;

            if (total === 0) {
                for (let i = 0; i < NBR_OF_DAYS; i++) {
                    labels[i] = moment().add(-NBR_OF_DAYS + i * 86400000);
                }
                title = self.context.translate('home_header_no_sessions');
            } else {
                const avg = Math.round(Utils.minMaxAvgStddev(data).avg * 100) / 100 + ' ' + self.context.getUnit(Context.FIELD_TYPES().DISTANCE_IN_SESSION_LIST, false);
                title = self.context.translate('home_header', [avg]);
            }

            let formatter = function (value, context) {
                if (context.datasetIndex === 1) {
                    return '';
                }
                return Math.round(value);
            };

            new GpChart($ctx, GpChart.TYPES().LINE, labels, /**@type ChartDataSet */{
                data: data,
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 4,
                pointRadius: 6,
                pointBackgroundColor: 'rgba(255, 255, 255, 1)'
            }, {
                displayYAxisGridLines: false
                , displayXAxisGridLines: true
                , xAxisLabelCallback: (label) => {
                    return moment(label).format('dd')
                }
                , title: title
                , onClick: ()=>{ self.context.navigate('sessions') }
                , paddingLeft: 20
                , paddingRight: 20
                , paddingTop: 20
                , labels: {display: true, weight: 700, offset: -30
                    , formatter: formatter
                    , clamp: true
                    , align: 'bottom'
                    , anchor: 'center'}
            }, true);


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
        '<p style="margin-top: 40px">' + context.translate('no_calibration_found_alert_message_line2') + '</p>'
    ].join('');

    context.ui.modal.confirm(context.translate('no_calibration_found_alert_title'), message
        , {
            text: context.translate('no_calibration_found_alert_option_calibrate'), callback: function calibrate() {
                context.navigate('calibration', false, {from: "start-session"});
            }
        }
        , {
            text: context.translate('no_calibration_found_alert_option_try_it'), callback: function skip() {
                context.navigate('select-session', false, undefined);
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
