'use strict';
import Context from '../context';
import Calibrate from '../core/calibrate';
import template from './calibration.view.art.html';


class CalibrationView {
    constructor(page, context, request) {
        Context.render(page, template());

        const $page = $(page)
            , $content = $page.find('.app-content')
            , $calibrate = $page.find('.calibrate')
            , isStartSession = !!(request.from === 'start-session');

        setTimeout(function () {
            $content.css({"line-height": $page.height() + "px"});
        }, 0);

        setTimeout(function () {
            let cal = new Calibrate(context.isPortraitMode(), function () {
                $calibrate.removeClass('listening');
                $calibrate.addClass('finished');
                $calibrate.html("Done!");
                setTimeout(function () {
                    if (isStartSession)
                        context.navigate('home', true, {from: "calibration"});
                    else
                        App.back();
                }, 1500);
            });
            cal.start();

        }, 1000);
    }
}

export default CalibrationView;
