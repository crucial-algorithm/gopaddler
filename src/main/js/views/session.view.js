'use strict';

import Context from '../context';
import Timer from '../measures/timer';
import Field from '../measures/field';
import Calibration from '../model/calibration';
import Session from '../model/session';
import DistanceProgressBar from '../utils/widgets/distance-progress-bar';
import Dialog from '../utils/widgets/dialog';
import template from './session.view.art.html';
import snippetPauseControls from './session.view.pause.controls.art.html';
import snippetFinishWarmUpControls from './session.view.warmup.controls.art.html';
import Unlock from '../utils/widgets/unlock';
import Sound from '../utils/sound';
import Api from '../server/api';
import Splits from '../core/splits-handler';
import SessionViewCollectMetrics from './session.view.collect';
import {SessionViewSplits} from "./session.view.splits";
import AppSettings from "../utils/AppSettings";
import Utils from "../utils/utils";


const DEFAULT_POSITIONS = {
    top: 'timer',
    middle: 'speed',
    bottom: 'distance',
    large: 'spm'
}, SMALL = 'small', LARGE = 'large';

let sound = null;

/**
 * @typedef {Object} FieldValues
 * @property {number} distance
 * @property {number} lastSplitStartDistance
 * @property {number} efficiency
 * @property {number} strokes
 * @property {number|string} pace
 * @property {number} spm
 * @property {number} heartRate
 * @property {number} speed
 * @property {number} averageSpeed
 * @property {number|string} [splits]
 */


class SessionView {

    /**
     *
     * @param page
     * @param context
     * @param options Object {expression: String
     *             , splits: Array
     *             , isWarmUpFirst: boolean
     *             , startedAt: Integer
     *             , remoteScheduledSessionId: String}
     */
    constructor(page, context, options) {
        const self = this;
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));
        /**@type Context */
        self.appContext = context;
        if (sound === null) sound = new Sound();

        /**@type SessionViewCollectMetrics */
        this._metrics = null;
        /**@type SessionViewSplits */
        this._splitsHelper = null;

        page.onReady.then(function () {
            self.render.apply(self, [page, context, options])
        });
    }

    render(page, context, options) {

        const self = this;
        const isImperial =  context.preferences().isImperial();
        // disable communication with the server during session
        document.PREVENT_SYNC = true;

        this.isConfirmDialogOpen = false;
        this.tx = false; // TODO: document variable
        /**@type Splits | null */
        this.splits = null;
        /**@type boolean */
        this.paused = false;
        /**@type boolean */
        this.splitsAreFinished = false;
        /**@type number */
        this.showLastSplitSummaryCountDown = 0;
        this.$page = $(page);

        // handle options
        options = options || {};
        this.isWarmUpFirst = options.isWarmUpFirst === true;
        this.hasSplitsDefined = Array.isArray(options.splits) && options.splits.length > 0;
        this.inWarmUp = self.hasSplitsDefined && self.isWarmUpFirst;
        this.splitsDefinition = options.splits;
        this.expression = options.expression;

        let calibration = Calibration.load(context.isPortraitMode()) || Calibration.blank();
        this.timer = new Timer(options.startedAt);
        this.distanceProgressHandler = new DistanceProgressBar(this.$page);
        this.metrics = new SessionViewCollectMetrics(context, self.timer);

        // check if it should be black and white or default colors
        this.applyColorScheme();

        // init layout
        this.startSessionLayout(context, page);

        // block scroll and handle lock/unlock
        this.catchUserEvents(this.$page, context);

        // -- initiate timer
        let startAt = self.timer.start((value, timestamp, duration) => {
            if (self.paused) return;

            self.top.setValue("timer", value);
            self.middle.setValue("timer", value);
            self.bottom.setValue("timer", value);
            self.large.setValue("timer", value);

            this.metrics.cycle(timestamp, duration);

            if (context.getGpsRefreshRate() === 1 && self.showLastSplitSummaryCountDown <= 0) {
                const speed = this.metrics.location.speed;
                self.top.setValue("speed", speed);
                self.middle.setValue("speed", speed);
                self.bottom.setValue("speed", speed);
                self.large.setValue("speed", speed);
            }
        });

        // capture events from this.metrics and adjust UI accordingly
        this.registerHandlersForMetricsEvents();

        this.metrics.start(startAt, self.splitsDefinition, options.wasStartedRemotely === true
            , self.expression, options.remoteScheduledSessionId, calibration
            , self.hasSplitsDefined && !self.isWarmUpFirst);

        // -- listen to server side commands
        this.isRemoteCommand = false;
        Api.TrainingSessions.live.on(Api.LiveEvents.FINISH, function (commandId) {
            Api.TrainingSessions.live.commandSynced(commandId);
            self.isRemoteCommand = true;
            self.clear();
        }, false);

        // -- refresh screen
        self.uiIntervalId = setInterval(function refreshUI() {
            if (self.paused) return;

            let stats = self.metrics.status();

            let distance = Math.round((stats.distance * 1000 - stats.lastSplitStartDistance));
            stats.distance = distance - distance % AppSettings.distanceStep();

            if (self.showLastSplitSummaryCountDown > 0) {
                self.showLastSplitSummaryCountDown--;

                // calculate split
                stats = self.metrics.calculateLastSplitStats(isImperial);
                stats.distance = Math.round(stats.distance * 100) / 100;
                stats.strokes = Math.round(stats.strokes);

                // set summary after interval finished in splits field
                if (self.metrics.isLastFinishedSplitDistanceBased()) {
                    stats.splits = self.timer.formatWithMilis(self.metrics.lastSplitDuration());
                }

            } else if (self.splitsAreFinished === true) {
                stats.splits = '-';
            }

            self.top.setValues(stats);
            self.middle.setValues(stats);
            self.bottom.setValues(stats);
            self.large.setValues(stats);

        }, 2005);

        self.syncClockInterval = setInterval(function () {
            Api.TrainingSessions.live.syncClock(Api.User.getId());
        }, 300000);

        self.tester = {
            isTestingLeftRight: false
        };

        // debug left/right
        self.$left = $('.session-left');
        self.$right = $('.session-right');
    }

    /**
     * Apply color to session according to user preferences
     */
    applyColorScheme() {
        if (this.appContext.preferences().isShowBlackAndWhite()) {
            this.setBlackAndWhite();
        } else {
            this.$page.find(".app-content").removeClass('black-and-white');
        }
    }

    startSessionLayout(context, page) {
        let fields;
        if (context.preferences().isRestoreLayout()) {
            fields = loadLayout();
        } else {
            fields = DEFAULT_POSITIONS;
        }

        if (this.hasSplitsDefined === true) {
            fields.top = 'splits';
        }

        this.top = new Field($('.session-small-measure.yellow', page), fields.top, SMALL, context, this.hasSplitsDefined);
        this.middle = new Field($('.session-small-measure.blue', page), fields.middle, SMALL, context, this.hasSplitsDefined);
        this.bottom = new Field($('.session-small-measure.red', page), fields.bottom, SMALL, context, this.hasSplitsDefined);
        this.large = new Field($('.session-large-measure', page), fields.large, LARGE, context, this.hasSplitsDefined);
    }

    /**
     * block unwanted events and register wanted ones
     * @param $page
     * @param context
     */
    catchUserEvents($page, context) {
        let $window = $(window);
        $window.on('scroll.session', function (event) {
            $window.scrollTop(0);
            event.preventDefault();
        });

        $page.on('appBeforeBack', function (e) {
            if (self.confirmBeforeExit() === true) {
                $window.off('scroll.session');
                $window.off('touchmove.session');
                return true;
            } else {
                return false;
            }
        });

        let unlock = new Unlock(context);
        unlock.onUnlocked(() => {
            this.confirmBeforeExit();
        });
        $page.on('tap', () => {
            unlock.show();
        });

        if (this.isShowTouchGestures()) {
            setTimeout(() => {
                this.top.animateSwipeLeft();
            }, 1000);
            unlock.show(10000);
        }
    }

    registerHandlersForMetricsEvents() {
        this.metrics.on('leftRightChanged', this.leftToRightDebug.bind(this));
        this.metrics.on('startCountDown', () => {
            sound.playStartCountDown()
        });
        this.metrics.on('finishCountDown', () => {
            sound.playFinishCountDown()
        });
        this.metrics.on('finishedNotification', () => {
            sound.playFinish();
            navigator.vibrate(1000)
        });
        this.metrics.on('finishedSplit', () => {
            this.showLastSplitSummaryCountDown = 5;
            this.distanceProgressHandler.finish();
        });
        this.metrics.on('splitStateUpdated', this.updateSplitsFieldHandler.bind(this));
        this.metrics.on('finished', () => {
            // splits finished
            this.showLastSplitSummaryCountDown = 5;
            this.distanceProgressHandler.finish();
            this.splitsAreFinished = true;
        });
        this.metrics.on('startedDistanceBased', (duration) => {
            this.distanceProgressHandler.start(duration);
        });
        this.metrics.on('warmUpFinishedRemotely', () => {
            Dialog.hideModal();
            this.inWarmUp = false;
        });
        this.metrics.on('lostGpsSignal', () => {
            let values = {speed: 0, pace: 0, efficiency: 0, strokes: 0};
            this.top.setValues(values);
            this.middle.setValues(values);
            this.bottom.setValues(values);
            this.large.setValues(values);
        });
    }

    setBlackAndWhite() {
        this.$page.find(".session-small-measures").addClass('black-and-white');
        this.$page.find(".session-large-measure").addClass('black-and-white');

        if (!context.isPortraitMode()) {
            let width = this.$page.width();
            this.$page.find(".session-large-measure").css({width: Math.floor(width / 2) - 1});
        }

        this.$page.find(".big-measure-label").addClass('black-and-white');
        this.$page.find(".big-measure-units").addClass('black-and-white');
        this.$page.find("#animation-pause-circle").attr('fill', '#000');
        this.$page.find("#animation-pause-dash").attr('stroke', '#000');
    }

    leaveOrResumeConfirmDialog(onresume, onfinish) {
        const self = this;
        let $controls, $resume, $finish, $lock;

        let modal = self.appContext.ui.modal.undecorated(snippetPauseControls({
            isTestingLeftRight: Api.User.isAppTester() && self.tester.isTestingLeftRight
        }));

        $controls = modal.$modal.find('.session-controls');
        $resume = $controls.find('.session-resume');
        $finish = $controls.find('.session-finish');
        $lock = modal.$modal.find('.session-lock-in-pause');

        // add behavior
        $resume.on('touchend', function (e) {
            onresume.apply(self, []);
            e.preventDefault();
            e.stopImmediatePropagation();
        });

        $finish.on('touchend', function (e) {
            onfinish.apply(self, []);
            e.preventDefault();
            e.stopImmediatePropagation();
        });

        $lock.on('touchend', function (e) {
            let unlock = new Unlock(self.appContext);
            modal.$modal.addClass('session-screen-locked');
            unlock.onUnlocked(() => {
                modal.$modal.removeClass('session-screen-locked');
            });
            unlock.show(Infinity, modal.$modal);
            e.preventDefault();
            e.stopImmediatePropagation();
        });

        const $timer = modal.$modal.find('.session-controls-paused-timer-watch');
        let pausedAt = Date.now();
        setInterval(() => {
            $timer.text(Utils.displayDurationHasTime(Date.now() - pausedAt));
        }, 1000);

        this.toggleLeftRightDebug(modal.$modal.find('[data-selector="left-right-debug"]'));
    }

    confirmFinishWarmUp(onStartOnMinuteTurn, onStartImmediately, onfinish, onCancel) {
        const self = this;
        let $controls, $startOnMinuteTurn, $startImmediately, $finish, $cancel;

        let modal = self.appContext.ui.modal.undecorated(snippetFinishWarmUpControls({
            isTestingLeftRight: Api.User.isAppTester() && self.tester.isTestingLeftRight
        }));

        $controls = modal.$modal.find('.session-controls');

        $startOnMinuteTurn = $controls.find('.session-start-on-minute-turn');
        $startImmediately = $controls.find('.session-start-immediately');
        $finish = $controls.find('.session-finish');
        $cancel = $controls.find('.session-cancel');

        // add behavior
        $startOnMinuteTurn.on('touchend', function (e) {
            onStartOnMinuteTurn.apply(self, []);
            e.preventDefault();
            e.stopImmediatePropagation();
        });

        $startImmediately.on('touchend', function (e) {
            onStartImmediately.apply(self, []);
            e.preventDefault();
            e.stopImmediatePropagation();
        });

        $finish.on('touchend', function (e) {
            onfinish.apply(self, []);
            e.preventDefault();
            e.stopImmediatePropagation();
        });

        $cancel.on('touchend', function (e) {
            onCancel.apply(self, []);
            e.preventDefault();
            e.stopImmediatePropagation();
        });

        this.toggleLeftRightDebug(modal.$modal.find('[data-selector="left-right-debug"]'));
    }

    toggleLeftRightDebug($leftRight) {
        const self = this;
        $leftRight.off('click').on('click', function () {
            self.tester.isTestingLeftRight = !self.tester.isTestingLeftRight;
            $leftRight.toggleClass('session-controls-square-toggled');
            if (self.tester.isTestingLeftRight)
                $('.session-left-right-container').css('display', 'flex');
            else
                $('.session-left-right-container').css('display', 'none');
        });
    }

    leftToRightDebug(event) {
        const self = this;
        if (Api.User.isAppTester() === false) return;
        if (self.tester.isTestingLeftRight === false) return;

        if (event.left === true) self.$left.addClass('active');
        if (event.left === false) self.$left.removeClass('active');
        if (event.right === true) self.$right.addClass('active');
        if (event.right === false) self.$right.removeClass('active');
    }

    isShowTouchGestures() {
        let launches = localStorage.getItem("session_view_launches") || 0;
        launches++;
        localStorage.setItem("session_view_launches", launches);
        return launches <= 3
    }

    /**
     * Handler for when splits change
     *
     * @param {number} duration
     * @param {boolean} isRecovery
     * @param {boolean} isFinished
     * @param {boolean} isBasedInDistance
     * @param {number} splitStopsAt
     * @param {SplitInfo} stats
     * @param {boolean} wasDistanceBased
     */
    updateSplitsFieldHandler(duration, isRecovery, isFinished, isBasedInDistance, splitStopsAt, stats, wasDistanceBased) {
        if (this.paused) return;
        let unit = isRecovery === true ? 'Recovery' : '';

        if (wasDistanceBased === true && this.showLastSplitSummaryCountDown > 0) {
            return;
        }

        let value;
        if (isFinished === true) {
            return this.writeSplitsValue('-', '');
        } else if (isBasedInDistance === false) {
            value = this.timer.format(duration);
        } else {
            this.distanceProgressHandler.update(Math.ceil(duration / 10) * 10);
            value = this.timer.format(this.timer.getDuration() - stats.start.time);
        }

        this.writeSplitsValue(value, unit);
    }

    /**
     *
     * @param {string} value
     * @param {string} unit
     */
    writeSplitsValue(value, unit) {
        const field = 'splits';
        this.top.setValue(field, value);
        this.middle.setValue(field, value);
        this.bottom.setValue(field, value);
        this.large.setValue(field, value);
        this.top.setUnit(field, unit);
        this.middle.setUnit(field, unit);
        this.bottom.setUnit(field, unit);
        this.large.setUnit(field, unit);
    }

    /**
     *
     * @return {boolean}
     */
    confirmBeforeExit() {
        const self = this;

        if (self.tx) {
            self.tx = false;
            return true;
        }

        if (self.isConfirmDialogOpen === true) {
            return false
        }

        // we started a scheduled session and we are still
        // doing our warm up, but about to begin session
        if (self.inWarmUp === true) {
            this.isConfirmDialogOpen = true;
            self.confirmFinishWarmUp(function onStartOnMinuteTurn() {
                Dialog.hideModal();
                self.isConfirmDialogOpen = false;
                self.metrics.startIntervals(self.timer.getDuration(), Math.round(60 - self.timer.getDuration() / 1000 % 60));
                self.inWarmUp = false;
            }, function onStartImmediately() {
                Dialog.hideModal();
                self.isConfirmDialogOpen = false;
                self.metrics.startIntervals(self.timer.getDuration(), null);
                self.inWarmUp = false;
            }, function finish() {
                self.clear();
            }, function cancel() {
                console.debug('canceled');
                self.isConfirmDialogOpen = false;
                Dialog.hideModal();
            });

            return false;
        }

        // pause session
        self.pause();

        self.isConfirmDialogOpen = true;
        self.leaveOrResumeConfirmDialog(function resume() {
            self.resume();
            Dialog.hideModal();
            self.isConfirmDialogOpen = false;
        }, function finish() {
            self.isConfirmDialogOpen = false;
            self.clear();
        });

        return false;
    }

    pause() {
        this.paused = true;
        this.timer.pause();
        this.metrics.pause();
    }

    resume() {
        this.paused = false;
        this.timer.resume();
        this.metrics.resume();
    }

    /**
     * Cleanup before leaving session
     */
    clear() {
        const self = this;
        self.tx = true;
        document.PREVENT_SYNC = false;

        clearInterval(self.uiIntervalId);
        clearInterval(self.syncClockInterval);
        self.timer.stop();
        self.metrics.stop().then(function (session) {
            Dialog.hideModal();
            self.back(session);
        });
        self.sessionFinished = true;
    }

    /**
     * Leave session
     * @param {Session} session
     */
    back(session) {
        const self = this;
        if (self.appContext.preferences().isRestoreLayout()) {
            saveLayout(self.top.getType(), self.middle.getType(), self.bottom.getType(), self.large.getType());
        } else {
            resetLayout();
        }

        if (self.isRemoteCommand && Context.userHasCoach()) {
            self.appContext.navigate('coach-slave', false, undefined);
        } else {
            App.load('session-summary', {session: session, isPastSession: false}, undefined, function () {
                App.removeFromStack();
            });
        }
    }



    get metrics() {
        return this._metrics;
    }

    set metrics(value) {
        this._metrics = value;
    }

    get splitsHelper() {
        return this._splitsHelper;
    }

    set splitsHelper(value) {
        this._splitsHelper = value;
    }
}

function saveLayout(top, middle, bottom, large) {
    window.localStorage.setItem("layout", JSON.stringify({
        top: top,
        middle: middle,
        bottom: bottom,
        large: large
    }));
}

function loadLayout() {
    let layout = window.localStorage.getItem("layout");
    if (layout)
        return JSON.parse(layout);
    else
        return DEFAULT_POSITIONS;
}

function resetLayout() {
    window.localStorage.removeItem("layout");
}

export default SessionView;