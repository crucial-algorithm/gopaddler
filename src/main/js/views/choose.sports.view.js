'use strict';

import Context from '../context';
import Api from '../server/api';

var template = require('./choose.sports.art.html');
var Utils = require('../utils/utils');



class ChooseSportsView {
    /**
     *
     * @param page
     * @param {Context} context
     */
    constructor(page, context) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));

        page.onReady.then(function () {
            $(".choose-sports-list").on('click', 'li', function (e) {
                var $li = $(e.target)
                    , message = $li.data('message');
                var profile = Api.User.getProfile();
                Utils.notify(profile.name + "(" + profile.email + ")"
                    , "Discipline: " + $li.text());

                if (!message) {
                    context.navigate("choose-boat", true, undefined);
                    return;
                }

                var modal = context.ui.modal.alert(context.translate("choose_sport_picked_not_supported_title"),
                    '<p class="choose-sport-not-supported-dialog-text">'
                    + context.translate(message)
                    + '</p>'
                    , {
                        text: context.translate('choose_sport_picked_not_supported_acknowledge'), callback: function () {
                            context.navigate("choose-boat", true, undefined);
                        }
                    });
            });
        })
    }
}

export default ChooseSportsView;
