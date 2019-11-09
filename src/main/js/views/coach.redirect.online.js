'use strict';
import Context from '../context';
import template from './coach.redirect.online.art.html';

class CoachRedirectOnline {
    /**
     *
     * @param page
     * @param {Context} context
     * @param request
     */
    constructor(page, context, request) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));

        let $page = $(page)
            , $content = $page.find('[data-selector="slick"]')
            , $msgAction = $page.find('[data-selector="action"]')
            , $redirectOnline = $page.find('[data-selector="action-secondary"]')
            , $continueAsAthlete;

        $continueAsAthlete = $page.find('.btn-secondary');

        $msgAction.html(context.translate('coach_redirect_online_action'));
        $redirectOnline.html(context.translate('coach_redirect_online_action_redirect'));

        setTimeout(function () {
            $content.slick({
                dots: true,
                speed: 300,
                infinite: false,
                arrows: false
            });
        }, 0);

        $continueAsAthlete.on('tap', function () {
            context.navigate('choose-boat', true);
        });

        $redirectOnline.on('tap', function () {
            window.open('https://coach.gopaddler.com/join?utm_source=app', '_system');
            // TODO: close app
            try {
                navigator.app.exitApp();
            } catch(err){
                console.log('in app, should close browser now')
            }
        });
    }
}

export default CoachRedirectOnline;
