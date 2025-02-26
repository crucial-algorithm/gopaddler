'use static';

import Context from '../context';
import Api from '../server/api';
import template from './strava.art.html';
import AppSettings from "../utils/app-settings";

class StravaView {

    /**
     *
     * @param page
     * @param {Context} context
     */
    constructor(page, context) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()
            , isLandscapeMode: !context.isPortraitMode()
            , isConnected: Api.User.hasStrava()
            , connectedTo: context.translate('strava_connected_has', [Api.User.stravaAthleteName()])
        }));
        const self = this;
        page.onReady.then(function () {
            self.onRendered(self.$page, context);
        });

        context.listenToUserConnectingToStrava((payload) => {
            $('.strava-user-connected').text(context.translate('strava_connected_has', [payload.name]));
            $('.strava-full-window').addClass('strava-connected');
        });
    }

    onRendered() {
        $('.strava-button-connect').on('tap', function () {
            Api.Auth.createAppAuthToken().then((token) => {
                let web = __WEB_URL__;
                window.open(`${web}/strava/connect/${AppSettings.app()}/${token}`, '_system');
            })
        });

        $('.strava-button-disconnect').on('tap', function () {
            Api.Auth.stravaDisconnect().then((success) => {
                console.log('disconnected? ', success);
                Api.User.setStravaDisconnected();
                $('.strava-full-window').removeClass('strava-connected');
            })
        });
    }
}

export default StravaView;
