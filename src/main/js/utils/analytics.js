var init = function () {
//    window.analytics.startTrackerWithId('UA-73212702-1');
};


var view = function (name) {
//    window.analytics.trackView(name);
};

var user = function (id) {
//    window.analytics.setUserId(id);
};


exports.init = init;
exports.setView = view;
exports.setUser = user;
