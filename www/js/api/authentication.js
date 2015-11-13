
    /**
     *
     * @constructor
     */
    function Authentication() {
    }


    /**
     *
     * @returns {boolean}
     */
    Authentication.prototype.isAuthenticated = function () {
        return (userSession.getUser() !== null);
    };


    /**
     *
     * @returns {*}
     */
    Authentication.prototype.registration = function (username, password, passwordConfirmation, email) {

        return api.post('/auth/registration', {
            username: username,
            password1: password,
            password2: passwordConfirmation,
            email: email
        });
    };


    /**
     *
     * @param username
     * @param password
     *
     * @returns {*}
     */
    Authentication.prototype.login = function (username, password) {

        return api.post('/auth/login', {
            username: username,
            password: password
        }).done(function (response) {

            // store the user information and token in userSession
            var token = response.data.token,
                user = (new User()).fromData(response.data.user);

            userSession.setAccessToken(token);
            userSession.setUser(user);

            return user;
        });
    };


    /**
     *
     * @returns {*}
     */
    Authentication.prototype.logout = function () {

        // destroy the current userSession
        userSession.destroy();

        return $.Deferred().resolve(true);
    };


    /**
     *
     * @returns {*}
     */
    Authentication.prototype.autoLogin = function () {

        // user is not authenticated and we have a token on storage
        if (!this.isAuthenticated() && window.localStorage.getItem('accessToken')) {

            // set the token for authenticated requests
            userSession.setAccessToken(window.localStorage.getItem('accessToken'));

            return this.getUser();
        }
    };


    /**
     *
     */
    Authentication.prototype.getUser = function () {

        // get the user information
        return api.get('/auth/user').then(function (response) {

            var user = (new User()).fromData(response.data);

            userSession.setUser(user);

            return user;
        });
    };


    /**
     *
     * @param user
     *
     * @returns {*}
     */
    Authentication.prototype.userSave = function (user) {

        return api.put('/auth/user', user, new api.Options(true, true)).then(function (response) {

            var user = (new User()).fromData(response.data);

            userSession.setUser(user);

            return user;
        });
    };


    /**
     *
     * @param email
     *
     * @returns {*}
     */
    Authentication.prototype.recoverPassword = function (email) {

        return api.post('/auth/password/reset/', {email: email});
    };


    /**
     *
     * @param uid
     * @param token
     * @param password1
     * @param password2
     *
     * @returns {*}
     */
    Authentication.prototype.recoverPasswordConfirm = function (uid, token, password1, password2) {

        return api.post('/auth/password/reset/confirm', {
            uid: uid,
            token: token,
            new_password1: password1,
            new_password2: password2
        });
    };

    var authentication = new Authentication();
