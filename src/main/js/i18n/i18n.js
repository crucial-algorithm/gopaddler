
import BASE_PT from "./pt";
import BASE_EN from "./en";
import UTTER_CYCLING_PT from "./utter-cycling/pt";
import UTTER_CYCLING_EN from "./utter-cycling/en";
import AppSettings from "../utils/app-settings";



let LANGUAGE = localStorage.getItem('language') || 'en';

let TRANSLATIONS = {
    en: BASE_EN,
    pt: BASE_PT
};

const UTTER_CYCLING = {
    en: UTTER_CYCLING_EN,
    pt: UTTER_CYCLING_PT
};

class i18n {

    /**
     *
     * @param {string}      key
     * @param {Array<*>}    placeholders
     * @return {string}
     */
    static translate(key, placeholders) {
        let text = TRANSLATIONS[LANGUAGE].translations[key] || "";
        placeholders = placeholders || [];
        let i = 1;
        for (let p = 0, l = placeholders.length; p < l; p++) {
            let placeholder = placeholders[p];
            text = text.replace(new RegExp("\\$" + i, "g"), placeholder);
            i++;
        }
        return text;
    }

    static language() {
        return LANGUAGE;
    }

    /**
     * @private
     * Init translations
     */
    static setup() {
        AppSettings.switch(() => {
            // intentionally left blank

        }, () => {
            TRANSLATIONS.pt.translations = i18n.override(TRANSLATIONS.pt.translations, UTTER_CYCLING.pt.translations);
            TRANSLATIONS.en.translations = i18n.override(TRANSLATIONS.en.translations, UTTER_CYCLING.en.translations);
        });
    }

    /**
     * @private
     * @param {Object} base
     * @param {Object} specific
     * @return {Object}
     */
    static override(base, specific) {
        for (const property in specific) {
            base[property] = specific[property];
        }
        return base;
    }
}

i18n.setup();

export default i18n;