'use strict';

var Api = require('../server/api');

function LoginView(page) {

    var $page = $(page), img;

    if (window.devicePixelRatio == 0.75) {
        img = 'login-ldpi.png';
    }
    else if (window.devicePixelRatio == 1) {
        img = 'login-mdpi.png';
    }
    else if (window.devicePixelRatio == 1.5) {
        img = 'login-hdpi.png';
    }
    else if (window.devicePixelRatio == 2) {
        img = 'login-xdpi.png';
    }

    $page.find('.app-page').css({"background-image": "images/" + img});

    var $login = $('#facebook', page);

    $login.off('touchstart').on('touchstart', function () {

        Api.Auth.login().done(function () {

            App.load('home');

        }).fail(function (err) {

            alert(err);
        });
    });
}


exports.LoginView = LoginView;