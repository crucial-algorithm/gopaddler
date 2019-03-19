"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.loginWithFacebook = loginWithFacebook;

var _loginMethod = require("../../../../node_modules/asteroid/lib/common/login-method");

function loginWithFacebook() {
    var defer = $.Deferred()
        , self = this;


    facebookConnectPlugin.getLoginStatus(function success(response) {
        if (response.status === 'connected') {
            loginToMeteor(response);
            return;
        }

        facebookConnectPlugin.login(["public_profile", "email"], function success(response) {

            if (response.status !== "connected") {
                defer.reject("response status !== connected");
            }

            loginToMeteor(response);
        }, function (err) {
            defer.reject(new Error(err.errorMessage));
        });
    });


    function loginToMeteor(response) {

        self.call("Asteroid.loginWithFacebook", response).then(function (auth) {
            _loginMethod.onLogin.apply(self, [auth]).then(function () {
                defer.resolve(auth.user);
            }).catch(function (err) {
                defer.reject(new Error(err.errorMessage));
            });
        });

    }

    return defer;
}