
App.controller('session', function (page) {
    new Session(page);
});

App.controller('settings', function (page) {
    var $calibration = $('#calibration', page), $back = $('.back-button', page);
    $calibration.on('touchstart', function () {
        App.load('calibration');
    });

    $back.on('touchstart', function () {
        App.back('home', function () {});
    });

    $(page).on('appDestroy', function () {
        $calibration.off('touchstart');
        $back.off('touchstart');
    });
});

App.controller('sessions', function (page) {
    var $back = $('.back-button', page), $page = $(page);

    $back.on('touchstart', function () {
        App.back('home', function () {});
    });

    $page.on('appDestroy', function () {
        $back.off('touchstart');
    });


    var $row, $rows = $('.session-row', page), width, baseWidth;
    $rows.on('touchend', function (e) {
        if ($row) {
            $row.animate({left: 0}, 200);
            if ($row[0] === e.currentTarget) {
                $row = undefined;
                return;
            }
        }

        $row = $(e.currentTarget);
        $row.animate({left: -width}, 200);
    });

    $rows.on('touchstart', function (e) {
        if ($(e.srcElement).data('is') === 'delete') {
            alert('are you sure you want to delete this session?');
            e.preventDefault();
            e.stopPropagation();
        }
    });

    $page.find('.sessions-details').on('scroll', function (e) {
        if (e.axis == e.HORIZONTAL_AXIS) {
            e.stopPropagation();
            e.preventDefault();
            e.cancelBubble = false;
        }
        return false;
    });

    // allow for elements to be added to dom and then, append delete button, but keep it hidden (overflow-x: hidden)
//    setTimeout(function () {
//        width = $rows.find('li').width();
//        $rows.find('li').width(width);
//        baseWidth = $rows.width() + width;
//        $rows.width(baseWidth);
//        $rows.append($('<li data-is="delete" class="sessions-delete-session">Delete</li>').width(baseWidth - (4 * width)));
//        $rows.parent().css({'overflow': 'hidden'});
//    }, 0);

    $page.on('appShow', function() {
        $page.find('.sessions-details').css({'overflow': 'hidden'});
    });

});


App.controller('calibration', function (page) {
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

});

document.pd_device_ready = false;
document.addEventListener('deviceready', function () {
    document.pd_device_ready = true;

    // Override default HTML alert with native dialog
    if (navigator.notification) {
        window.alert = function (message) {
            navigator.notification.alert(
                message,    // message
                null,       // callback
                "Paddler",  // title
                'OK'        // buttonName
            );
        };

        window.confirm = function (message, callback) {
            return navigator.notification.confirm(message, callback, "Paddler", null)
        }
    }

    document.addEventListener("backbutton", function(e){
        try {
            App.back();
        } catch (te) {
            console.log(te);
        }
    }, false);

    // set to either landscape
    screen.lockOrientation('landscape');

    window.powermanagement.acquire();

}, false);


App.load('home', function () {
    $('#btn-sessions').on('touchend', function () {
        App.load('sessions');
    });

    $('#btn-session').on('touchend', function () {
        var calibration = Calibrate.load();
        if (calibration === undefined) {
            alert("No calibration: Got to Settings > Calibrate");
            return;
        }
        App.load('session');
    });

    $('#btn-settings').on('touchend', function () {
        App.load('settings');
    });
});


