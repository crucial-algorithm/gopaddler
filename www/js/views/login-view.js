'use strict';

function LoginView(page) {

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