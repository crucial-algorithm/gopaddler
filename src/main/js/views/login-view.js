'use strict';

var FB = require('../server/fb').FB;

function LoginView(page) {
    var $page = $(page), img;


    if(window.devicePixelRatio == 0.75) {
        img = 'login-ldpi.png';
    }
    else if(window.devicePixelRatio == 1) {
        img = 'login-mdpi.png';
    }
    else if(window.devicePixelRatio == 1.5) {
        img = 'login-hdpi.png';
    }
    else if(window.devicePixelRatio == 2) {
        img = 'login-xdpi.png';
    }

    $page.find('.app-page').css({"background-image": "images/" + img});


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
}


exports.LoginView = LoginView;