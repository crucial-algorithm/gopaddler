'use strict';
import Context from '../context';
import template from './calibration.help.art.html';

class CalibrationHelpView {
    constructor(page, context, request) {
        request = request || {};
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));

        var $page = $(page)
            , $content = $page.find('[data-selector="slick"]')
            , $gotIt
            , isStartSession = !!(request.from === 'start-session');


        // adjust slideshow for when the user reaches it from start session or from help
        if (isStartSession) {
            $page.find('[data-step="3"]').find('.got-it').remove();
        } else {
            $page.find('[data-step="4"]').remove();
        }

        $gotIt = $page.find('.got-it');

        setTimeout(function () {
            $content.slick({
                dots: true,
                speed: 300,
                infinite: false,
                arrows: false
            });
        }, 0);

        $gotIt.on('tap', function () {
            if (context.preferences().isShowCalibrationTips()) {
                context.preferences().calibrationTipsShown();
            }
            if (isStartSession) context.navigate('calibration', true, {from: "start-session"});
            else App.back();
        });
    }
}

export default CalibrationHelpView;
