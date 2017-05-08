'use strict';

var Api = require('../server/api');
var Dialog = require('../utils/dialog');

function LoginView(page) {

    screen.lockOrientation('portrait');

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
        showLoginDialog($page)
    });


}

function showLoginDialog($page) {

    var joinURL = __WEB_URL__ + "/join?source=app", forgotPasswordURL = __WEB_URL__ + "/forgot-password";

    var html = [
        '<div class="login-modal-body">',
        '	<div class="info-modal-title"></div>',
        '	<div class="info-modal-content" >',
        '     <div class="form">',
        '	    <form class="login-form">',
        '	      <input type="email" placeholder="e-mail" name="username"/>',
        '	      <input type="password" placeholder="password" name="password"/>',
        '	      <p class="message login-invalid">Login failed <a href="' + forgotPasswordURL + '" target="_system">Forgot password?</a></p>',
        '	      <button class="button" id="login-with-password">login</button>',
        '	      <p class="message">Not registered? <a href="' + joinURL + '" target="_system">Create an account</a></p>',
        '	    </form>',
        '    </div>',
        '	</div>',
        '	<div class="info-modal-controls"></div>',
        '</div>'
    ];

    var $body = $(html.join(''));

    var $modal = Dialog.showModal($body, {center: false});

    setTimeout(function () {

        $modal.find('[name="username"]').focus();

        var $loginWithPassword = $modal.find('#login-with-password');
        var $username = $modal.find('input[name="username"]');
        var $password = $modal.find('input[name="password"]');

        $username.trigger('touchend');

        $modal.find('.login-form').submit(function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
        });

        $modal.find('.info-modal-content').off('touchend').on('touchend', function (e) {
            e.stopImmediatePropagation();
        });

        $modal.off('touchend').on('touchend', function (e) {
            $modal.hide();
        });


        $loginWithPassword.off('touchstart').on('touchstart', function () {

            $body.find('.login-invalid').hide();

            Api.Auth.loginWithPassword($username.val(), $password.val()).then(function () {

                $modal.hide();
                App.load('home');

            }).fail(function (err) {

                $body.find('.login-invalid').show();
                console.log(err);
            });
        });


    }, 250);
}


exports.LoginView = LoginView;