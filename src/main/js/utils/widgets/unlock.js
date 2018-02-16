var Dragdealer = require('dragdealer');

var TEMPLATE = [
    '    <div id="pause-slide" class="dragdealer session-slide-to-unlock">',
    '        <div class="session-slide-to-unlock-handle handle">',
    '            <div class="session-slide-to-unlock-handle-text">',
    '                <i class="fas fa-angle-right"></i>&nbsp;slide to unlock',
    '            </div>',
    '        </div>',
    '    </div>'
].join(' ');


function Unlock() {
    this.showing = false;
    this.lockHandledAt = null;
    this.inDrag = false;
    this.$dom = null;
    this.intervalID = null;
    this.unlocked = function(){};
}
Unlock.prototype.init = function () {
    this.$dom = $(TEMPLATE);
    $('body').append(this.$dom);
};

Unlock.prototype.show = function () {
    var self = this;

    if (self.showing === true) {
        return;
    }

    self.$dom = $(TEMPLATE).appendTo($('.app-content'));
    self.lockHandledAt = new Date().getTime();
    self.showing = true;

    new Dragdealer('pause-slide', {
        x: 1,
        steps: 2,
        loose: true,
        callback: function (x, y) {
            if (x) {
                return;
            }

            self.hide();
            self.unlocked.apply({}, []);
        },

        dragStartCallback: function () {
            self.inDrag = true;
        },

        dragStopCallback: function () {
            self.inDrag = false;
            self.lockHandledAt = new Date().getTime();
        }
    });

    self.intervalID = setInterval(function () {
        if (self.showing === false) {
            return;
        }

        if (self.inDrag === true) {
            return;
        }

        if (new Date().getTime() - self.lockHandledAt > 3000) {
            self.hide();
        }
    }, 1034)

};

Unlock.prototype.hide = function () {
    var self = this;
    this.$dom.fadeOut(function () {
        self.$dom.remove();
        clearInterval(self.intervalID);
        self.showing = false;
    })
};

Unlock.prototype.onUnlocked = function (callback) {
    this.unlocked = callback;
};


exports.Unlock = Unlock;
