'use strict';



/**
 *
 */
function fbLogin() {

    var defer = $.Deferred();

    facebookConnectPlugin.login(['email'], function (response) {

        paddlerLogin(response).then(defer.resolve, defer.reject);

    }, function (response) {

        fbAuthError(response).then(defer.resolve, defer.reject);
    });

    return defer.promise();
}


/**
 *
 * @param response
 */
function paddlerLogin(response) {

    var defer = $.Deferred();

    Paddler.Authentication.fbLogin(response.authResponse.accessToken).then(defer.resolve, function (response) {

        fbAuthError(response).then(defer.resolve, defer.reject);
    });

    return defer.promise();
}


/**
 *
 * @param response
 */
function fbAuthError(response) {

    var defer = $.Deferred();

    // bypass some codes
    if (ERROR_BYPASS.indexOf(response.errorCode) !== -1) {

        // reject without error message (no need to show these errors)
        defer.reject();

    } else if (response.errorType === 'OAuthException' && !reponse.error_subcode) {

        // automatically retry login on OAuthException
        fbLogin().then(defer.resolve, defer.reject);

    } else {

        // reject with error message (these errors should be displayed)
        defer.reject({
            message: response.message || response.errorMessage || response
        });
    }

    return defer.promise();
}

var ERROR_BYPASS = [
    '4201' // user canceled login dialog
];


exports.FB = {
    login: function () {

        var defer = $.Deferred();

        // check current login status
        facebookConnectPlugin.getLoginStatus(function (response) {

            // not currently connected
            if (response.status !== 'connected') {

                // authentication with facebook
                fbLogin().then(defer.resolve, defer.reject);

            } else {

                // if no API authentication, go ahead and authenticate
                paddlerLogin(response).then(defer.resolve, defer.reject);
            }

        }, function (response) {

            fbAuthError(response).then(defer.resolve, defer.reject);
        });

        return defer.promise();
    }
};