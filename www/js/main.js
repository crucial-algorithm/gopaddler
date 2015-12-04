/**
 * Splash screen / login page.
 */
App.controller('login', function (page) {

    var $login = $('#facebook', page);

    $login.on('touchstart', function () {

        FB.login().done(function () {

            // successful login navigates to home page
            App.load('home');

        }).fail(function (err) {

            if (err && err.message) {

                // show error message
                alert(err.message);
            }
        });
    });
});


App.controller('home', function (page) {

    $('#btn-sessions', page).on('touchend', function () {
        App.load('sessions');
    });

    $('#btn-session', page).on('touchend', function () {
        var calibration = Calibrate.load();
        if (calibration === undefined) {
            alert("No calibration: Got to Settings > Calibrate");
            return;
        }
        App.load('session');
    });

    $('#btn-settings', page).on('touchend', function () {
        App.load('settings');
    });

    $('.home-username', page).html('Hi, ' + Paddler.Session.getUser().getFullName());
});


/**
 * New session page.
 */
App.controller('session', function (page) {
    new Session(page);
});


/**
 * Settings page.
 */
App.controller('settings', function (page) {

    var $calibration = $('#calibration', page),
        $back = $('.back-button', page);

    $calibration.on('touchstart', function () {
        App.load('calibration');
    });


    $back.on('touchstart', function () {
        App.back('home', function () {
        });
    });

    $(page).on('appDestroy', function () {
        $calibration.off('touchstart');
        $back.off('touchstart');
    });
});


/**
 * Session list page.
 */
App.controller('sessions', function (page) {

    var $back = $('.back-button', page), $page = $(page);

    $back.on('touchstart', function () {
        App.back('home', function () {
        });
    });

    $page.on('appDestroy', function () {
        $back.off('touchstart');
    });


    // get training sessions
    Paddler.TrainingSessions.get('2016f4e0-6ecb-11e5-a837-0800200c9a66').done(function (trainingSession) {
        console.log(trainingSession);
    });


    // save training session
    /*
     var trainingSessionDataPoints = [];

     var trainingSessionData = new Paddler.TrainingSessionData();

     trainingSessionData.setTimestamp((new Date()).getTime());
     trainingSessionData.setDistance(0);
     trainingSessionData.setSpeed(0);
     trainingSessionData.setSpm(0);
     trainingSessionData.setSpmEfficiency(0);

     trainingSessionDataPoints.push(trainingSessionData);

     var trainingSession = new Paddler.TrainingSession();

     trainingSession.setDate(new Date());
     trainingSession.setDescription('My Training Session');
     trainingSession.setData(trainingSessionDataPoints);

     // calibration details
     trainingSession.setAngleZ(0.2);
     trainingSession.setNoiseX(0.2);
     trainingSession.setNoiseZ(0.2);
     trainingSession.setFactorX(0.2);
     trainingSession.setFactorZ(0.2);
     trainingSession.setAxis(2);

     Paddler.TrainingSessions.save(trainingSession);
     */

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

    $page.on('appShow', function () {
        $page.find('.sessions-details').css({'overflow': 'hidden'});
    });
});


/**
 * Calibration page.
 */
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

    document.addEventListener("backbutton", function (e) {
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


/**
 * Home screen.
 */
App.load('login');


