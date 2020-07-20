'use strict';

import Context from '../context';
import Sync from '../server/sync';
import Session from '../model/session';
import Api from '../server/api';
import Utils from '../utils/utils';
import template from './sessions.art.html';
import List from '../utils/widgets/list';

let LAST_30_DAYS_PERIOD_FILTER = 'last-30-days',
    LAST_MONTH_PERIOD_FILTER = 'last-month',
    START_FROM_PERIOD_FILTER = 'start-from',
    CUSTOM_PERIOD_FILTER = 'custom',

    sessionsDict = {},

    appContext,
    $page,
    $summaryDistance,
    $summarySpeed,
    $summarySPM,
    $summaryLength,
    $summaryElevation,
    $summaryTime,

    $calendar,
    $chart,
    selectedFilter,
    filterStartDate,
    filterEndDate,
    /**@type List */
    sessionsListWidget;

/**
 * Add given session to the list of sessions
 *
 * @param {array} sessions
 * @param {Context} context
 */
function addSessionsToSessionList(sessions, context) {

    if (sessions.length === 0) {
        sessionsListWidget.clear();
        sessionsListWidget
            .appendRow($('<li class="session-row-empty">' + context.translate('sessions_no_session_found') + '</li>'));

        sessionsListWidget.refresh();

        $summaryDistance.text("0");
        $summarySpeed.text("0");
        $summarySPM.text("0");
        $summaryLength.text("0");
        $summaryElevation.text("0");

        return;
    }

    sessionsDict = {};

    sessionsListWidget.clear();
    // add each session to the session list
    sessions.forEach(function (/**@type Session */ session) {

        var $li = $('<li class="session-row" data-id="' + session.id + '"></li>'),
            $main = $('<div class="session-row-data-wrapper"></div>'),
            sessionAt = moment(new Date(session.sessionStart)),
            duration = moment.duration(session.sessionEnd - session.sessionStart),
            dDisplay = Utils.lpad(duration.hours(), 2) + ':' + Utils.lpad(duration.minutes(), 2),
            distance = session.distance;

        if (appContext.preferences().isImperial()) {
            distance = Utils.kmToMiles(distance);
        }

        sessionsDict[session.id] = session;

        // add controls
        $('<div class="session-row-wrapper"></div>').append($main)
            .append($([
                    '<div class="session-row-actions">',
                    '	<div style="display:table;width:100%;height:100%">',
                    '		<div class="session-row-upload-btn" session-id="{session-id}">{sync}</div>',
                    '		<div class="session-row-delete-btn" session-id="{session-id}">{delete}</div>',
                    '	</div>',
                    '</div>'
                ].join('')
                .replace(new RegExp('{session-id}', 'g'), session.id)
                .replace('{sync}', context.translate('sessions_force_sync'))
                .replace('{delete}', context.translate('sessions_delete'))
            )).appendTo($li);

        // add row data
        $([
                '<div class="session-row-data">',
                '	<div>',
                '		<label class="session-row-label">{day}</label> <div>{date}</div>',
                '		<label class="session-row-label">{intervaled}</label>',
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
                .replace('{day}', sessionAt.format('ddd'))
                .replace('{date}', sessionAt.format('MMM D'))
                .replace('{intervaled}'
                    , Api.User.hasCoach() && session.expression === null ? context.translate('sessions_free') : '&nbsp;')
                .replace('{duration}', dDisplay)
                .replace('{distance}', Utils.round2(distance || 0) + ' ' + appContext.getUnit('distance_in_session_list'))
                .replace('{synced}', session.synced ? context.translate('sessions_synced') : context.translate('sessions_not_synced'))
        ).appendTo($main);

        // on a session tap, open session-summary with its details
        $main.on('tap', function () {
            App.load('session-summary', {
                session: session,
                isPastSession: true
            });
        });

        sessionsListWidget.newRow($li, false);
    });

    setTimeout(function () {
        sessionsListWidget.refresh();
    }, 0);

}

function updateGlobalStats(sessions, context) {
    var totalDistance = 0.0,
        totalDuration = 0,
        totalSPM = 0.0,
        totalLength = 0.0,
        totalElevation = 0
    ;

    sessions.forEach(/** @param {Session} session */function (session) {
        let duration = moment.duration(session.sessionEnd - session.sessionStart);
        totalDistance += session.distance;
        totalDuration += duration;
        totalElevation += session.elevation;
        totalSPM += (duration * session.avgSpm);
        totalLength += (duration * session.avgEfficiency);
    });

    $summaryDistance.text(context.displayMetric('distance', totalDistance));
    $summarySpeed.text(Utils.round2(totalDistance / (totalDuration / 3600000)));
    $summarySPM.text(totalDuration ? Math.round(totalSPM / totalDuration) : 0);
    $summaryLength.text(Utils.round2(totalLength / totalDuration));
    $summaryElevation.text(context.displayMetric('elevation', totalElevation));
}

/**
 * Filter list of sessions by the selected filter
 *
 * @param {Context} context
 * @param {boolean} onlyUpdateGlobals
 */
function filterSessionsByPeriod(context, onlyUpdateGlobals) {
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
            $sessionPeriodFilterButton.html(context.translate('sessions_filter_last_month'));
            context.preferences().setDefaultSessionFilter(LAST_MONTH_PERIOD_FILTER);
            context.preferences().setDefaultStartDate(null);
            context.preferences().setDefaultEndDate(null);
            break;
        case START_FROM_PERIOD_FILTER:
            $sessionPeriodFilterButton.html(context.translate('sessions_filter_from') + ' ' + filterStartDate.format('YYYY-MM-DD'));
            context.preferences().setDefaultSessionFilter(START_FROM_PERIOD_FILTER);
            context.preferences().setDefaultStartDate(filterStartDate.valueOf());
            context.preferences().setDefaultEndDate(filterEndDate.valueOf());
            break;
        case CUSTOM_PERIOD_FILTER:
            $sessionPeriodFilterButton.html(filterStartDate.format('YYYY-MM-DD') + ' '+ context.translate('sessions_filter_to') +' ' + filterEndDate.format('YYYY-MM-DD'));
            context.preferences().setDefaultSessionFilter(CUSTOM_PERIOD_FILTER);
            context.preferences().setDefaultStartDate(filterStartDate.valueOf());
            context.preferences().setDefaultEndDate(filterEndDate.valueOf());
            break;
        case LAST_30_DAYS_PERIOD_FILTER:
        default:
            $sessionPeriodFilterButton.html(context.translate('sessions_filter_last_30_days'));
            context.preferences().setDefaultSessionFilter(LAST_30_DAYS_PERIOD_FILTER);
            context.preferences().setDefaultStartDate(null);
            context.preferences().setDefaultEndDate(null);
    }

    // adjust sessions according to chosen period
    if (selectedFilter === START_FROM_PERIOD_FILTER) {
        Session.getFromDate(filterStartDate.valueOf(), function (sessions) {
            if (onlyUpdateGlobals !== true) addSessionsToSessionList(sessions, context);
            updateGlobalStats(sessions, context);
        });
    } else {
        Session.getForDates(filterStartDate.valueOf(), filterEndDate.valueOf(), function (sessions) {
            if (onlyUpdateGlobals !== true) addSessionsToSessionList(sessions, context);
            updateGlobalStats(sessions, context);
        });
    }
}

/**
 * Change sessions period according to selected filter
 *
 * @param {string|null}  filter
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
        language: context.getLanguage()
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
        filterSessionsByPeriod(context, false);
        $sessionPeriodFilter.toggle();
    });
}


class SessionsView {

    /**
     *
     * @param page
     * @param {Context} context
     */
    constructor(page, context) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()
            , isLandscapeMode: !context.isPortraitMode()}));

        const self = this;
        let $back = $('.back-button', page);
        appContext = context;
        $page = $(page);

        // initialize calendar as undefined so date are retrieved from preferences and not it
        $calendar = undefined;

        $chart = $('.sessions-summary-chart');

        $summaryDistance = $page.find('#total-distance');
        $summarySpeed = $page.find('#summary-speed');
        $summarySPM = $page.find('#summary-spm');
        $summaryLength = $page.find('#summary-length');
        $summaryElevation = $page.find('#summary-elevation');
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
        setSessionPeriod(context.preferences().getDefaultSessionFilter(), true);

        if (context.preferences().getDefaultStartDate() !== null && context.preferences().getDefaultStartDate() !== undefined) {
            filterStartDate = moment(context.preferences().getDefaultStartDate());
        }

        if (context.preferences().getDefaultEndDate() !== null && context.preferences().getDefaultStartDate() !== undefined) {
            filterEndDate = moment(context.preferences().getDefaultEndDate());
        }

        page.onReady.then(function () {
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
                progressLineCustomClass: 'session-row-progress-container',
                keepDomOnDelete: true,
                ptr: {
                    label: context.translate('sessions_pull_to_sync'),
                    release: context.translate('sessions_release_to_sync'),
                    refreshing: context.translate('sessions_syncing'),
                    onRefresh: function () {
                        self.uploadUnsyncedSessions($page);
                    }
                }
            }, context);

            filterSessionsByPeriod(context, false);

            $page.on('touchstart', '.session-row-delete-btn', function (e) {
                let $el = $(event.target);
                if ($el.closest('.session-row.deleted').length > 0) return;
                let sessionId = $el.attr('session-id');
                sessionsListWidget.delete($el, sessionId, function () {
                    return Session.delete(parseInt(sessionId))
                        .then(function () {
//                            sessionsListWidget.refresh();
                            filterSessionsByPeriod(appContext, true);
                        });
                });
                e.preventDefault();
                e.stopImmediatePropagation();
            });

            $page.on('touchstart', '.session-row-upload-btn', function (e) {
                const $el = $(event.target);
                if ($el.closest('.session-row.deleted').length > 0) return;
                let sessionId = parseInt($el.attr('session-id'))
                    , session = sessionsDict[sessionId];

                self.uploadSession($el, session);

                e.preventDefault();
                e.stopImmediatePropagation();
            });
        });

        $page.on('appForward', function () {
            sessionsListWidget.disable();
        });

        $page.on('appShow', function () {
            if (sessionsListWidget)
                sessionsListWidget.enable();
        });

        $page.on('appDestroy', function () {
            sessionsListWidget.destroy();
            sessionsListWidget = null;
        });
    }

    /**
     *
     * @param $button
     * @param {Session} session
     * @return {*}
     */
    uploadSession($button, session) {
        const defer = $.Deferred();

        if (!session) {
            defer.resolve();
            return defer.promise();
        }

        if (session.synced && !Api.User.isAppTester()) {
            defer.resolve();
            return defer.promise();
        }

        let start = Date.now();
        let progress = appContext.ui.infiniteProgressBarForLi($button.closest('li'));

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
                        $button.closest('li').find('[data-selector="synced"]').html(appContext.translate('sessions_synced'));
                    }
                    defer.resolve();
                }, 2000 - diff);
            } else {
                progress.cleanup();
                if (success === true) {
                    $button.closest('li').find('[data-selector="synced"]').html(appContext.translate('sessions_synced'));
                }
                defer.resolve();
            }
        }

        return defer.promise();
    }

    uploadUnsyncedSessions($page) {

        var self = this
            , sessionKeys = Object.keys(sessionsDict);

        if (sessionKeys.length === 0)
            return;

        (function loop(keys) {
            let id = keys.shift()
                , session = sessionsDict[parseInt(id)];

            self.uploadSession($page.find('.session-row-upload-btn[session-id="' + session.id + '"]'), session)
                .then(function () {
                    if (keys.length > 0)
                        loop(keys);
                });

        })(sessionKeys);
    }

}

export default SessionsView;
