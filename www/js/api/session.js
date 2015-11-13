
    /**
     *
     * @constructor
     */
    function UserSession() {
        this._user = null;
        this._accessToken = null;
    }


    /**
     *
     * @param {User} user
     */
    UserSession.prototype.setUser = function (user) {

        this._user = user;

        window.localStorage.setItem('user', (user ? user.serialize() : null));

        this._initLanguage();

        return this;
    };


    /**
     *
     * @returns {null|User}
     */
    UserSession.prototype.getUser = function () {
        return this._user;
    };


    /**
     *
     * @param {string} accessToken
     */
    UserSession.prototype.setAccessToken = function (accessToken) {

        this._accessToken = accessToken;

        window.localStorage.setItem('accessToken', accessToken);

        return this;
    };


    /**
     *
     * @returns {null|string}
     */
    UserSession.prototype.getAccessToken = function () {
        return this._accessToken;
    };


    /**
     *
     */
    UserSession.prototype.init = function () {

        var accessToken = window.localStorage.getItem('accessToken'),
            user = window.localStorage.getItem('user');

        this._user = (user ? (new User()).unserialize(user) : null);
        this._accessToken = (accessToken ? accessToken : null);

        this._initLanguage();
    };


    /**
     *
     */
    UserSession.prototype.destroy = function () {
        this.setUser(null);
        this.setAccessToken(null);
    };


    /**
     *
     */
    UserSession.prototype._initLanguage = function () {

        if (this._user && this._user.getProfile()) {
            //i18n.language(this._user.getProfile().getLanguage());
        } else {
            //i18n.language(null);
        }
    };

    
    var userSession = new UserSession();
