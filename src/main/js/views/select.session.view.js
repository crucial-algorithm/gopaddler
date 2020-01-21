'use strict';

import Context from '../context';
import ScheduledSession from '../model/scheduled-session';
import Api from '../server/api';
import Utils from '../utils/utils';
import List from '../utils/widgets/list';
import template from './select.session.art.html';

class SelectSessionView {
    constructor(page, context) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()
            , isLandscapeMode: !context.isPortraitMode()}));

        var self = this;
        page.onReady.then(function () {
            self.render.apply(self, [page, context]);
        });
    }

    render(page, context) {
        let self = this
            , $page = $(page)
            , $back = $page.find('.app-button[data-back]')
            , $selectedSession = $page.find('.selected-session')
            , $start = $page.find('.select-session-start')
            , $warmUpFirst = $page.find('#warmup-first')
            , $wrapper = $('.select-session-available-sessions-wrapper')
            , $list, /**@type ScheduledSession[] */ sessions, /**@type ScheduledSession */ session, listWidget;

        listWidget = new List(page, {
            $elem: $wrapper,
            swipe: false,
            ptr: {
                onRefresh: function () {
                    ScheduledSession.sync().then(renderSessions).fail(function (err) {
                        console.log(err);
                        renderSessions([]);
                    })
                }
            }
        });

        function back(e) {
            setTimeout(function () {
                App.load('home', function () {
                    App.removeFromStack();
                });
            }, 1);
            listWidget.destroy();
        }

        // bind event to back button
        $back.on('touchstart', back);

        $list = $wrapper.find('ul');

        $page.on('appBeforeBack', back);

        let slave = false;
        $list.on('tap', 'li', function selectSessionHandler(e) {
            const $li = $(this);
            let idx = parseInt($li.attr('data-session-idx'));
            slave = false;

            let value = context.translate("select_session_free_session");
            if (idx === -1) {
                session = null;
                slave = false;
            } else if (idx === -2) {
                session = null;
                value = context.translate("select_session_slave_mode_description");
                slave = true;
            } else if (idx === -3) {
                context.ui.modal.confirm(context.translate('select_session_coach_teaser_dialog_title')
                    , context.translate('select_session_coach_teaser_dialog_message'), {
                        text: context.translate('select_session_coach_teaser_dialog_invite'), callback: function () {
                            context.navigate('manage-coach', false, {focus: true});
                        },
                    }, {
                        text: context.translate('select_session_coach_teaser_dialog_later')
                    }
                );
                return;
            } else {
                session = sessions[idx];
                slave = false;
            }

            if (session)
                value = sessions[idx].expression;

            $list.find('li').removeClass('selected');
            $li.addClass('selected');
            $selectedSession.text(value);

            Utils.forceSafariToReflow($('.select-session-play')[0]);
        });

        $start.on('tap', function () {
            if (slave) {
                clearInterval(self.deviceActiveIntervalId);
                Api.TrainingSessions.live.clearCommandListeners();
                listWidget.destroy();
                context.navigate('coach-slave', true);
                return;
            }
            if (session)
                start(session.expression, session.splits, session.id, null, $warmUpFirst.is(':checked'), false, null);
            else
                start(null, null, null, null, false, false, null);
        });

        $('.select-session-play input').on('change', function () {
            Utils.forceSafariToReflow($('.select-session-play')[0]);
        });

        renderSessions(ScheduledSession.load(context.isDev()) || []);

        /**
         *
         * @param expression
         * @param splits
         * @param remoteScheduledSessionId          Scheduled session
         * @param startedAt
         * @param {boolean} isWarmUpFirst
         * @param {boolean} wasStartedRemotely
         * @param {String}  liveSessionId
         */
        function start(expression, splits, remoteScheduledSessionId, startedAt, isWarmUpFirst, wasStartedRemotely, liveSessionId) {
            clearInterval(self.deviceActiveIntervalId);
            Api.TrainingSessions.live.clearCommandListeners();
            listWidget.destroy();
            context.navigate('session', false, {
                expression: expression,
                splits: splits,
                isWarmUpFirst: isWarmUpFirst === true,
                remoteScheduledSessionId: remoteScheduledSessionId,
                startedAt: startedAt,
                wasStartedRemotely: wasStartedRemotely,
                liveSessionId: liveSessionId
            });

            $page.off();
        }

        /**
         *
         * @param {ScheduledSession[]} _sessions
         */
        function renderSessions(_sessions) {
            let date, elements = $();

            sessions = _sessions;
            sessions = sort(sessions);

            for (let s = 0; s < sessions.length; s++) {
                session = sessions[s];

                if (session === null) {
                    // Add free session
                    elements = elements.add(['<li class="select-session-row " data-session-idx="-1">',
                        '    <div class="select-session-row-wrapper">',
                        '        <div><label class="select-session-date-label">' + moment().format('dddd') + '</label>' + moment().format('MMM DD') + '</div>',
                        '        <div><label class="select-session-date-label"></label><span class="session-row-expression">' + context.translate("select_session_free_session") + '</span></div>',
                        '    </div>',
                        '</li>'
                    ].join(''));

                    continue;
                }

                date = moment(session.date);
                elements = elements.add(['<li class="select-session-row" data-session-idx="' + s + '">',
                    '    <div class="select-session-row-wrapper">',
                    '        <div><label class="select-session-date-label">' + date.format('dddd') + '</label>' + date.format('MMM DD') + '</div>',
                    '        <div><label class="select-session-date-label"></label><span class="session-row-expression">' + session.expression + '</span></div>',
                    '    </div>',
                    '</li>'
                ].join(''));
            }

            if (Context.userHasCoach()) {
                // add coach slave
                elements = elements.add(['<li class="select-session-row " data-session-idx="-2">',
                    '    <div class="select-session-row-wrapper">',
                    '        <div><label class="select-session-date-label">' + moment().format('dddd') + '</label>' + moment().format('MMM DD') + '</div>',
                    '        <div><label class="select-session-date-label"></label><span class="session-row-expression">' + context.translate("select_session_slave_mode") + '</span></div>',
                    '    </div>',
                    '</li>'
                ].join(''));
            } else {
                elements = elements.add(['<li class="select-session-row " data-session-idx="-3">',
                    '    <div class="select-session-row-wrapper">',
                    '        <div><label class="select-session-date-label">' + moment().format('dddd') + '</label>' + moment().format('MMM DD') + '</div>',
                    '        <div><label class="select-session-date-label"></label><span class="session-row-expression">' + context.translate("select_session_coach_teaser") + '</span></div>',
                    '    </div>',
                    '</li>'
                ].join(''));
            }

            listWidget.rows(elements);
            setTimeout(function () {
                $list.find('li:first').trigger('tap');
            }, 0);
        }
    }
}

/**
 *
 * @param {ScheduledSession[]} sessions
 * @return {*[]|*}
 */
function sort(sessions) {

    if (!sessions || sessions.length === 0)
        return [null];

    let /**@type ScheduledSession */ session, date, begin = [];
    for (var s = sessions.length - 1; s >= 0; s--) {
        session = sessions[s];
        date = moment(session.date);
        if (date.diff(new Date(), 'days') === 0) {
            begin.unshift(session);
            sessions.splice(s, 1);
        }
    }

    if (begin.length > 0) {
        begin.push(null);
        return begin.concat(sessions);
    } else {
        sessions.unshift(null);
    }

    return sessions;

}


export default SelectSessionView;
