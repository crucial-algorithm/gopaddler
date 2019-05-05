var Utils = require('../utils');


function GPPullToRefresh(options) {
    this.id = Utils.guid();
    this.destroyed = false;

    this.instance = PullToRefresh.init({
        mainElement: options.selector,
        getStyles: function () {
            return ".__PREFIX__ptr {\n pointer-events: none;\n  font-size: 0.85em;\n  font-weight: bold;\n  top: 0;\n  height: 0;\n  transition: height 0.3s, min-height 0.3s;\n  text-align: center;\n  width: 100%;\n  overflow: hidden;\n  display: flex;\n  align-items: flex-end;\n  align-content: stretch;\n}\n.__PREFIX__box {\n  padding: 10px;\n  flex-basis: 100%;\n}\n.__PREFIX__pull {\n  transition: none;\n}\n.__PREFIX__text {\n  margin-top: .33em;\n  color: rgba(0, 0, 0, 0.3);\n}\n.__PREFIX__icon {\n  color: rgba(0, 0, 0, 0.3);\n  transition: transform .3s;\n}\n.__PREFIX__release .__PREFIX__icon {\n  transform: rotate(180deg);\n}";
        },
        instructionsPullToRefresh: options.ptr.label,
        instructionsReleaseToRefresh: options.ptr.release,
        instructionsRefreshing: options.ptr.refreshing,
        isBlock: options.isBlock,
        onRefresh: options.ptr.onRefresh,
        refreshTimeout: 300
    });

    console.debug('created instance of pulltorefresh with id ', this.id);
}

GPPullToRefresh.prototype.destroy = function() {
    var self = this;
    if (self.destroyed === true) {
        console.error('Attempt to destroy already destroyed instance ', self.id);
        return;
    }

    self.instance.destroy();
    self.destroyed = true;
    self.instance = {
        destroy: function () {
            console.error('Uncontrolled attempt to destroy already destroyed instance ', self.id);
        }
    };
    console.debug('Destroyed instance ', self.id);
};


exports.GPPullToRefresh = GPPullToRefresh;