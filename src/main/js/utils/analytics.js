import Utils from './utils';


let userName = "John Doe";
class Analytics {

    static init() {
        //    window.analytics.startTrackerWithId('UA-73212702-1');
    }

    static setView(viewName) {
        //    window.analytics.trackView(name);
        Utils.usage(userName, 'navigated to ' + viewName);
    }

    static setUser(user) {
//    window.analytics.setUserId(id);
        try {
            userName = user.profile.name;
        } catch(err) {

        }
    }
}

export default Analytics;
