'use strict';

import Context from '../context';
import Sync from '../server/sync';
import Api from '../server/api';
import Utils from '../utils/utils';
import template from './session.summary.art.html';
import generalStatsTemplate from './session.summary.general.art.html';
import intervalsTemplate from './session.summary.intervals.art.html';
import zonesTemplate from './session.summary.zones.art.html';
import cyclingTemplate from './session.summary.cycling.art.html';
import {MockSessionGenerator} from "../global";
import ScheduledSession from "../model/scheduled-session";
import Session from "../model/session";
import AppSettings from "../utils/app-settings";
import {UtterCyclingUtils} from "../utils/utter-cycling-utils";
import SessionSummaryIntervals from './session.summary.intervals';
import SessionSummaryZones from './session.summary.zones';
import UtterCycling from './session.summary.cycling';


/**
 * @typedef {Object}                SummaryInterval
 * @property {number}               number
 * @property {number}               count
 * @property {number}               startAt
 * @property {number}               finishedAt
 * @property {number}               distanceStart
 * @property {number}               distanceEnd
 * @property {number}               spmTotal
 * @property {number}               hrTotal
 * @property {boolean}              recovery
 * @property {boolean}              isDistanceBased
 * @property {Array<SessionDetail>} records
 */

class SessionSummaryView {

    /**
     *
     * @param page
     * @param {Context} context
     * @param sessionSummaryArguments
     */
    constructor(page, context, sessionSummaryArguments) {
        const self = this;

        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));

        /** @type Session */
        let session = sessionSummaryArguments.session;

        let isPastSession = sessionSummaryArguments.isPastSession,
            $page = $(page),
            $finish = $page.find('#summary-finish'),
            $back = $page.find('#summary-back')
        ;

        let sample = this.showSampleSessionSummary(session, isPastSession === true, context)
        if (sample) session = sample

        // calculate stats
        let duration = moment.duration(session.sessionEnd - session.sessionStart - (session.pausedDuration || 0));
        let durationFormatted = Utils.lpad(duration.hours(), 2)
            + ':' + Utils.lpad(duration.minutes(), 2) + ":" + Utils.lpad(duration.seconds(), 2);

        let distance = context.displayMetric('distance', session.distance);
        let avgSpeed = context.displayMetric('speed', session.avgSpeed);
        let avgSPM = context.displayMetric('spm', session.avgSpm);
        let avgEfficiency = context.displayMetric('efficiency', session.avgEfficiency);
        let heartRate = context.displayMetric('heartRate', session.avgHeartRate);

        // if session summary is loading a past session, change Finish button to Back and change Congrats to Details
        if (isPastSession === true) {
            $finish.hide();
            $back.show();
        } else {
            let now = Date.now();
            Api.TrainingSessions.live.finished(now);
            Api.TrainingSessions.live.update({
                spm: avgSPM,
                timestamp: now,
                distance: distance,
                speed: avgSpeed,
                efficiency: avgEfficiency,
                duration: duration.asMilliseconds()
            }, 'finished');

            Sync.uploadSessions();
        }

        $page.find('#summary-details-session').html(moment(session.sessionStart).format('MMMM Do YYYY, HH:mm') + 'h');

        $finish.on('tap', function () {
            App.load('home', undefined, undefined, function () {
                App.removeFromStack();
            });
        });

        if (session.expression === null) {
            $page.find('.summary-layout-intervals').remove();
        }

        $page.on('appShow', function () {

            session.detail().then(function (records) {
                const elevation = UtterCyclingUtils.calculateElevationGain(records);
                Context.render(document.getElementsByClassName('summary-layout-general')[0], generalStatsTemplate({
                    duration: durationFormatted,
                    distance: distance,
                    speed: avgSpeed,
                    cadence: avgSPM,
                    efficiency: avgEfficiency,
                    heartRate: heartRate,
                    elevation: context.displayMetric(Context.FIELD_TYPES().ELEVATION, elevation)
                }));

                self.loadSections(session, records, context);

                self.stopProgressBar()
            });
        });
    }

    stopProgressBar() {
        $('.progress-line').hide();
    }

    /**
     *
     * @param {Session} session
     * @param {boolean} isPastSession
     * @param {Context} context
     */
    showSampleSessionSummary(session, isPastSession, context) {
        let isThisAppSampleSessionCapable = false;
        AppSettings.switch(() => {
            isThisAppSampleSessionCapable = true;
        }, () => {
            isThisAppSampleSessionCapable = false;
        });

        if (isThisAppSampleSessionCapable === false || session.id > 1 || isPastSession === true) return;

        const modal = context.ui.modal.undecorated([
            '<div class="sessions-summary-sample-model">',
            ' <div style="padding: 10px">',
            '   <div class="sessions-summary-sample-model-primary">' + context.translate('sessions_summary_modal_sample_session_primary') + '</div>',
            '   <div class="sessions-summary-sample-model-secondary">' + context.translate('sessions_summary_modal_sample_session_secondary') + '</div>',
            ' </div>',
            '</div>',
        ].join(''));

        const sessionDefinition = ScheduledSession.load(false)[0];
        const generator = new MockSessionGenerator(sessionDefinition, Date.now());
        const json = generator.generate();

        session = new Session(json.session_start, json.anglez, json.noisex, json.noisez, json.factorx, json.factorz, json.axis
            , json.distance, json.avg_spm, json.top_spm, json.avg_speed, json.top_speed
            , json.avg_efficiency, json.top_efficiency, json.session_end, json.data, 0);

        session.avgHeartRate = json.avg_heart_rate;
        session.expression = sessionDefinition.expression;
        session.expressionJson = sessionDefinition.splits;

        localStorage.setItem('first_experiment_done', JSON.stringify(true));

        setTimeout(() => {
            // hide "show demo stats" modal
            modal.hide();
        }, 5000);
        return session
    }

    /**
     *
     * @param {Session} session
     * @param {Array<SessionDetail>} records
     * @param {Context} context
     */
    loadSections(session, records, context) {

        let output = this.calculateIntervals(session, records);
        let zones = new SessionSummaryZones(session, output.working, context);
        zones.render(context, zonesTemplate, $('.summary-layout-zones'));

        if (session.version < 2) return this.stopProgressBar();

        AppSettings.switch(() => {
        }, () => {
            let cycling = new UtterCycling(session, records, context);
            cycling.render(cyclingTemplate, document.getElementsByClassName('summary-layout-cycling')[0])
        });

        if (!session.expression) return this.stopProgressBar();

        let intervals = new SessionSummaryIntervals(session, output.intervals);
        intervals.render(context, intervalsTemplate, $('.summary-layout-intervals'));
    }

    /**
     *
     * @param {Session} session
     * @param {Array<SessionDetail>} details  Session data records
     * @return {{intervals: Array<SummaryInterval>, working: Array<SessionDetail>}}
     */
    calculateIntervals(session, details) {

        if (session.version < 2) {
            return {
                intervals: [],
                working: details
            }
        }

        if (!session.expression) {
            return {
                intervals: [],
                working: details
            }
        }

        let interval = null, previous = null, intervals = [], definition, workingDetails = [], record;
        definition = session.expressionJson;
        for (let i = 0, l = details.length; i < l; i++) {
            record = details[i];
            if (record.split === -1) {
                if (previous) {
                    previous.finishedAt = record.getTimestamp();
                    previous.distanceEnd = record.getDistance();
                    previous = null;
                }
                continue;
            }

            interval = intervals[record.split];
            if (interval === undefined) {
                if (previous) {
                    previous.finishedAt = record.getTimestamp();
                    previous.distanceEnd = record.getDistance();
                }
                intervals[record.split] = {
                    number: record.split,
                    count: 0,
                    startedAt: record.getTimestamp(),
                    finishedAt: null,
                    distanceStart: record.getDistance(),
                    distanceEnd: null,
                    spmTotal: 0,
                    hrTotal: 0,
                    recovery: definition[record.split]._recovery === true,
                    isDistanceBased: definition[record.split]._unit.toLowerCase() === 'meters'
                        || definition[record.split]._unit.toLowerCase() === 'kilometers',
                    records: []

                }
            }

            if (intervals[record.split].recovery === false) {
                intervals[record.split].spmTotal += record.getSpm();
                intervals[record.split].hrTotal += record.getHeartRate();
                intervals[record.split].records.push(record);
                intervals[record.split].count++;
                workingDetails.push(record);
            }

            previous = interval;
        }

        if (intervals[intervals.length - 1] !== undefined && intervals[intervals.length - 1].finishedAt === null) {
            intervals[intervals.length - 1].finishedAt = record.getTimestamp();
            intervals[intervals.length - 1].distanceEnd = record.getDistance();
        }

        return {
            intervals: intervals,
            working: workingDetails
        }
    }
}

export default SessionSummaryView;
