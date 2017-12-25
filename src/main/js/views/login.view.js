'use strict';

var Api = require('../server/api');
var Dialog = require('../utils/dialog');
var template = require('./login.art.html');

function LoginView(page, context) {
    context.render(page, template);

    screen.orientation.lock('portrait');

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
    var $account = $('#account', page);



    $login.off('touchstart').on('touchstart', function () {
        Api.Auth.loginWithFacebook().done(function () {

            App.load('home');

        }).fail(function (err) {

            alert(err);
        });
    });

    $account.off('touchstart').on('touchstart', function () {
        App.load('login-with-password')
    });


}


exports.LoginView = LoginView;
