'use strict';

var Context = require('../context').Context;

var LAST_30_DAYS_PERIOD_FILTER = 'last-30-days',
    LAST_MONTH_PERIOD_FILTER   = 'last-month',
    START_FROM_PERIOD_FILTER   = 'start-from',
    CUSTOM_PERIOD_FILTER       = 'custom',

    utils   = require('../utils/utils.js'),
    Session = require('../model/session').Session,

    swipe,
    iScroll,

    appContext,
    $page,
    $sessionList,
    $summaryDistance,
    $summarySpeed,
    $summaryTime,

    $calendar,
    selectedFilter,
    filterStartDate,
    filterEndDate;

/**
 * Add given session to the list of sessions
 *
 * @param {array} sessions
 */
function addSessionsToSessionList(sessions) {
    var totalDistance = 0.0,
        totalDuration = 0,
        totalSpeed    = 0.0,
        time,
        hours         = 0,
        minutes       = 0,
        seconds       = 0;

    $sessionList.empty().css('height', 'auto');

    if (sessions.length === 0) {
        var $noSessions = $('<li class="session-row-empty">You have no sessions for the selected period.</li>');

        $noSessions.appendTo($sessionList);

        // update scroll
        iScroll = new IScroll($('#sessions-wrapper', $page)[0], {});

        $summaryDistance.text(utils.round2(totalDistance));
        $summarySpeed.text(utils.round2(totalSpeed));
        $summaryTime.text([utils.lpad(hours, 2), utils.lpad(minutes, 2), utils.lpad(seconds, 2)].join(':'));

        return;
    }

    // add each session to the session list
    sessions.forEach(function (session) {
        var $li       = $('<li class="session-row" data-id="' + session.id + '"></li>'),
            $main     = $('<div class="session-row-data-wrapper"></div>'),
            sessionAt = moment(new Date(session.getSessionStart())),
            duration  = moment.duration(session.getSessionEnd() - session.getSessionStart()),
            dDisplay  = utils.lpad(duration.hours(), 2) + ':' + utils.lpad(duration.minutes(), 2) + ' H',
            distance  = session.getDistance(),
            speed     = session.getTopSpeed();

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
            .append($('<div/>').html('<label class="session-row-label">' + sessionAt.format('HH:mm') + 'h</label>' + sessionAt.format('MMM D')))
            .append($('<div/>').html('<label class="session-row-label">duration</label>' + dDisplay))
            .append($('<div/>').html('<label class="session-row-label">distance</label>' + '<b>' + utils.round2(distance || 0) + ' ' + appContext.getUnit('distance') + '</b>'))
            .appendTo($main);

        // on a session tap, open session-summary with its details
        $main.on('tap', function () {
            App.load('session-summary', {
                session: session,
                isPastSession: true
            });
        });

        // add to totals
        totalDistance += distance;
        totalDuration += duration;
        totalSpeed    =  Math.max(speed, totalSpeed);

        $li.appendTo($sessionList);
    });

    // update summary
    time    = Math.floor(totalDuration / 1000);
    hours   = Math.floor(time / 3600);
    time    = time - hours * 3600;
    minutes = Math.floor(time / 60);
    seconds = time - minutes * 60;

    $summaryDistance.text(utils.round2(totalDistance));
    $summarySpeed.text(utils.round2(totalSpeed));
    $summaryTime.text([utils.lpad(hours, 2), utils.lpad(minutes, 2), utils.lpad(seconds, 2)].join(':'));

    // update scroll and swipe for new elements
    iScroll = new IScroll($('#sessions-wrapper', $page)[0], {});

    swipe = Swiped.init({
        query: 'li',
        list: true,
        left: 0,
        right: $('.session-row-delete', $page).width()
    });
}

/**
 * Filter list of sessions by the selected filter
 *
 * @param {Context} context
 */
function filterSessionsByPeriod(context) {
    var $sessionPeriodFilterButton = $page.find('#session-period-filter-button'),
        calendarValues;

    // if calendar has been declared, get dates from it
    if ($calendar !== undefined) {
        calendarValues = $calendar[0].value.split(' to ');

        filterStartDate = moment(calendarValues[0]).startOf('day');
        filterEndDate   = filterStartDate;

        if (calendarValues.length > 1) {
            filterEndDate = moment(calendarValues[1]).endOf('day');
        }
    }

    switch (selectedFilter) {
        case LAST_MONTH_PERIOD_FILTER:
            $sessionPeriodFilterButton.html('Last Month');
            context.preferences().setDefaultSessionFilter(LAST_MONTH_PERIOD_FILTER);
            context.preferences().setDefaultStartDate(null);
            context.preferences().setDefaultEndDate(null);
            break;
        case START_FROM_PERIOD_FILTER:
            $sessionPeriodFilterButton.html('Since ' + filterStartDate.format('YYYY-MM-DD'));
            context.preferences().setDefaultSessionFilter(START_FROM_PERIOD_FILTER);
            context.preferences().setDefaultStartDate(filterStartDate.valueOf());
            context.preferences().setDefaultEndDate(filterEndDate.valueOf());
            break;
        case CUSTOM_PERIOD_FILTER:
            $sessionPeriodFilterButton.html(filterStartDate.format('YYYY-MM-DD') + ' to ' + filterEndDate.format('YYYY-MM-DD'));
            context.preferences().setDefaultSessionFilter(CUSTOM_PERIOD_FILTER);
            context.preferences().setDefaultStartDate(filterStartDate.valueOf());
            context.preferences().setDefaultEndDate(filterEndDate.valueOf());
            break;
        case LAST_30_DAYS_PERIOD_FILTER:
        default:
            $sessionPeriodFilterButton.html('Last 30 Days');
            context.preferences().setDefaultSessionFilter(LAST_30_DAYS_PERIOD_FILTER);
            context.preferences().setDefaultStartDate(null);
            context.preferences().setDefaultEndDate(null);
    }

    // adjust sessions according to chosen period
    if (selectedFilter === START_FROM_PERIOD_FILTER) {
        Session.getFromDate(filterStartDate.valueOf(), function (sessions) {
            addSessionsToSessionList(sessions);
        });
    } else {
        Session.getForDates(filterStartDate.valueOf(), filterEndDate.valueOf(), function (sessions) {
            addSessionsToSessionList(sessions);
        });
    }
}

/**
 * Change sessions period according to selected filter
 *
 * @param {string}  filter
 * @param {boolean} updateCalendar
 */
function setSessionPeriod(filter, updateCalendar) {
    // set default filter
    if (filter === undefined || filter === null) {
        filter = LAST_30_DAYS_PERIOD_FILTER;
    }

    // select new filter
    $page.find('.app-modal-button.selected').removeClass('selected');
    $page.find('.app-modal-button[data-period=' + filter + ']').addClass('selected');

    selectedFilter = filter;

    // if updateCalendar is set to false, don't change calendar dates
    if (updateCalendar === false) {

        return;
    }

    switch (filter) {
        case LAST_MONTH_PERIOD_FILTER:
            filterStartDate = moment(new Date()).subtract(1, 'months').startOf('month');
            filterEndDate   = moment(new Date()).subtract(1, 'months').endOf('month');
            break;
        case START_FROM_PERIOD_FILTER:
            filterStartDate = moment(new Date());
            filterEndDate   = moment(new Date());
            break;
        case CUSTOM_PERIOD_FILTER:
            filterStartDate = moment(new Date()).subtract(7, 'days');
            filterEndDate   = moment(new Date());
            break;
        case LAST_30_DAYS_PERIOD_FILTER:
        default:
            filterStartDate = moment(new Date()).subtract(30, 'days');
            filterEndDate   = moment(new Date());
    }

    // select new dates on the calendar
    if ($calendar !== undefined) {
        $calendar.data('dateRangePicker')
            .setDateRange(filterStartDate.format('YYYY-MM-DD'), filterEndDate.format('YYYY-MM-DD'), true);
    }
}

/**
 * Initializes and binds events to Session Filter modal and its buttons
 *
 * @param {jQuery} $page
 * @param {Context} context
 */
function setupSessionFilter($page, context) {
    var $sessionPeriodFilter,
        $sessionPeriodFilterOptions,
        $sessionPeriodFilterButton,
        $sessionFilterCancelButton,
        $sessionFilterApplyButton,
        $sessionPeriodFilterBackground;

    $calendar                      = $page.find('#session-period-datepicker');
    $sessionPeriodFilterButton     = $page.find('#session-period-filter-button');
    $sessionPeriodFilter           = $page.find('#session-period-filter');
    $sessionPeriodFilterBackground = $sessionPeriodFilter.find('#session-filter-background');
    $sessionPeriodFilterOptions    = $sessionPeriodFilter.find('.app-modal-button');
    $sessionFilterCancelButton     = $sessionPeriodFilter.find('#cancel-session-filter');
    $sessionFilterApplyButton      = $sessionPeriodFilter.find('#apply-session-filter');

    // if calendar has been initialized, return. (this happens on session summary back button)
    if ($calendar.data('dateRangePicker') !== undefined) {

        return;
    }

    // initialize session period filter datepicker
    $calendar.dateRangePicker({
        inline:          true,
        alwaysOpen:      true,
        container:       '#session-period-datepicker',
        singleMonth:     true,
        showShortcuts:   false,
        showTopbar:      false,
        hoveringTooltip: false,
        language:        'en'
    });

    $calendar.data('dateRangePicker')
        .setDateRange(filterStartDate.format('YYYY-MM-DD'), filterEndDate.format('YYYY-MM-DD'), true);

    $calendar
        .bind('datepicker-first-date-selected', function(event, obj) {
            // activate starting from filter when first date is selected, and update calendar value to single date
            setSessionPeriod(START_FROM_PERIOD_FILTER, false);
            $(this)[0].value = moment(obj.date1).format('YYYY-MM-DD');
        })
        .bind('datepicker-change',function(event, obj) {
            // activate custom filter when second date is selected and is different than the first
            if (moment(obj.date2).format('YYYY-MM-DD') === moment(obj.date1).format('YYYY-MM-DD')) {
                setSessionPeriod(START_FROM_PERIOD_FILTER, false);
                $(this)[0].value = moment(obj.date1).format('YYYY-MM-DD');
            } else {
                setSessionPeriod(CUSTOM_PERIOD_FILTER, false);
            }
        });

    // toggle modal when button is tapped
    $sessionPeriodFilterButton.on('tap', function () {
        $sessionPeriodFilter.toggle();
    });

    // hide modal when cancel is tapped
    $sessionFilterCancelButton.on('tap', function () {
        $sessionPeriodFilter.hide();
    });

    // hide modal when background is tapped
    $sessionPeriodFilterBackground.on('tap', function () {
        $sessionPeriodFilter.hide();
    });

    // reflect period on calendar when a filter is chosen
    $sessionPeriodFilterOptions.on('tap', function () {
        setSessionPeriod($(this).data('period'));
    });

    // filter session when apply is tapped
    $sessionFilterApplyButton.on('tap', function () {
        filterSessionsByPeriod(context);
        $sessionPeriodFilter.toggle();
    });
}

/**
 * Initialize Sessions view
 *
 * @param page
 * @param context
 */
function SessionsView(page, context) {
    var self = this,
        $back = $('.back-button', page);

    appContext   = context;
    $page        = $(page);
    $sessionList = $page.find('#local-sessions');

    // initialize calendar as undefined so date are retrieved from preferences and not it
    $calendar    = undefined;

    $summaryDistance = $page.find('#total-distance');
    $summarySpeed    = $page.find('#top-speed');
    $summaryTime     = $page.find('#total-duration');

    // set unit labes according to user preference
    $page.find('#sessions-summary-distance-unit').html(context.getUnit('distance'));
    $page.find('#sessions-summary-speed-unit').html(context.getUnit('speed'));

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

    // load sessions according to user preferences
    setSessionPeriod(context.preferences().getDefaultSessionFilter());

    if (context.preferences().getDefaultStartDate() !== null && context.preferences().getDefaultStartDate() !== undefined) {
        filterStartDate = moment(context.preferences().getDefaultStartDate());
    }

    if (context.preferences().getDefaultEndDate() !== null && context.preferences().getDefaultStartDate() !== undefined) {
        filterEndDate = moment(context.preferences().getDefaultEndDate());
    }

    filterSessionsByPeriod(context);

    $page.on('appShow', function () {

        // initialize and bind events to session filter
        setupSessionFilter($page, context);

        var width = $('.session-row-delete', page).width();

        swipe = Swiped.init({
            query: 'li',
            list: true,
            left: 0,
            right: width
        });

        iScroll = new IScroll($('#sessions-wrapper', page)[0], {});
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

                        // update scroll
                        iScroll = new IScroll($('#sessions-wrapper', $page)[0], {});

                        filterSessionsByPeriod(appContext);

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
