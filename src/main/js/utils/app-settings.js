/**
 * @typedef {Object} AppConfig
 * @property {number} distanceStep
 * @property {{name: string, location: number}} database
 * @property {string} sessionType
 *
 */

/**@type AppConfig */
const SETTINGS = __APP_CONFIG__;
const APP = __APP__;

export default class AppSettings {
    static types() {
        return {GOPADDLER: 'gopaddler', UTTER_CYCLING: 'uttercycling'}
    }

    /**
     *
     * @param {function} gopaddler
     * @param {function} uttercycling
     * @return {undefined}
     */
    static switch(gopaddler, uttercycling) {
        if (APP === AppSettings.types().GOPADDLER) {
            return gopaddler.apply({}, []);
        }

        if (APP === AppSettings.types().UTTER_CYCLING) {
            return uttercycling.apply({}, []);
        }

        throw 'unknown app configuration - check your package.json and webpack.config.js - ' + app;
    }

    /**
     * Returns the app type we are in
     * @return {string} "gopaddler" or "uttercycling"
     */
    static app() {
        return APP;
    }

    static isShowOnboarding() {
        return AppSettings.app() === AppSettings.types().GOPADDLER;
    }

    static isShowCalibrationTips() {
        return AppSettings.app() === AppSettings.types().GOPADDLER;
    }

    static isPortraitModeDefault() {
        return AppSettings.app() === AppSettings.types().GOPADDLER;
    }

    static requiresCalibration() {
        return AppSettings.app() === AppSettings.types().GOPADDLER;
    }

    static distanceStep() {
        return SETTINGS.distanceStep;
    }

    static databaseName() {
        return SETTINGS.database.name
    }

    static databaseLocation() {
        return SETTINGS.database.location
    }

    static sessionType() {
        return SETTINGS.sessionType;
    }

    static applicationName() {
        if (APP === AppSettings.types().GOPADDLER) {
            return 'GoPaddler';
        }

        if (APP === AppSettings.types().UTTER_CYCLING) {
            return 'Utter Cycling';
        }
    }
}