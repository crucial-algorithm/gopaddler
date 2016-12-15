'use strict';
var Api = require('../server/api');

function SelectSessionView(page, context, request) {
    var $page = $(page)
        , $selectedSession = $page.find('.selected-session')
        , $title = $page.find('.paddler-topbar')
        , $listWrapper = $page.find('.select-session-available-sessions-wrapper')
        , $list = $page.find('.select-session-available-sessions')
        , sessions;

    $page.on('appShow', function () {
        $page.find('.select-session-play').height(window.screen.availHeight - $title.height());
        $listWrapper.height(window.screen.availHeight - $title.height());
        new IScroll('.select-session-available-sessions-wrapper', {});
    });

    $list.on('tap', 'li', function selectSessionHandler(e) {
        $list.find('li').removeClass('selected');
        var $li = $(this);
        var idx = parseInt($li.attr('data-session-idx'));
        $li.addClass('selected');
        var value;
        if (idx === -1)
            value = "Free Session";
        else
            value = sessions[idx].expression.text;

        $selectedSession.text(value);
    });

    Api.TrainingSessions.scheduled().then(function (_sessions) {
        var session, date;
        var elements = $();
        sessions = _sessions;

        // Add free session
        elements = elements.add(['<li class="select-session-row" data-session-idx="-1">',
            '    <div class="select-session-row-wrapper">',
            '        <div><label class="session-row-label">'+ moment().format('dddd') +'</label>'+moment().format('MMM DD')+'</div>',
            '        <div><label class="session-row-label">&nbsp;</label><span class="session-row-expression">Free Session</span></div>',
            '    </div>',
            '</li>'
        ].join(''));

        for (var s = 0; s < sessions.length; s++) {
            session = sessions[s];
            date = moment(session.date);
            elements = elements.add(['<li class="select-session-row" data-session-idx="' + s + '">',
             '    <div class="select-session-row-wrapper">',
             '        <div><label class="session-row-label">'+ date.format('dddd') +'</label>'+date.format('MMM DD')+'</div>',
             '        <div><label class="session-row-label">&nbsp;</label><span class="session-row-expression">' + session.expression.text + '</span></div>',
             '    </div>',
             '</li>'
            ].join(''));
        }

        elements.height($listWrapper.height() / 7);

        $list.append(elements);


    }).fail(function (err) {
        console.log(err);
    });
}

exports.SelectSessionView = SelectSessionView;