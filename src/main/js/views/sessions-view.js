'use strict';

var utils = require('../utils/utils.js');
var Session = require('../model/session').Session;

function SessionsView(page) {
    var self = this, $back = $('.back-button', page), $page = $(page), nbr = 0;

    $back.on('touchstart', function () {
        App.back('home', function () {
        });
    });

    $page.on('appDestroy', function () {
        $back.off('touchstart');
    });

    var $sessions = $page.find('#local-sessions');

    // handle delete
    self.lock = {};
    self.progress = {};
    $sessions.on('touchstart', '.session-row-delete-btn', function (e) {
        var $el = $(event.target);
        var sessionId = $el.attr('session-id');

        if (self.lock[sessionId] === true) {
            self.cancelDelete($el, sessionId);
            return;
        }

        self.confirmDelete($el, sessionId);
        e.preventDefault();
        e.stopImmediatePropagation();
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
                .append($("<div style=\"display:table-cell\"/>").html('<b>' + utils.round2(sessions[i].getDistance() || 0) + " km</b>"))
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


SessionsView.prototype.confirmDelete = function ($button, sessionId) {
    var self = this;

    self.lock[sessionId] = true;

    // change button to cancel
    $button.addClass('cancel');
    $button.text('cancel');

    // add progress in order to wait for delete
    var $parent = $button.closest('li');
    var $row = $('<li/>').insertAfter($parent);
    $('<li/>').insertAfter($row);
    var $progress = $('<div class="progress-waiting-cancel"/>').appendTo($row);

    self.progress[sessionId] = {$dom: $row, start: new Date().getTime()};

    $({
        property: 0
    }).animate({
            property: 100
        }, {
            duration: 5000,
            step: function () {
                var _percent = Math.round(this.property);
                $progress.css("width", _percent + "%");
                if (_percent == 105) {
                    $progress.addClass("done");
                }
            },
            complete: function () {
                console.log(new Date().getTime() - self.progress[sessionId].start);
                if (self.lock[sessionId] !== true || new Date().getTime() - self.progress[sessionId].start < 5000) {
                    console.log('canceled');
                    return;
                }

                Session.delete(parseInt(sessionId))
                    .then(function () {
                        $button.closest('li').remove();
                        $row.next().remove();
                        $row.remove();
                        self.lock[sessionId] = false;
                    });
            }
        });
};

SessionsView.prototype.cancelDelete = function ($button, sessionId) {
    var self = this;
    self.lock[sessionId] = false;
    $button.removeClass('cancel');
    $button.text('delete');
    self.progress[sessionId].$dom.next().remove();
    self.progress[sessionId].$dom.remove();
};

exports.SessionsView = SessionsView;