var Utils = require('./utils');

var init = function () {
//    window.analytics.startTrackerWithId('UA-73212702-1');
};
var userName = "John Doe";

var view = function (viewName) {
//    window.analytics.trackView(name);
    Utils.usage(username, 'navigated to ' + viewName);
};

var user = function (user) {
//    window.analytics.setUserId(id);
    try {
        userName = user.profile.name;
    } catch(err) {

    }
};


exports.init = init;
exports.setView = view;
exports.setUser = user;
