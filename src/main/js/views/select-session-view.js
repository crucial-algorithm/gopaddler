'use strict';
var Api = require('../server/api');
var ScheduledSession = require('../model/scheduled-session').ScheduledSession;


var mockupSessions = [
    {
        expression: "10''/5'' + 10''/5''",
        id: 1,
        splits: [{_duration: 10, _recovery: false, _unit: 'seconds'}, {_duration: 5, _recovery: true, _unit: 'seconds'},{_duration: 10, _recovery: false, _unit: 'seconds'}, {_duration: 5, _recovery: true, _unit: 'seconds'}],
        date: moment().add(-3, 'd')
    },
    {
        expression: "50m/30m + 50m/30m",
        id: 1,
        splits: [{_duration: 50, _recovery: false, _unit: 'meters'}, {_duration: 30, _recovery: true, _unit: 'meters'},{_duration: 50, _recovery: false, _unit: 'meters'}, {_duration: 30, _recovery: true, _unit: 'meters'}],
        date: moment().add(-2, 'd')
    }
];


function SelectSessionView(page, context) {
    var self = this
        , $page = $(page)
        , $back = $('.paddler-back', page)
        , $selectedSession = $page.find('.selected-session')
        , $title = $page.find('.paddler-topbar')
        , $listWrapper = $page.find('.select-session-available-sessions-wrapper')
        , $list = $page.find('.select-session-available-sessions')
        , $start = $page.find('.select-session-start')
        , $warmUpFirst = $page.find('#warmup-first')
        , sessions, session
        , $body = $(document.body);

    $page.on('appShow', function () {
        var height = $body.height() - $title.height();
        $page.find('.select-session-play').height(height);
        $listWrapper.height(height);

        PullToRefresh.init({
            mainElement: '#ptr',
            getStyles: function(){return ".__PREFIX__ptr {\n pointer-events: none;\n  font-size: 0.85em;\n  font-weight: bold;\n  top: 0;\n  height: 0;\n  transition: height 0.3s, min-height 0.3s;\n  text-align: center;\n  width: 100%;\n  overflow: hidden;\n  display: flex;\n  align-items: flex-end;\n  align-content: stretch;\n}\n.__PREFIX__box {\n  padding: 10px;\n  flex-basis: 100%;\n}\n.__PREFIX__pull {\n  transition: none;\n}\n.__PREFIX__text {\n  margin-top: .33em;\n  color: rgba(0, 0, 0, 0.3);\n}\n.__PREFIX__icon {\n  color: rgba(0, 0, 0, 0.3);\n  transition: transform .3s;\n}\n.__PREFIX__release .__PREFIX__icon {\n  transform: rotate(180deg);\n}";},
            onRefresh: function () {
                ScheduledSession.sync().then(renderSessions).fail(function (err) {
                    console.log(err);
                    renderSessions([]);
                })
            }
        });

        new IScroll('.select-session-available-sessions-container', {});

    });

    Api.TrainingSessions.live.deviceReady();
    self.deviceActiveIntervalId = setInterval(function () {
        Api.TrainingSessions.live.deviceReady();
    }, 60000);


    var expressions = {};
    Api.TrainingSessions.live.startListening();

    Api.TrainingSessions.live.on('start', function (commandId, expression) {
        console.log('start session', expression, "[", commandId, "]");

        if (expressions[expression]) {
            $warmUpFirst.prop('checked', false);
            start(null, {text: expression, splits: expressions[expression]});
            Api.TrainingSessions.live.commandSynced(commandId);
        } else {
            console.log("expression", expression, "not found");
        }
    });

    Api.TrainingSessions.live.on('sync', function (commandId, session) {
        expressions[session.expression] = session.splits;
        Api.TrainingSessions.live.commandSynced(commandId);
        console.log('sync session', session)
    });

    $back.on('click', function () {
        App.back('home', function () {
        });
    });


    $page.on('appBeforeBack', function (e) {
        clearInterval(self.deviceActiveIntervalId);
        Api.TrainingSessions.live.deviceDisconnected();
        Api.TrainingSessions.live.clearCommandListeners();
    });

    $list.on('tap', 'li', function selectSessionHandler(e) {
        $list.find('li').removeClass('selected');
        var $li = $(this);
        var idx = parseInt($li.attr('data-session-idx'));
        $li.addClass('selected');
        var value = "Free Session";
        if (idx === -1)
            session = undefined;
        else
            session = sessions[idx];

        if (session)
            value = sessions[idx].getExpression();

        $selectedSession.text(value);
    });

    $start.on('tap', function () {
        start(session, null);
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

    function start(session, expression) {
        clearInterval(self.deviceActiveIntervalId);
        Api.TrainingSessions.live.clearCommandListeners();
        context.navigate('session', false, {
            session: session,
            expression: expression,
            warmUpFirst: $warmUpFirst.is(':checked')
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
                    '        <div><label class="session-row-label">' + moment().format('dddd') + '</label>' + moment().format('MMM DD') + '</div>',
                    '        <div><label class="session-row-label"></label><span class="session-row-expression">Free Session</span></div>',
                    '    </div>',
                    '</li>'
                ].join(''));

                continue;
            }

            date = moment(session.getDate());
            elements = elements.add(['<li class="select-session-row" data-session-idx="' + s + '">',
                '    <div class="select-session-row-wrapper">',
                '        <div><label class="session-row-label">' + date.format('dddd') + '</label>' + date.format('MMM DD') + '</div>',
                '        <div><label class="session-row-label"></label><span class="session-row-expression">' + session.getExpression() + '</span></div>',
                '    </div>',
                '</li>'
            ].join(''));
        }

        $list.empty();
        $list.append(elements);
        setTimeout(function () {
            $list.find('li:first').trigger('tap');
        }, 0)
    }
}

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
