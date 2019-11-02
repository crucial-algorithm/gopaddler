'use strict';
import Context from '../context';
import template from './calibration.help.art.html';

class CalibrationHelpView {
    constructor(page, context, request) {
        request = request || {};
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));

        let $page = $(page)
            , $content = $page.find('[data-selector="slick"]')
            , $gotIt
            , isStartSession = !!(request.from === 'start-session');

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
