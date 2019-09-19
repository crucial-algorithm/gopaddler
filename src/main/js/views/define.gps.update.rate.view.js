'use strict';

import Context from '../context';
import Settings from '../model/settings';
import template from './define.gps.update.rate.art.html';

class DefineGPSSpeedView {
    constructor(page, context) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));
        let current = context.getGpsRefreshRate();

        let $page = $(page);
        let selected = current;
        $page.on('click', 'li', function (e) {
            let $target = $(e.target);
            let option = $target.data('option');

            $('li').removeClass('selected');
            $target.addClass('selected');

            selected = option;
        });

        $page.on('appBeforeBack', function () {
            Settings.updateGpsRefreshRate(selected);
            context.setGpsRefreshRate(selected);
        });

        page.onReady.then(function(){
            $('li[data-option="' + current + '"]').addClass('selected');
        })
    }
}

export default DefineGPSSpeedView;
