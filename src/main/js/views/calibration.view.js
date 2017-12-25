'use strict';

var Calibrate = require('../core/calibrate.js').Calibrate;
var template = require('./calibration.view.art.html');

function CalibrationView(page, context, request) {
    context.render(page, template());

    var $page = $(page)
        , $content = $page.find('.app-content')
        , $calibrate = $page.find('.calibrate')
        , isStartSession = !!(request.from === 'start-session');

    setTimeout(function () {
        $content.css({"line-height": $page.height() + "px"});
    }, 0);

    setTimeout(function () {
        var cal = new Calibrate(function () {
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

exports.CalibrationView = CalibrationView;
