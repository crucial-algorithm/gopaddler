'use static';

var template = require('./coach.slave.art.html');
var Utils = require('../utils/utils');
var Api = require('../server/api');
var Unlock = require('../utils/widgets/unlock').Unlock;

function CoachSlaveView(page, context) {
    context.render(page, template({isLandscapeMode: !context.isPortraitMode()}));

    var self = this;
    self.$page = $(page);
    self.deviceActiveIntervalId = null;
    self.checkServerStatusInterval = null;
    self.context = context;

    page.onReady.then(function () {
        self.onRendered(self.$page, context);
    });

    page.onAndroidBackButton.then(function () {
        self.confirmLeave();
    });
}

CoachSlaveView.prototype.onRendered = function () {
    var self = this
        , $retryButton = $('.coach-slave-retry')
        , $container = $('.coach-slave.blink')
    ;

    var unlock = new Unlock(self.context);
    unlock.onUnlocked(function () {
        self.confirmLeave();
    });

    $retryButton.off('click').on('click', function (e) {
        e.stopImmediatePropagation();

        $container.removeClass('coach-slave-connection-failed').addClass('blink');
        self.connectToServer($container);
    });

    self.$page.on('tap', function (e) {
        if (e.target !== $retryButton[0]) unlock.show();
    });

    self.connectToServer($container);
};

CoachSlaveView.prototype.connectToServer = function ($container) {
    var self = this, context = self.context;
    var serverResponded = false, maxRetries = 7, attempt = 0;

    clearInterval(self.deviceActiveIntervalId);
    clearInterval(self.checkServerStatusInterval);

    if (!Utils.isNetworkConnected()) {
        context.ui.modal.alert(context.translate('coach_slave_network_not_available_title')
            , "<p>" + context.translate('coach_slave_network_not_available_message') + "</p>"
            , context.translate('coach_slave_network_not_available_acknowledge'));

        $container.removeClass('blink').addClass('coach-slave-connection-failed');
        return;
    }

    Api.TrainingSessions.live.syncClock(Api.User.getId()).then(function () {
        Api.TrainingSessions.live.startListening();
        Api.TrainingSessions.live.deviceReady().then(function () {
            serverResponded = true;
            $container.removeClass('blink')
                .removeClass('coach-slave-connection-failed').addClass('coach-slave-connected');
        });
    }).fail(function () {
        // TODO: show error to the user!
    });

    self.checkServerStatusInterval = setInterval(function () {
        attempt++;

        if (attempt > maxRetries) {
            clearInterval(self.checkServerStatusInterval);
            context.ui.modal.alert(context.translate('coach_slave_server_not_available_title')
                , "<p>" + context.translate('coach_slave_server_not_available_message') + "</p>"
                , context.translate('coach_slave_server_not_available_acknowledge'));

            $container.removeClass('blink').addClass('coach-slave-connection-failed');
        }

        if (serverResponded === true) {
            clearInterval(self.checkServerStatusInterval);
        }
    }, 1000);

    self.deviceActiveIntervalId = setInterval(function () {
        Api.TrainingSessions.live.deviceReady();
    }, 1000);

    Api.TrainingSessions.live.on(Api.LiveEvents.START, function (commandId, payload) {
        console.log(['[ ', Api.User.getProfile().name, ' ] received start session [', commandId, ']'].join(''));

        // it's x seconds old... coach should already have been warned and
        // removed athlete from session! Don't run command!
        if (Date.now() - payload.startedAt > 15000) {
            console.log(['[ ', Api.User.getProfile().name, ' ]'
                , ' Ignoring start command because it\'s too old (', Date.now() - payload.startedAt, ' milis)'
                , ' @', new Date().toISOString(), '[', commandId, ']'].join(''));
            Api.TrainingSessions.live.commandSynced(commandId);
            return;
        }

        Api.TrainingSessions.live.commandSynced(commandId);

        self.startSession(payload.expression, payload.splits, payload.startedAt, payload.sessionId);
        self.$page.off();
    }, false);

    self.$page.on('appDestroy', function () {
        clearInterval(self.deviceActiveIntervalId);
        clearInterval(self.checkServerStatusInterval);
        Api.TrainingSessions.live.deviceDisconnected();
        Api.TrainingSessions.live.clearCommandListeners();
        return false;
    });

    Api.TrainingSessions.live.on(Api.LiveEvents.HARD_RESET, function (commandId, payload) {
        localStorage.setItem('hard_reset', new Date().toISOString());
        location.reload();
    }, true);
};

/**
 *
 * @param expression
 * @param splits
 * @param startedAt
 * @param {String} liveSessionId
 */
CoachSlaveView.prototype.startSession = function (expression, splits, startedAt, liveSessionId) {
    var self = this;
    clearInterval(self.deviceActiveIntervalId);
    Api.TrainingSessions.live.clearCommandListeners();
    self.context.navigate('session', false, {
        expression: expression,
        splits: splits,
        isWarmUpFirst: true,
        remoteScheduledSessionId: null,
        startedAt: startedAt,
        wasStartedRemotely: true,
        liveSessionId: liveSessionId
    });
};


CoachSlaveView.prototype.confirmLeave = function () {
    var self = this;
    var $resume, $finish;

    var modal = self.context.ui.modal.undecorated([
        '   <div class="session-controls session-controls-free-session">',
        '   	<div class="session-controls-round-button session-resume">',
        '   		<div class="session-controls-round-button-label">' + self.context.translate('coach_slave_cancel') + '</div>',
        '       </div>',
        '       <div class="session-controls-round-button  session-finish">',
        '   		<div class="session-controls-round-button-label">' + self.context.translate('coach_slave_leave') + '</div>',
        '       </div>',
        '   </div'
    ].join(''));

    $resume = modal.$modal.find('.session-resume');
    $finish = modal.$modal.find('.session-finish');

    // add behavior
    $resume.on('touchend', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        modal.hide();
    });

    $finish.on('touchend', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        modal.hide();
        setTimeout(function () {
            self.context.navigate('select-session', true);
        }, 100);
    });
};

exports.CoachSlaveView = CoachSlaveView;
