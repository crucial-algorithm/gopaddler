import AppSettings from "../utils/app-settings";

export default class SessionViewCollectMetricsBackground {
    /**
     *
     * @param {Context} context
     */
    constructor(context) {
        this._context = context;
        this._configured = false;
        this._listenersRegistered = false;
        this._isAppInBackground = false;
    }

    setup() {

        if (this.configured === false) {
            BackgroundGeolocation.configure({
                locationProvider: BackgroundGeolocation.RAW_PROVIDER,
                desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
                notificationTitle: AppSettings.applicationName(),
                notificationText: '',
                debug: false,
                interval: 1000,
                fastestInterval: 1000,
                activitiesInterval: 1000
            });
            this.configured = true;
        }

        if (this.listenersRegistered === false) {
            this.startListeners();
            this.listenersRegistered = true;
        }
    }

    start() {
        this.setup();

        BackgroundGeolocation.start();
        BackgroundGeolocation.checkStatus(function(status) {
            console.log('[INFO] BackgroundGeolocation service is running', status.isRunning);
            console.log('[INFO] BackgroundGeolocation services enabled', status.locationServicesEnabled);
            console.log('[INFO] BackgroundGeolocation auth status: ' + status.authorization);

            // you don't need to check status before start (this is just the example)
            if (!status.isRunning) {
                BackgroundGeolocation.start(); //triggers start on start event
            }
        });
    }

    stop() {
        BackgroundGeolocation.stop();
        this.stopListeners();
    }

    onLocationChanged(callback) {
        const self = this;
        BackgroundGeolocation.on('location', function(location) {
            // handle your locations here
            console.log('caught location', location, '; Is app in background?', self.isAppInBackground);
            const position = {
                coords: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    altitude: location.altitude,
                    accuracy: location.accuracy,
                    altitudeAccuracy: null,
                    heading: location.bearing,
                    speed: location.speed,

                },
                timestamp: location.time
            }
            if (self.isAppInBackground)
                callback.apply({}, [position]);
        });
    }

    updateNotificationText(text) {
        BackgroundGeolocation.configure({
            notificationText: text
        })
    }

    /**
     * @private
     */
    startListeners() {
        const self = this;
        BackgroundGeolocation.on('error', function(error) {
            console.log('[ERROR] BackgroundGeolocation error:', error.code, error.message);
        });

        BackgroundGeolocation.on('start', function() {
            console.log('[INFO] BackgroundGeolocation service has been started');
        });

        BackgroundGeolocation.on('stop', function() {
            console.log('[INFO] BackgroundGeolocation service has been stopped');
        });

        BackgroundGeolocation.on('background', function() {
            console.log('[INFO] App is in background');
            self.isAppInBackground = true;
        });

        BackgroundGeolocation.on('foreground', function() {
            console.log('[INFO] App is in foreground');
            self.isAppInBackground = false;
        });

        BackgroundGeolocation.on('authorization', function(status) {
            console.log('[INFO] BackgroundGeolocation authorization status: ' + status);
            if (status !== BackgroundGeolocation.AUTHORIZED) {
                // we need to set delay or otherwise alert may not be shown
                setTimeout(function() {
                    let showSettings = confirm('App requires location tracking permission. Would you like to open app settings?');
                    if (showSettings) {
                        return BackgroundGeolocation.showAppSettings();
                    }
                }, 1000);
            }
        });
    }

    /**
     * @private
     */
    stopListeners() {
        BackgroundGeolocation.removeAllListeners();
        this.listenersRegistered = false;
    }


    get context() {
        return this._context;
    }

    set context(value) {
        this._context = value;
    }

    get configured() {
        return this._configured;
    }

    set configured(value) {
        this._configured = value;
    }

    get listenersRegistered() {
        return this._listenersRegistered;
    }

    set listenersRegistered(value) {
        this._listenersRegistered = value;
    }

    get isAppInBackground() {
        return this._isAppInBackground;
    }

    set isAppInBackground(value) {
        this._isAppInBackground = value;
    }
}