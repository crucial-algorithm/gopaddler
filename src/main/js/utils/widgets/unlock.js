'use strict';

import Dragdealer from 'dragdealer';

class Unlock {

    constructor(context) {
        this.showing = false;
        this.lockHandledAt = null;
        this.inDrag = false;
        this.$dom = null;
        this.intervalID = null;
        this.unlocked = function(){};
        this.TEMPLATE = [
            '    <div id="pause-slide" class="dragdealer session-slide-to-unlock">',
            '        <div class="session-slide-to-unlock-handle handle">',
            '            <div class="session-slide-to-unlock-handle-text">',
            '                <i class="fas fa-angle-right"></i>&nbsp;{session_unlock}',
            '            </div>',
            '        </div>',
            '    </div>'
        ].join(' ').replace('{session_unlock}', context.translate("session_unlock"));
    }

    init() {
        this.$dom = $(this.TEMPLATE);
        $('body').append(this.$dom);
    }

    show(duration) {
        var self = this;

        duration = isNaN(parseInt(duration))? 3000 : parseInt(duration);

        if (self.showing === true) {
            return;
        }

        self.$dom = $(this.TEMPLATE).appendTo($('.app-content'));
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

            if (new Date().getTime() - self.lockHandledAt > duration) {
                self.hide();
            }
        }, 1034)

    }

    hide() {
        var self = this;
        this.$dom.fadeOut(function () {
            self.$dom.remove();
            clearInterval(self.intervalID);
            self.showing = false;
        })
    }

    onUnlocked(callback) {
        this.unlocked = callback;
    }
}

export default Unlock;
