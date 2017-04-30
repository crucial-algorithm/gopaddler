'use strict';

var Sync = require('../server/sync');
var Session = require('../model/session').Session;
var Utils = require('../utils/utils.js');
var Api = require('../server/api');

var LAST_30_DAYS_PERIOD_FILTER = 'last-30-days',
    LAST_MONTH_PERIOD_FILTER = 'last-month',
    START_FROM_PERIOD_FILTER = 'start-from',
    CUSTOM_PERIOD_FILTER = 'custom',

    sessionsDict = {},

    utils = require('../utils/utils.js'),

    swipe,
    iScroll,

    appContext,
    $page,
    $sessionList,
    $firstLiInList,
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
        totalSpeed = 0.0,
        time,
        hours = 0,
        minutes = 0,
        seconds = 0;

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

    sessionsDict = {};

    // add each session to the session list
    sessions.forEach(function (session) {

        var $li = $('<li class="session-row" data-id="' + session.id + '"></li>'),
            $main = $('<div class="session-row-data-wrapper"></div>'),
            sessionAt = moment(new Date(session.getSessionStart())),
            duration = moment.duration(session.getSessionEnd() - session.getSessionStart()),
            dDisplay = utils.lpad(duration.hours(), 2) + ':' + utils.lpad(duration.minutes(), 2) + ' H',
            distance = session.getDistance(),
            speed = session.getTopSpeed();

        if (appContext.preferences().isImperial()) {
            distance = utils.kmToMiles(distance);
        }

        sessionsDict[session.getId()] = session;

        // add controls
        $('<div class="session-row-wrapper"></div>').append($main)
            .append($([
                    '<div class="session-row-actions">',
                    '	<div style="display:table;width:100%;height:100%">',
                    '		<div class="session-row-upload-btn" session-id="{session-id}">sync</div>',
                    '		<div class="session-row-delete-btn" session-id="{session-id}">delete</div>',
                    '	</div>',
                    '</div>'
                ].join('').replace(new RegExp('{session-id}', 'g'), session.getId())
            )).appendTo($li);

        // add row data
        $([
                '<div class="session-row-data">',
                '	<div>',
                '		<label class="session-row-label">{hour}</label> {day}',
                '	</div>',
                '	<div>',
                '		<label class="session-row-label">duration</label>{duration}',
                '	</div>',
                '	<div>',
                '		<label class="session-row-label">distance</label><b>{distance}</b>',
                '	</div>',
                '	<div>',
                '		<label class="session-row-label">Synced</label><span data-selector="synced">{synced}</span>',
                '	</div>',
                '</div>'
            ].join('')
            .replace('{hour}', sessionAt.format('HH:mm'))
            .replace('{day}', sessionAt.format('MMM D'))
            .replace('{duration}', dDisplay)
            .replace('{distance}', utils.round2(distance || 0) + ' ' + appContext.getUnit('distance'))
            .replace('{synced}', session.isSynced() ? 'yes' : 'no')
        ).appendTo($main);

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
        totalSpeed = Math.max(speed, totalSpeed);

        $li.appendTo($sessionList);
    });

    $firstLiInList = $sessionList.find('li:first');

    // update summary
    time = Math.floor(totalDuration / 1000);
    hours = Math.floor(time / 3600);
    time = time - hours * 3600;
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
        right: $('.session-row-actions', $page).width()
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
        filterEndDate = filterStartDate;

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
            filterEndDate = moment(new Date()).subtract(1, 'months').endOf('month');
            break;
        case START_FROM_PERIOD_FILTER:
            filterStartDate = moment(new Date());
            filterEndDate = moment(new Date());
            break;
        case CUSTOM_PERIOD_FILTER:
            filterStartDate = moment(new Date()).subtract(7, 'days');
            filterEndDate = moment(new Date());
            break;
        case LAST_30_DAYS_PERIOD_FILTER:
        default:
            filterStartDate = moment(new Date()).subtract(30, 'days');
            filterEndDate = moment(new Date());
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

    $calendar = $page.find('#session-period-datepicker');
    $sessionPeriodFilterButton = $page.find('#session-period-filter-button');
    $sessionPeriodFilter = $page.find('#session-period-filter');
    $sessionPeriodFilterBackground = $sessionPeriodFilter.find('#session-filter-background');
    $sessionPeriodFilterOptions = $sessionPeriodFilter.find('.app-modal-button');
    $sessionFilterCancelButton = $sessionPeriodFilter.find('#cancel-session-filter');
    $sessionFilterApplyButton = $sessionPeriodFilter.find('#apply-session-filter');

    // if calendar has been initialized, return. (this happens on session summary back button)
    if ($calendar.data('dateRangePicker') !== undefined) {

        return;
    }

    // initialize session period filter datepicker
    $calendar.dateRangePicker({
        inline: true,
        alwaysOpen: true,
        container: '#session-period-datepicker',
        singleMonth: true,
        showShortcuts: false,
        showTopbar: false,
        hoveringTooltip: false,
        language: 'en'
    });

    $calendar.data('dateRangePicker')
        .setDateRange(filterStartDate.format('YYYY-MM-DD'), filterEndDate.format('YYYY-MM-DD'), true);

    $calendar
        .bind('datepicker-first-date-selected', function (event, obj) {
            // activate starting from filter when first date is selected, and update calendar value to single date
            setSessionPeriod(START_FROM_PERIOD_FILTER, false);
            $(this)[0].value = moment(obj.date1).format('YYYY-MM-DD');
        })
        .bind('datepicker-change', function (event, obj) {
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

    appContext = context;
    $page = $(page);
    $sessionList = $page.find('#local-sessions');

    // initialize calendar as undefined so date are retrieved from preferences and not it
    $calendar = undefined;

    $summaryDistance = $page.find('#total-distance');
    $summarySpeed = $page.find('#top-speed');
    $summaryTime = $page.find('#total-duration');

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

    $sessionList.on('touchstart', '.session-row-upload-btn', function (e) {
        var $el = $(event.target);
        var sessionId = parseInt($el.attr('session-id'))
            , session = sessionsDict[sessionId];

        self.uploadSession($el, session);

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
        var height = $(document.body).height() - $page.find('.paddler-topbar').height();

        $("#sessions-wrapper-for-pull-to-refresh").height(height);

        // initialize and bind events to session filter
        setupSessionFilter($page, context);

        var width = $('.session-row-actions', page).width();

        swipe = Swiped.init({
            query: 'li',
            list: true,
            left: 0,
            right: width
        });

        $firstLiInList = $sessionList.find('li:first');
        PullToRefresh.init({
            mainElement: '#sessions-ptr',
            getStyles: function () {
                return ".__PREFIX__ptr {\n pointer-events: none;\n  font-size: 0.85em;\n  font-weight: bold;\n  top: 0;\n  height: 0;\n  transition: height 0.3s, min-height 0.3s;\n  text-align: center;\n  width: 100%;\n  overflow: hidden;\n  display: flex;\n  align-items: flex-end;\n  align-content: stretch;\n}\n.__PREFIX__box {\n  padding: 10px;\n  flex-basis: 100%;\n}\n.__PREFIX__pull {\n  transition: none;\n}\n.__PREFIX__text {\n  margin-top: .33em;\n  color: rgba(0, 0, 0, 0.3);\n}\n.__PREFIX__icon {\n  color: rgba(0, 0, 0, 0.3);\n  transition: transform .3s;\n}\n.__PREFIX__release .__PREFIX__icon {\n  transform: rotate(180deg);\n}";
            },
            instructionsPullToRefresh: 'Pull down to sync',
            instructionsReleaseToRefresh: 'Release to sync',
            instructionsRefreshing: 'Syncing sessions',
            isBlock: function () {
                return $firstLiInList.position().top < 0;
            },
            onRefresh: function () {
                self.uploadUnsyncedSessions($page);
            },
            refreshTimeout: 300
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

    animateDeleteAction.apply(self, [$button, sessionId, function () {
        Session.delete(parseInt(sessionId))
            .then(function () {

                if (self.lock[sessionId] !== true || new Date().getTime() - self.progress[sessionId].start < 5000) {
                    return;
                }

                $button.closest('li').remove();
                // update scroll
                iScroll = new IScroll($('#sessions-wrapper', $page)[0], {});

                filterSessionsByPeriod(appContext);

                self.lock[sessionId] = false;
            });
    }]);
};

SessionsView.prototype.cancelDelete = function ($button, sessionId) {
    var self = this;
    self.lock[sessionId] = false;
    $button.removeClass('cancel');
    $button.text('delete');
    self.progress[sessionId].$dom.next().remove();
    self.progress[sessionId].$dom.remove();
};

SessionsView.prototype.uploadSession = function ($button, session) {
    var defer = $.Deferred();

    if (!session) {
        defer.resolve();
        return defer.promise();
    }

    if (session.isSynced()) {
        defer.resolve();
        return defer.promise();
    }

    var start = new Date().getTime();
    var $row = $('<li/>').insertAfter($button.closest('li'));
    $('<li/>').insertAfter($row);
    var $progress = $('<div class="progress-line"/>').appendTo($row);


    Sync.uploadSession(session)
        .then(function () {
            finish(start, $button, true, defer);
        })
        .fail(function (err) {
            finish(start, $button, false, defer);

            Utils.notify(Api.User.getProfile().name, err.message);
        });


    function finish(start, $button, success, defer) {
        var diff;
        if ((diff = (new Date().getTime()) - start) < 2000) {
            setTimeout(function () {
                $progress.remove();
                if (success === true)
                    $button.closest('li').find('[data-selector="synced"]').html('yes');
                defer.resolve();
            }, 2000 - diff);
        } else {
            $progress.remove();
            if (success === true)
                $button.closest('li').find('[data-selector="synced"]').html('yes');
            defer.resolve();
        }
    }
    return defer.promise();
};

SessionsView.prototype.uploadUnsyncedSessions = function ($page) {

    var self = this
        , sessionKeys = Object.keys(sessionsDict);

    if (sessionKeys.length === 0)
        return;

    (function loop(keys) {
        var id = keys.shift()
            , session = sessionsDict[parseInt(id)];

        self.uploadSession($page.find('.session-row-upload-btn[session-id="' + session.getId() + '"]'), session)
            .then(function () {
                if (keys.length > 0)
                    loop(keys);
            });

    })(sessionKeys);
};

function animateDeleteAction($button, sessionId, callback) {
    var self = this;

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
            $progress.remove();
            callback.apply(self, [$parent]);
        }
    });
}

exports.SessionsView = SessionsView;
