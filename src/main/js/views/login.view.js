'use strict';

var Api = require('../server/api')
    , template = require('./login.view.art.html')
    , Context = require('../context').Context
;

function LoginView(page, context) {
    screen.orientation.lock('portrait');

    Context.render(page, template({}));

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
            context.navigate('home');
        }).fail(function (err) {

            alert(err);
        });
    });

    $account.off('touchstart click').on('touchstart click', function () {
        context.navigate('login-with-password')
    });


}


exports.LoginView = LoginView;
