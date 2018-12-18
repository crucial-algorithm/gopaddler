var init = function () {
    window.analytics.startTrackerWithId('UA-73212702-1');
    Appsee.start("c998921766404df5862fee35b9272896");
};


var view = function (name) {
    window.analytics.trackView(name);
    Appsee.startScreen(name);
};

var user = function (id) {
    window.analytics.setUserId(id);
};


exports.init = init;
exports.setView = view;
exports.setUser = user;
