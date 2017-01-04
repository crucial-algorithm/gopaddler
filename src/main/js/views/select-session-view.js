'use strict';
var Api = require('../server/api');
var ScheduledSession = require('../model/scheduled-session').ScheduledSession;


var mockupSessions = [
    {
        coach: {},
        expression: {text: "2 x (2'/1' + 4'/2' + 6'/3' + 8'/4')/4'' + 2 x (2'/1' + 4'/2' + 6'/3' + 8'/4')/4''"},
        session: {
            id: 1,
            splits: [{_duration: 10, _recovery: false, _unit: 'seconds'}, {_duration: 0.1, _recovery: true, _unit: 'Kilometers'},{_duration: 10, _recovery: false, _unit: 'seconds'}, {_duration: 5, _recovery: true, _unit: 'seconds'}]
        },
        date: moment().add(-3, 'd')
    },
    {
        coach: {},
        expression: {text: "2 x (2'/1' + 4'/2' + 6'/3' + 8'/4')/4''"},
        session: {
            id: 1,
            splits: [{_duration: 10, _recovery: false, _unit: 'seconds'}, {_duration: 2, _recovery: true, _unit: 'seconds'}]
        },
        date: moment().add(-2, 'd')
    },
    {coach: {}, expression: {text: "10 x 5'/1'"}, session: {id: 3, splits: [{_duration: 120, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}]}, date: moment().add(-1, 'd')},
    {coach: {}, expression: {text: "10 x 5'/1'"}, session: {id: 4, splits: [{_duration: 120, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}]}, date: moment().add(-0, 'd')},
    {coach: {}, expression: {text: "10 x 5'/1'"}, session: {id: 5, splits: [{_duration: 120, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}]}, date: moment().add(1, 'd')},
    {coach: {}, expression: {text: "10 x 5'/1'"}, session: {id: 6, splits: [{_duration: 120, _recovery: false, _unit: 'seconds'}, {_duration: 60, _recovery: true, _unit: 'seconds'}]}, date: moment().add(2, 'd')}
];


function SelectSessionView(page, context) {
    var $page = $(page)
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

        // PullToRefresh.init({
        //     mainElement: '.select-session-available-sessions',
        //     onRefresh: function () {
        //         ScheduledSession.sync().then(renderSessions).fail(function (err) {
        //             console.log(err);
        //             renderSessions([]);
        //         })
        //     }
        // });

        new IScroll('.select-session-available-sessions-wrapper', {});

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
        context.navigate('session', false, {
            session: session,
            warmUpFirst: $warmUpFirst.is(':checked')
        });
    });

    if (context.isDev()) {
        setTimeout(function () {
           renderSessions(mockupSessions.splice(0));
        }, 0);
    } else {
        renderSessions(ScheduledSession.load() || []);
    }

    function renderSessions(_sessions) {
        var session, date;
        var elements = $();
        sessions = _sessions;

        // Add free session
        elements = elements.add(['<li class="select-session-row selected" data-session-idx="-1">',
            '    <div class="select-session-row-wrapper">',
            '        <div><label class="session-row-label">' + moment().format('dddd') + '</label>' + moment().format('MMM DD') + '</div>',
            '        <div><label class="session-row-label"></label><span class="session-row-expression">Free Session</span></div>',
            '    </div>',
            '</li>'
        ].join(''));

        for (var s = 0; s < sessions.length; s++) {
            session = sessions[s];
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
        }, 0)
    }

}

exports.SelectSessionView = SelectSessionView;