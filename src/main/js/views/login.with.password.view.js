'use strict';

var Api = require('../server/api')
    , template = require('./signup.art.html')
    , Context = require('../context').Context
;

var $login, $create, $forgot;

function LoginWithPasswordView(page) {
    screen.orientation.lock('portrait');

    Context.render(page, template({}));

    var $page = $(page), running = false;

    $login = $('.login-form', page);
    $create = $('.create-account-form', page);
    $forgot = $('.forgot-password-form', page);

    $page.find('form').submit(function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
    });


    //-- navigate to actions
    //----------------------
    $page.find('[data-action="join"]').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        toggle('create');
    });

    $page.find('#login-invalid').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        toggle('forgot-password');
    });

    $page.find('[data-action="login"]').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        toggle('login');
    });

    $page.find('[data-action="back"]').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        App.load('login');
    });


    //-- Login / Create / Reset actions
    //---------------------------------

    var $invalidLoginMessage = $login.find('.auth-error');
    $page.find('#login-with-password').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (running) return;
        running = true;

        var username = $login.find('[name="username"]').val()
            , password = $login.find('[name="password"]').val()
            , $progress = $(this).parent().find('.progress-btn');

        $invalidLoginMessage.hide();
        $progress.removeClass('hidden');

        Api.Auth.loginWithPassword(username, password).then(function () {

            App.load('home');
            $progress.addClass('hidden');
            running = false;

        }).fail(function (err) {

            $invalidLoginMessage.show();
            $progress.addClass('hidden');
            running = false;
            console.log(err);
        });
    });


    $page.find('#create-account').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (running) return;
        running = true;

        $create.find('.auth-error').hide();

        var username = $create.find('[name="username"]').val()
            , password = $create.find('[name="password"]').val()
            , name = $create.find('[name="name"]').val()
            , $progress = $(this).parent().find('.progress-btn');

        $progress.removeClass('hidden');

        Api.Auth.createAccount(username, password, name).then(function (a, b) {

            Api.Auth.loginWithPassword(username, password).then(function () {

                App.load('home');
                $progress.addClass('hidden');
                running = false;

            }).fail(function (err) {
                console.log(err);
                $progress.addClass('hidden');
                running = false;
            });

        }).fail(function (response) {
            $create.find('.auth-error').html(response.reason).show();
            $progress.addClass('hidden');
            running = false;
        });
    });

    $page.find('#forgot-password').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (running) return;
        running = true;

        var email = $forgot.find('[name="email"]').val()
            , $progress = $(this).parent().find('.progress-btn');

        $forgot.find('.check-email').hide();

        $progress.removeClass('hidden');

        Api.Auth.forgotPassword(email).then(function (a, b) {
            $progress.addClass('hidden');
            running = false;
            $forgot.find('.check-email').show();
        }).fail(function (response) {
            $progress.addClass('hidden');
            running = false;
            if (response && response.error === 408) {
                $forgot.find('.auth-error').html('Connnection timeout. Please try again later').show();
            } else {
                $forgot.find('.check-email').show();
            }
        });
    });

}



function toggle(formName) {
    $login.hide();
    $create.hide();
    $forgot.hide();

    if (formName === 'login') {
        $login.show();
        $login.find('[name="username"]')
            .val($create.find('[name="email"]').val() ? $create.find('[name="email"]').val() : '');
        $login.find('[name="password"]').val('');
        $login.find('.auth-error').hide();
        return;
    }

    if (formName === 'create') {
        $create.show();
        $create.find('[name="username"]')
            .val($forgot.find('[name="email"]').val() ? $forgot.find('[name="email"]').val() : '');
        $create.find('[name="password"]').val('');
        $create.find('[name="name"]').val('');
        $create.find('.auth-error').hide();
        return;
    }

    if (formName === 'forgot-password') {
        var email = $login.find('[name="username"]').val() ? $login.find('[name="username"]').val() : '';
        $forgot.find('[name="email"]').val(email);
        $forgot.show();
        $forgot.find('.check-email').hide();
        $forgot.find('.auth-error').hide();
    }
}

exports.LoginWithPasswordView = LoginWithPasswordView;
