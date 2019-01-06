'use strict';

var Sync = require('../server/sync');
var Session = require('../model/session').Session;
var Utils = require('../utils/utils.js');
var Api = require('../server/api');
var template = require('./sessions.art.html');
var List = require('../utils/widgets/list').List;

var LAST_30_DAYS_PERIOD_FILTER = 'last-30-days',
    LAST_MONTH_PERIOD_FILTER = 'last-month',
    START_FROM_PERIOD_FILTER = 'start-from',
    CUSTOM_PERIOD_FILTER = 'custom',

    sessionsDict = {},

    utils = require('../utils/utils.js'),

    appContext,
    $page,
    $summaryDistance,
    $summarySpeed,
    $summarySPM,
    $summaryLength,
    $summaryTime,

    $calendar,
    $chart,
    selectedFilter,
    filterStartDate,
    filterEndDate,
    sessionsListWidget;

/**
 * Add given session to the list of sessions
 *
 * @param {array} sessions
 */
function addSessionsToSessionList(sessions) {
    var totalDistance = 0.0,
        totalDuration = 0,
        totalSPM = 0.0,
        totalLength = 0.0;


    if (sessions.length === 0) {
        sessionsListWidget.clear();
        sessionsListWidget
            .appendRow($('<li class="session-row-empty">You have no sessions for the selected period.</li>'));

        sessionsListWidget.refresh();

        $summaryDistance.text("0");
        $summarySpeed.text("0");
        $summarySPM.text("0");
        $summaryLength.text("0");

        return;
    }

    sessionsDict = {};

    sessionsListWidget.clear();
    // add each session to the session list
    sessions.forEach(function (session) {

        var $li = $('<li class="session-row" data-id="' + session.id + '"></li>'),
            $main = $('<div class="session-row-data-wrapper"></div>'),
            sessionAt = moment(new Date(session.getSessionStart())),
            duration = moment.duration(session.getSessionEnd() - session.getSessionStart()),
            dDisplay = utils.lpad(duration.hours(), 2) + ':' + utils.lpad(duration.minutes(), 2),
            distance = session.getDistance();

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
                '		{duration}',
                '	</div>',
                '	<div>',
                '		<b>{distance}</b>',
                '	</div>',
                '	<div>',
                '		<span data-selector="synced">{synced}</span>',
                '	</div>',
                '</div>'
            ].join('')
                .replace('{hour}', sessionAt.format('HH:mm'))
                .replace('{day}', sessionAt.format('MMM D'))
                .replace('{duration}', dDisplay)
                .replace('{distance}', utils.round2(distance || 0) + ' ' + appContext.getUnit('distance_in_session_list'))
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
        var x = session.getSessionEnd() - session.getSessionStart();
        console.log(x / 3600000, distance, distance / (x / 3600000));
        totalDistance += distance;
        totalDuration += x;
        totalSPM += (x * session.getAvgSpm());
        totalLength += (x * session.getAvgEfficiency());


        sessionsListWidget.appendRow($li, false);
        sessionsListWidget.appendRow($('<li style="display: none;"><div class="progress-line" style="width:1%;"></div></li>'), true);
        sessionsListWidget.appendRow($('<li style="width:1%;height:0;"></li>'), true);
    });

    // update summary

    $summaryDistance.text(utils.round2(totalDistance));
    $summarySpeed.text(utils.round2(totalDistance / (totalDuration / 3600000)));
    $summarySPM.text(Math.round(totalSPM / totalDuration));
    $summaryLength.text(utils.round2(totalLength / totalDuration));

    setTimeout(function () {
        sessionsListWidget.refresh();
    }, 0);

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
    context.render(page, template({isPortraitMode: context.isPortraitMode()
        , isLandscapeMode: !context.isPortraitMode()}));

    var self = this,
        $back = $('.back-button', page);
    appContext = context;
    $page = $(page);

    // initialize calendar as undefined so date are retrieved from preferences and not it
    $calendar = undefined;

    $chart = $('.sessions-summary-chart');

    $summaryDistance = $page.find('#total-distance');
    $summarySpeed = $page.find('#summary-speed');
    $summarySPM = $page.find('#summary-spm');
    $summaryLength = $page.find('#summary-length');
    $summaryTime = $page.find('#total-duration');

    // set unit labes according to user preference
    $page.find('#sessions-summary-distance-unit').html(context.getUnit('distance_in_session_list'));
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

    // load sessions according to user preferences
    setSessionPeriod(context.preferences().getDefaultSessionFilter());

    if (context.preferences().getDefaultStartDate() !== null && context.preferences().getDefaultStartDate() !== undefined) {
        filterStartDate = moment(context.preferences().getDefaultStartDate());
    }

    if (context.preferences().getDefaultEndDate() !== null && context.preferences().getDefaultStartDate() !== undefined) {
        filterEndDate = moment(context.preferences().getDefaultEndDate());
    }

    page.onShown.then(function () {
        var $container = $('#sessions-wrapper-for-pull-to-refresh');
        if (!context.isPortraitMode()) {
            var height = $(document.body).height() - $page.find('.paddler-topbar').height();
            $container.height(height);
        }

        // initialize and bind events to session filter
        setupSessionFilter($page, context);

        sessionsListWidget = new List(page, {
            $elem: $container,
            swipe: true,
            swipeSelector: '.session-row-actions',
            ptr: {
                label: 'Pull down to sync',
                release: 'Release to sync',
                refreshing: 'Syncing sessions',
                onRefresh: function () {
                    self.uploadUnsyncedSessions($page);
                }
            }
        });

        filterSessionsByPeriod(context);

        $page.on('touchstart', '.session-row-delete-btn', function (e) {
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

        $page.on('touchstart', '.session-row-upload-btn', function (e) {
            var $el = $(event.target);
            var sessionId = parseInt($el.attr('session-id'))
                , session = sessionsDict[sessionId];

            self.uploadSession($el, session);

            e.preventDefault();
            e.stopImmediatePropagation();
        });
    });
}


SessionsView.prototype.confirmDelete = function ($button, sessionId) {
    var self = this;

    self.lock[sessionId] = true;

    // change button to cancel
    $button.addClass('cancel');
    $button.text('cancel');

    animateDeleteAction.apply(self, [$button, sessionId, function ($row, $progress, $spacer) {
        Session.delete(parseInt(sessionId))
            .then(function () {

                if (self.lock[sessionId] !== true || new Date().getTime() - self.progress[sessionId].start < 5000) {
                    return;
                }

                $row.remove();
                $progress.remove();
                $spacer.remove();
                sessionsListWidget.refresh();

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
    self.progress[sessionId].$li.hide();
    self.progress[sessionId].$dom.stop();
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
    var progress = appContext.ui.infiniteProgressBarForLi($button.closest('li'));

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
                progress.cleanup();
                if (success === true) {
                    $button.closest('li').find('[data-selector="synced"]').html('yes');
                }
                defer.resolve();
            }, 2000 - diff);
        } else {
            progress.cleanup();
            if (success === true) {
                $button.closest('li').find('[data-selector="synced"]').html('yes');
            }
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
    var $li = $parent.next();
    var $progress = $li.find('div');
    var id = Utils.guid();

    self.progress[sessionId] = {$dom: $progress, $li: $li, start: new Date().getTime(), id: id};

    $li.show();
    $progress.css("width", "1%");

    $({
        property: 0
    }).animate({
        property: 100
    }, {
        duration: 5000,
        step: function () {
            var _percent = Math.round(this.property);
            $progress.css("width", _percent + "%");
        },
        complete: function () {
            if (self.lock[sessionId] !== true || self.progress[sessionId].id !== id) return;
            $li.hide();
            callback.apply(self, [/* row = */ $parent, /* progress = */ $li, /*spacer = */ $li.next()]);
        }
    });
}

exports.SessionsView = SessionsView;
