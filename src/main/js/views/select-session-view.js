'use strict';
var Api = require('../server/api');

function SelectSessionView(page, context, request) {
    var $page = $(page)
        , $selectedSession = $page.find('.selected-session')
        , $title = $page.find('.paddler-topbar')
        , $listWrapper = $page.find('.select-session-available-sessions-wrapper')
        , $list = $page.find('.select-session-available-sessions');

    $page.on('appShow', function () {
        $page.find('.select-session-play').height(window.screen.availHeight - $title.height());
        $listWrapper.height(window.screen.availHeight - $title.height());
        new IScroll('.select-session-available-sessions-wrapper', {});
    });

    $list.on('tap', 'li', function selectSessionHandler(e) {
        $list.find('li').removeClass('selected');
        var $li = $(this);
        $li.addClass('selected');
        $selectedSession.text("TBD" + new Date().getTime());
    });

    Api.TrainingSessions.scheduled().then(function (sessions) {
        var session, day, date;
        var elements = $();
        for (var s = 0; s < sessions.length; s++) {
            session = sessions[s];
            date = moment(session.date);
            elements = elements.add(['<li class="select-session-row">',
             '    <div class="select-session-row-wrapper">',
             '        <div><label class="session-row-label">'+ date.format('dddd') +'</label>'+date.format('MMM DD')+'</div>',
             '        <div><label class="session-row-label">&nbsp;</label><b>' + session.expression.text + '</b></div>',
             '    </div>',
             '</li>'
            ].join(''));
        }

        $list.append(elements);

    }).fail(function (err) {
        console.log(err);
    });
}

exports.SelectSessionView = SelectSessionView;