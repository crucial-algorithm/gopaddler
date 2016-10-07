'use strict';

var THIS_MONTH_PERIOD_FILTER = 'this-month',
    LAST_MONTH_PERIOD_FILTER = 'last-month',

    utils   = require('../utils/utils.js'),
    Session = require('../model/session').Session,

    appContext,
    $page,
    $sessionList;

/**
 * Filter list of sessions by a given period
 *
 * @param {jQuery} $filter
 */
function filterSessionsByPeriod($filter) {
    var $sessionPeriodFilterButton = $page.find('#session-period-filter-button'),
        period = $filter.data('period');

    // adjust sessions according to chosen period
    Session.all(function (sessions) {
        var nbr = sessions.length;

        if (nbr > 0) $sessionList.empty().css('height', 'auto');

        for (var i = 0; i < nbr; i++) {
            switch (period) {
                case THIS_MONTH_PERIOD_FILTER:
                    if (moment(sessions[i].sessionStart).month() === moment(new Date()).month()) {
                        addSessionToSessionList(sessions[i]);
                    }

                    break;
                case LAST_MONTH_PERIOD_FILTER:
                    $sessionPeriodFilterButton.html('Last Month');
                    if (moment(sessions[i].sessionStart).month() === moment(new Date()).subtract(1, 'months').month()) {
                        addSessionToSessionList(sessions[i]);
                    }

                    break;
                default:
                    $sessionPeriodFilterButton.html('All Sessions');
                    addSessionToSessionList(sessions[i]);
            }
        }
    });

    // change filter label
    $page.find('.app-options-line.selected').removeClass('selected');
    $filter.addClass('selected');

    switch (period) {
        case THIS_MONTH_PERIOD_FILTER:
            $sessionPeriodFilterButton.html('Last 30 Days');
            break;
        case LAST_MONTH_PERIOD_FILTER:
            $sessionPeriodFilterButton.html('Last Month');
            break;
        default:
            $sessionPeriodFilterButton.html('All Sessions');
    }

    // update scroll to new height
    new IScroll('#sessions-wrapper');
}

/**
 * Add given session to the list of sessions
 *
 * @param {object} session
 */
function addSessionToSessionList(session) {
    var $li       = $('<li class="session-row vh_height20" data-id="' + session.id + '"></li>'),
        $main     = $('<div class="session-row-data-wrapper"></div>'),
        sessionAt = moment(new Date(session.getSessionStart())),
        duration  = moment.duration(session.getSessionEnd() - session.getSessionStart()),
        hours     = duration.hours(),
        minutes   = duration.minutes(),
        dDisplay  = utils.lpad(hours, 2) + ':' + utils.lpad(minutes, 2) + ' H',
        distance  = session.getDistance();

    $('<div class="session-row-wrapper"></div>')
        .append($main)
        .append($('<div class="session-row-delete"></div>')
            .append($('<div style="display:table;width:100%;height:100%"></div>')
                .append($('<div class="session-row-delete-btn"></div>').attr("session-id", session.getId()).text("delete"))))
        .appendTo($li);

    if (appContext.preferences().isImperial()) {
        distance = utils.kmToMiles(distance);
    }

    $('<div class="session-row-data"></div>')
        .append($("<div style=\"display:table-cell\"/>").html(sessionAt.format("MMM D")))
        .append($("<div style=\"display:table-cell\"/>").html(sessionAt.format("HH:mm:ss")))
        .append($("<div style=\"display:table-cell;text-transform:none\"/>").html(dDisplay))
        .append($("<div style=\"display:table-cell\"/>").html('<b>' + utils.round2(distance || 0) + ' ' + appContext.getUnit('distance') + '</b>'))
        .appendTo($main);

    // on a session tap, open session-summary with its details
    $main.on('tap', function () {
        App.load('session-summary', {
            session: session,
            isPastSession: true
        });
    });

    $li.appendTo($sessionList);
}

/**
 * Initialize Sessions view
 *
 * @param page
 * @param context
 */
function SessionsView(page, context) {
    var self = this,
        $back = $('.back-button', page),
        $sessionPeriodFilter,
        $sessionPeriodFilterOptions,
        $sessionPeriodFilterButton,
        nbr = 0;

    appContext   = context;
    $page        = $(page);
    $sessionList = $page.find('#local-sessions');

    $sessionPeriodFilter        = $page.find('#session-period-filter');
    $sessionPeriodFilterOptions = $sessionPeriodFilter.find('.app-options-line');
    $sessionPeriodFilterButton  = $page.find('#session-period-filter-button');

    // toggle session period filter dropdown when button is tapped
    $sessionPeriodFilterButton.on('tap', function () {
        $sessionPeriodFilter.toggle();
    });

    // filter session when a filter is applied
    $sessionPeriodFilterOptions.on('tap', function () {
        filterSessionsByPeriod($(this));
        $sessionPeriodFilter.toggle();
    });

    // bind event to back button
    $back.on('touchstart', function () {
        App.back('home', function () {
        });
    });

    $page.on('appDestroy', function () {
        $back.off('touchstart');
    });

    // handle delete
    self.lock = {};
    self.progress = {};
    $sessionList.on('touchstart', '.session-row-delete-btn', function (e) {
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
        nbr = sessions.length;

        if (nbr > 0) $sessionList.empty().css('height', 'auto');

        for (var i = 0; i < nbr; i++) {
            addSessionToSessionList(sessions[i]);
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

        // initialize session period filter datepicker
        $page.find('#session-period-datepicker').dateRangePicker({
            inline:          true,
            alwaysOpen:      true,
            container:       '#session-period-datepicker',
            singleMonth:     true,
            showShortcuts:   false,
            showTopbar:      false,
            hoveringTooltip: false,
            language:        'en'
        });

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
