'use strict';

import Context from '../context';
import Api from '../server/api';
import Utils from '../utils/utils';
import template from './choose.sports.art.html';



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
                const $li = $(e.target)
                    , isSupported = $li.data('supported') === "true"
                    , message = $li.data('message');
                const profile = Api.User.getProfile();
                setTimeout(function () {
                    Utils.notify(profile.name + "(" + profile.email + ")"
                        , "Discipline: " + $li.text());
                }, 2000);

                if (isSupported) {
                    context.navigate("choose-boat", true, undefined);
                    return;
                }

                context.ui.modal.alert(context.translate("choose_sport_picked_not_supported_title"),
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
