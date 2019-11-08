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
            , $msgActionSecondary = $page.find('[data-selector="action-secondary"]')
            , $gotIt;

        $gotIt = $page.find('.got-it');

        $msgAction.html(context.translate('coach_redirect_online_action'));
        $msgActionSecondary.html(context.translate('coach_redirect_online_action_secondary'));

        setTimeout(function () {
            $content.slick({
                dots: true,
                speed: 300,
                infinite: false,
                arrows: false
            });
        }, 0);

        $gotIt.on('tap', function () {
            context.navigate('choose-boat', true);
        });
    }
}

export default CoachRedirectOnline;
