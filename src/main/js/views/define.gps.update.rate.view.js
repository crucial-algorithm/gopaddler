import Context from '../context';

var settings = require('../model/settings');
var template = require('./define.gps.update.rate.art.html');

class DefineGPSSpeedView {
    constructor(page, context) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));
        var current = context.getGpsRefreshRate();

        var $page = $(page);
        var selected = current;
        $page.on('click', 'li', function (e) {
            var $target = $(e.target);
            var option = $target.data('option');

            $('li').removeClass('selected');
            $target.addClass('selected');

            selected = option;
        });

        $page.on('appBeforeBack', function () {
            settings.updateGpsRefreshRate(selected);
            context.setGpsRefreshRate(selected);
        });

        page.onReady.then(function(){
            $('li[data-option="' + current + '"]').addClass('selected');
        })
    }
}

export default DefineGPSSpeedView;
