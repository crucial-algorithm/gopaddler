
    /**
     *
     * @type {string}
     */
    var ENDPOINT = 'http://strikedaemon.pythonanywhere.com/api'; //'http://localhost:8000/api';


    var _errorHandlers = [];


    /**
     * Retrieve the full path ready to be used in an API call.
     *
     * @param path
     *
     * @returns {string}
     */
    function getURL(path) {

        // add trailing slash
        if (path.indexOf('/', path.length - 1) === -1) {
            path += '/';
        }

        return ENDPOINT + path;
    }


    /**
     *
     * @type {RegExp}
     */
    var iso8601regex = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;


    /**
     *
     * @param input
     *
     * @returns {*}
     */
    function parseIso8601Dates(input) {

        // ignore things that aren't objects.
        if (typeof input !== 'object') {
            return;
        }

        for (var key in input) {

            if (!input.hasOwnProperty(key)) {
                continue;
            }

            var value = input[key];
            var match;

            // check for string properties which look like dates.
            if (typeof value === "string" && (match = value.match(iso8601regex))) {

                // assume that Date.parse can parse ISO 8601 strings, or has been shimmed in older browsers to do so.
                var milliseconds = Date.parse(match[0]);

                if (!isNaN(milliseconds)) {
                    input[key] = new Date(milliseconds);
                }

            } else if (typeof value === "object") {

                parseIso8601Dates(value);
            }
        }
    }


    function parametersToFormData(parameters) {

        var fd = new FormData(),
            key,
            value;

        for (key in parameters) {

            if (!parameters.hasOwnProperty(key)) {
                continue;
            }

            value = parameters[key];

            if (typeof value === 'object') {
                objectToFormData(fd, key, value);
            } else {
                fd.append(key, value);
            }
        }

        return fd;
    }


    function objectToFormData(fd, name, obj) {

        var key,
            value;

        for (key in obj) {

            if (!obj.hasOwnProperty(key)) {
                continue;
            }

            value = obj[key];

            if(value === undefined) {
                continue;
            }

            fd.append(name + '.' + key, value);
        }
    }


    var Options = function (parseDates, fileUpload) {
        this._parseDates = !!parseDates;
        this._fileUpload = !!fileUpload;
    };

    Options.prototype.setParseDates = function (parseDates) {
        this._parseDates = !!parseDates;
    };

    Options.prototype.isParseDates = function () {
        return !!this._parseDates;
    };

    Options.prototype.setFileUpload = function (fileUpload) {
        this._fileUpload = !!fileUpload;
    };

    Options.prototype.isFileUpload = function () {
        return !!this._fileUpload;
    };


    /**
     * Execute an API request.
     *
     * @param {string} method
     * @param {string} path
     * @param {Object} parameters
     * @param {Options} options
     *
     * @returns {*}
     */
    function exec(method, path, parameters, options) {

        var o = options || new Options()
            defer = $.Deferred();

        var headers = {
            'Authorization': (userSession.getAccessToken() ? 'JWT ' + userSession.getAccessToken() : undefined)
        };

        if (o.isFileUpload()) {

            headers['Content-Type'] = undefined;

            parameters = parametersToFormData(parameters);
        }

        $.ajax({
            type: method,
            url: getURL(path),
            data: parameters,
            headers: headers

        }).done(function (data, msg, xhr) {

            if (o.isParseDates()) {
                parseIso8601Dates(data);
            }

            // resolve with the meaningful data
            defer.resolve({
                status: xhr.status,
                statusTest: xhr.statusText,
                data: data
            });

        }).fail(function (xhr) {

            var error,
                response = JSON.parse(xhr.response);

            if (response && response.error) {
                error = response.error;
            } else if (response) {
                error = response;
            }

            defer.reject({
                status: xhr.status,
                statusTest: xhr.statusText,
                error: error
            });
        });

        return defer.promise();
    }


    var api = {

        /**
         * API get request.
         *
         * @param path
         * @param parameters
         * @param options
         *
         * @returns {*}
         */
        get: function (path, parameters, options) {

            if (parameters instanceof Options) {
                options = parameters;
                parameters = undefined;
            }

            return exec('get', path, parameters, options);
        },


        /**
         * API post request.
         *
         * @param path
         * @param parameters
         * @param options
         *
         * @returns {*}
         */
        post: function (path, parameters, options) {

            return exec('post', path, parameters, options);
        },


        /**
         * API put request.
         *
         * @param path
         * @param parameters
         * @param options
         *
         * @returns {*}
         */
        put: function (path, parameters, options) {

            return exec('put', path, parameters, options);
        },


        /**
         * API delete request.
         *
         * @param path
         * @param parameters
         * @param options
         *
         * @returns {*}
         */
        delete: function (path, parameters, options) {

            return exec('delete', path, parameters, options);
        },


        /**
         *
         * @param callback
         */
        registerErrorHandler: function (callback) {

            _errorHandlers.push(callback);
        },


        /**
         *
         */
        Options: Options
    };

