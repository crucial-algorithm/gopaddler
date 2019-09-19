'use strict';

import Context from '../context';
import Api from '../server/api';
import Settings from '../model/settings';
import template from './define.heart.rate.art.html';

class DefineHeartRateView {
    constructor(page, context) {
        var max = context.getMaxHeartRate()
            , resting = context.getRestingHeartRate();

        Context.render(page, template({
            isPortraitMode: context.isPortraitMode()
            , resting: resting, max: max
        }));

        var $page = $(page), changed = false, $max = $page.find('#max-heart-rate')
            , $resting = $page.find('#resting-heart-rate');

        $page.find('input').off('change').on('change', function () {
            changed = true;
        });



        $page.on('appBeforeBack', function () {
            if (!changed) return;

            resting = parseInt($resting.val());
            max = parseInt($max.val());

            Api.User.saveHeartRate(resting, max);
            context.setRestingHeartRate(resting);
            context.setMaxHeartRate(max);
            Settings.updateHeartRate(resting, max);
        });

        page.onReady.then(function () {

        })
    }
}

export default DefineHeartRateView;
