'use strict';

var Calibrate = require('../core/calibrate.js').Calibrate;

function CalibrationView(page) {
    var $page = $(page)
        , $content = $page.find('.app-content')
        , $calibrate = $page.find('.calibrate');

    setTimeout(function () {
        $content.css({"line-height": $page.height() + "px"});
    }, 0);

    setTimeout(function () {
        var cal = new Calibrate(function () {
            $calibrate.removeClass('listening');
            $calibrate.addClass('finished');
            $calibrate.html("Done!");
            setTimeout(function () {
                App.back();
            }, 1500);
        });
        cal.start();

    }, 1000);
}

exports.CalibrationView = CalibrationView;