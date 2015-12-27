'use strict';

var utils = require('../utils/utils.js');
var Session = require('../model/session').Session;

function SessionsView(page) {
    var $back = $('.back-button', page), $page = $(page), nbr = 0;

    $back.on('touchstart', function () {
        App.back('home', function () {
        });
    });

    $page.on('appDestroy', function () {
        $back.off('touchstart');
    });

    var $sessions = $page.find('#local-sessions');

    // handle delete
    $sessions.on('touchstart', '.session-row-delete-btn', function (e) {
        var $el = $(e.target);
        Session.delete(parseInt($el.attr('session-id')))
            .then(function () {
                $el.closest('li').remove();
            });
    });

    // load sessions
    Session.all(function (sessions) {
        var $li, $main, sessionAt, hours, minutes, duration, dDisplay;
        nbr = sessions.length;

        if (nbr > 0) $sessions.empty().css('height', 'auto');

        for (var i = 0; i < nbr; i++) {
            $li = $('<li class="session-row vh_height20"></li>');

            $('<div class="session-row-wrapper"></div>')
                .append(($main = $('<div class="session-row-data-wrapper"></div>')))
                .append($('<div class="session-row-delete"></div>')
                    .append($('<div style="display:table;width:100%;height:100%"></div>')
                        .append($('<div class="session-row-delete-btn"></div>').attr("session-id", sessions[i].getId()).text("delete"))))
                .appendTo($li);


            sessionAt = moment(new Date(sessions[i].getSessionStart()));
            duration = moment.duration(sessions[i].getSessionEnd() - sessions[i].getSessionStart());

            hours = duration.hours();
            minutes = duration.minutes();

            if (hours > 0)
                dDisplay = hours + 'h' + utils.lpad(minutes, 2);
            else
                dDisplay = utils.lpad(minutes, 2) + "m";


            $('<div class="session-row-data"></div>')
                .append($("<div style=\"display:table-cell\"/>").html(sessionAt.format("MMM D")))
                .append($("<div style=\"display:table-cell\"/>").html(sessionAt.format("hh:mm:ss")))
                .append($("<div style=\"display:table-cell;text-transform:none\"/>").html(dDisplay))
                .append($("<div style=\"display:table-cell\"/>").html(utils.round2(sessions[i].getDistance() || 0) + " km"))
                .appendTo($main)
            ;

            $li.appendTo($sessions);
        }
    });

    Session.sessionsSummary().then(function (data) {
        var time = Math.floor(data.duration / 1000);
        var hours = Math.floor(time / 3600);
        time = time - hours * 3600;
        var minutes = Math.floor(time / 60);
        var seconds = time - minutes * 60;
        $('#total-distance', page).text(utils.round2(data.distance));
        $('#top-speed', page).text(utils.round2(data.speed));
        $('#total-duration', page).text([utils.lpad(hours, 2), utils.lpad(minutes, 2), utils.lpad(seconds, 2)].join(':'));
    });


    $page.on('appShow', function () {

        if (nbr === 0) return;

        var width = $('.session-row-delete', page).width();

        Swiped.init({
            query: 'li',
            list: true,
            left: 0,
            right: width
        });

        new IScroll($('#sessions-wrapper', page)[0], {});
    });
}

exports.SessionsView = SessionsView;