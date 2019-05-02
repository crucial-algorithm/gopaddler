'use strict';
var Api = require('../server/api');
var ScheduledSession = require('../model/scheduled-session').ScheduledSession;
var Utils = require('../utils/utils');
var template = require('./select.session.art.html');
var List = require('../utils/widgets/list').List;


var mockupSessions = [
    {
        expression: "20''/10'' + 20''/10''",
        id: 1,
        splits: [{_duration: 20, _recovery: false, _unit: 'seconds'}, {_duration: 10, _recovery: true, _unit: 'seconds'},{_duration: 20, _recovery: false, _unit: 'seconds'}],
        date: moment().add(-3, 'd')
    },
    {
        expression: "50m/10'' + 50m/10'",
        id: 1,
        splits: [{_duration: 100, _recovery: false, _unit: 'meters'}, {_duration: 20, _recovery: true, _unit: 'seconds'},{_duration: 100, _recovery: false, _unit: 'meters'}],
        date: moment().add(-2, 'd')
    }
];


function SelectSessionView(page, context) {
    context.render(page, template({isPortraitMode: context.isPortraitMode()
        , isLandscapeMode: !context.isPortraitMode()}));

    var self = this;
    page.onReady.then(function () {
        self.render.apply(self, [page, context]);
    });
}

SelectSessionView.prototype.render = function (page, context) {
    var self = this
        , $page = $(page)
        , $selectedSession = $page.find('.selected-session')
        , $start = $page.find('.select-session-start')
        , $warmUpFirst = $page.find('#warmup-first')
        , $wrapper = $('.select-session-available-sessions-wrapper')
        , $list, sessions, session, list;

    list = new List(page, {
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

    $list = $wrapper.find('ul');

    Api.TrainingSessions.live.deviceReady();
    self.deviceActiveIntervalId = setInterval(function () {
        Api.TrainingSessions.live.deviceReady();
    }, 10000);


    var expressions = {};
    Api.TrainingSessions.live.startListening();
    Api.TrainingSessions.live.syncClock(Api.User.getId());

    Api.TrainingSessions.live.on(Api.LiveEvents.PING, function (commandId) {
        console.log('ping');
        Api.TrainingSessions.live.deviceReady();
        Api.TrainingSessions.live.commandSynced(commandId);
    }, true);

    Api.TrainingSessions.live.on(Api.LiveEvents.START, function (commandId, payload) {
        console.log('start session', payload, "[", commandId, "]");

        $warmUpFirst.prop('checked', false);
        Api.TrainingSessions.live.commandSynced(commandId);
        start(payload.expression, payload.splits, /* RemoteSessionId = */ null
            , payload.startedAt
            , /* isWarmupFirst = */ true
            , /* wasStartedRemotely = */ true
        );
    }, false);

    Api.TrainingSessions.live.on(Api.LiveEvents.PUSH_EXPRESSION, function (commandId, session) {
        expressions[session.expression] = session.splits;
        Api.TrainingSessions.live.commandSynced(commandId);
        console.log('sync session', session)
    }, false);

    $page.on('appBeforeBack', function () {
        clearInterval(self.deviceActiveIntervalId);
        Api.TrainingSessions.live.deviceDisconnected();
        Api.TrainingSessions.live.clearCommandListeners();
        setTimeout(function () {
            App.load('home', 'slide-right', undefined, function () {
                App.removeFromStack();
            });
        }, 1);
        return false;
    });

    $list.on('tap', 'li', function selectSessionHandler(e) {
        $list.find('li').removeClass('selected');
        var $li = $(this);
        var idx = parseInt($li.attr('data-session-idx'));
        $li.addClass('selected');
        var value = context.translate("select_session_free_session");
        if (idx === -1)
            session = undefined;
        else
            session = sessions[idx];

        if (session)
            value = sessions[idx].getExpression();

        $selectedSession.text(value);
        Utils.forceSafariToReflow($('.select-session-play')[0]);
    });

    $start.on('tap', function () {
        if (session)
            start(session.getExpression(), session.getSplits(), session.getId(), null, $warmUpFirst.is(':checked'), false);
        else
            start(null, null, null, null, false, false);
    });

    $('.select-session-play input').on('change', function () {
        Utils.forceSafariToReflow($('.select-session-play')[0]);
    });

    if (context.isDev()) {
        setTimeout(function () {
            var sessions = [], session;
            for (var i = 0; i < mockupSessions.length; i++) {
                session = new ScheduledSession();
                session.fromJson(mockupSessions[i]);
                sessions.push(session);
            }
            renderSessions(sessions);
        }, 0);
    } else {
        renderSessions(ScheduledSession.load() || []);
    }


    /**
     *
     * @param expression
     * @param splits
     * @param remoteScheduledSessionId
     * @param startedAt
     * @param {boolean} isWarmUpFirst
     * @param {boolean} wasStartedRemotely
     */
    function start(expression, splits, remoteScheduledSessionId, startedAt, isWarmUpFirst, wasStartedRemotely) {
        clearInterval(self.deviceActiveIntervalId);
        Api.TrainingSessions.live.clearCommandListeners();
        context.navigate('session', false, {
            expression: expression,
            splits: splits,
            isWarmUpFirst: isWarmUpFirst === true,
            remoteScheduledSessionId: remoteScheduledSessionId,
            startedAt: startedAt,
            wasStartedRemotely: wasStartedRemotely
        });

    }

    function renderSessions(_sessions) {
        var session, date;
        var elements = $();
        sessions = _sessions;

        sessions = sort(sessions);

        for (var s = 0; s < sessions.length; s++) {
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

            date = moment(session.getDate());
            elements = elements.add(['<li class="select-session-row" data-session-idx="' + s + '">',
                '    <div class="select-session-row-wrapper">',
                '        <div><label class="select-session-date-label">' + date.format('dddd') + '</label>' + date.format('MMM DD') + '</div>',
                '        <div><label class="select-session-date-label"></label><span class="session-row-expression">' + session.getExpression() + '</span></div>',
                '    </div>',
                '</li>'
            ].join(''));
        }

        list.rows(elements);
        setTimeout(function () {
            $list.find('li:first').trigger('tap');
        }, 0)
    }
};

function sort(sessions) {

    if (!sessions || sessions.length === 0)
        return [null];

    var session, date, begin = [];
    for (var s = sessions.length - 1; s >= 0; s--) {
        session = sessions[s];
        date = moment(session.getDate());
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

exports.SelectSessionView = SelectSessionView;
