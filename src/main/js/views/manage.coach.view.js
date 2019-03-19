var template = require('./manage.coach.art.html')
    , rowTemplate = require('./manage.coach.row.art.html')
    , Api = require('../server/api')
    , List = require('../utils/widgets/list').List;

function ManageCoachView(page, context) {
    var self = this;
    self.appContext = context;
    self.page = page;
    self.usedCoachCodes = {};
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));
    var listCoaches = Api.User.listCoaches();

    page.onShown.then(function () {
        self.$listHeader = $('#coach-list-header');
        self.$list = $('#coach-list');
        self.$actions = $('#coach-actions');
        self.$code = $('#code');
        self.$button = $('#button');
        self.$loading = $('#coach-loading');
        self.$fullWindowMessage = $('.coach-before-server-response');

        self.$list.on('touchstart', '.manage-coach-list-device-forget', function (e) {
            var $button = $(e.target), coachId = $button.data('coach');

            self.list.delete($button, coachId, function () {
                Api.User.leaveCoachTeam(coachId).then(function (coaches) {
                    if (coaches !== null) {
                        self.render(coaches);
                    }
                });
                return false;
            });
        });


        self.$button.hide();
        self.$code.off('keyup').on('keyup', function () {

            if (self.$code.val().length === 6) {
                // valid
                self.setCodeValid();
                self.$button.css("display", "flex");

            } else {
                // invalid
                self.setCodeInvalid();
                self.$button.hide();
            }
        });

        var newCoachRequest = function () {
            var code = parseInt(self.$code.val());
            if (isNaN(code)) {
                context.ui.modal.alert(context.translate('manage_coach_request_unknown_code')
                    , "<p>" + context.translate('manage_coach_request_unknown_code_message') + "</p>"
                    , context.translate('manage_coach_request_unknown_code_acknowledge'));
                return;
            }

            if (self.usedCoachCodes[code] !== undefined) {
                context.ui.modal.alert(context.translate('manage_coach_request_already_a_coach')
                    , "<p>" + context.translate('manage_coach_request_already_a_coach_message', [self.usedCoachCodes[code].name]) + "</p>"
                    , context.translate('manage_coach_request_already_a_coach_acknowledge'));
                return;
            }

            Api.User.getCoachInfo(code).then(function (info) {
                if (info === null) {
                    context.ui.modal.alert(context.translate('manage_coach_request_unknown_code')
                        , "<p>" + context.translate('manage_coach_request_unknown_code_message') + "</p>"
                        , context.translate('manage_coach_request_unknown_code_acknowledge'));
                } else {
                    self.showConnectToCoachWarning(info.name, info.id)
                }
            });
        };

        self.$button.off('touchstart').on('touchstart', newCoachRequest.bind(self));
        $('form').off('submit').on('submit', newCoachRequest.bind(self));

        listCoaches.then(function (coaches) {
            self.render(coaches);
        }).fail(function (err) {
            self.$fullWindowMessage.text(context.translate("manage_coach_unexpected_error"));

            if (err && err.error === 504) {
                self.$fullWindowMessage.text(context.translate("manage_coach_no_internet"));
            }

            if (err && err.error === 502) {
                self.$fullWindowMessage.text(context.translate("manage_coach_no_server_found"));
            }

            self.$loading.hide();
        });
    });

}

ManageCoachView.prototype.render = function (coaches) {
    var self = this;

    if (self.list) {
        try {
            self.list.destroy();
        } catch (err) {
            console.log(err);
        }
    }
    self.$list.empty();
    self.$loading.hide();
    self.$fullWindowMessage.hide();
    self.$actions.css('display', 'flex');
    self.$actions.removeClass('manage-coach-actions-when-has-coaches');
    self.$listHeader.hide();

    if (!coaches || coaches.length === 0 ) {
        self.$list.append("<h1>" + self.appContext.translate("manage_coach_no_coach_found") + "</h1>");
        self.$list.show();
        return;
    }

    self.$actions.addClass('manage-coach-actions-when-has-coaches');
    self.$listHeader.css('display', 'flex');
    self.$list.show();

    self.list = new List(self.page, {
        $elem: self.$list,
        swipe: true,
        swipeSelector: '.manage-coach-list-row-actions',
        ptr: {
            disabled: true,
            onRefresh: function () {}
        }
    }, self.appContext);
    self.list.clear();

    self.usedCoachCodes = {};
    for (var i = 0, l = coaches.length; i < l; i++) {
        var coach = coaches[i];
        var $row = $(rowTemplate({
            coach: coach.name,
            id: coach.id,
            since: moment(new Date()).format('YYYY-MM-DD'),
            pending: coach.pending === true
        }));
        self.list.newRow($row);
        self.usedCoachCodes[coach.code] = coach;
    }

   self.list.refresh();
};

ManageCoachView.prototype.showConnectToCoachWarning = function (coach, id) {
    var self = this;
    var message = [
        '<p class="manage-coach {landscape}">' + self.appContext.translate('manage_coach_confirm_statement') + '</p>',
        '<p class="manage-coach-confirm-coach-name {landscape}">' + coach + '</p>',
        '<p class="manage-coach {landscape}">' + self.appContext.translate('manage_coach_confirm_question') + '</p>'
    ].join('').replace(new RegExp('{landscape}', 'g'), this.appContext.isPortraitMode() ? '' : 'landscape');

    self.appContext.ui.modal.confirm('', message
        , {
            text: self.appContext.translate('manage_coach_confirm_proceed'), callback: function calibrate() {
                Api.User.joinCoachTeam(id).then(function (coaches) {
                    if (coaches === null) {
                        // handle error
                    } else {
                        self.render(coaches);
                        self.setCodeToInitialState();
                    }
                });
            }
        }
        , {
            text: self.appContext.translate('manage_coach_confirm_cancel'), callback: function skip() {
                // intentionally left blank
            }
        }
    );
};

ManageCoachView.prototype.setCodeValid = function () {
    this.$code.css('border', "3px solid #71B57B");
};
ManageCoachView.prototype.setCodeInvalid = function () {
    this.$code.css('border', "3px solid #EF6155");
};
ManageCoachView.prototype.setCodeToInitialState = function () {
    this.$code.css('border', "none");
    this.$code.val('');
    this.$button.hide();
};

exports.ManageCoachView = ManageCoachView;
