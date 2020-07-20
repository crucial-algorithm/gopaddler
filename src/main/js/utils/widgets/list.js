'use strict';
import Utils from '../utils';
import GPPullToRefresh from '../widgets/pull-to-refresh';



function List(page, options, context) {
    let self = this;
    self.id = "s" + Utils.guid().split('-')[4];
    this.$elem = options.$elem;
    options.ptr = options.ptr || {};
    this.$elem.css("overflow", "scroll");
    self.appContext = context;
    this.disabled = false;
    self.options = options;
    self.swipedGroup = null;

    this.$elem.append($([
        '<div id=' + self.id + '/>',
        '<div data-selector="scroll-wrapper" style="position: relative;overflow: scroll;height: ' + this.$elem.height() + 'px">',
        '    <ul class="list-widget">',
        '        <li><empty></li>',
        '    </ul>',
        '</div>'
    ].join('')));

    this.$ul = this.$elem.find('ul');
    this.$scrollWrapper = this.$elem.find('[data-selector="scroll-wrapper"]');

    self._startPullToRefresh();

    if (options.swipe === true) {
        this.swipeEnabled = true;
        this.swipeActionsSelector = options.swipeSelector;
    }

    self.progress = {};
    self.lock = {};

}

List.prototype.rows = function($rows) {
    let self = this;
    self.$ul.empty();
    self.$ul.append($rows);

    setTimeout(function () {
        self.refresh();
    }, 0);
};

List.prototype._startPullToRefresh = function () {
    let self = this;
    this.pullToRefreshInstance = new GPPullToRefresh({
        selector: "#" + self.id,
        ptr: self.options.ptr,
        isBlock: function () {
            if (self.options.ptr.disabled === true) return true;
            let $li = self.$ul.children().first();
            if (!$li) {
                return true;
            }
            return $li.position().top < 0;
        }
    });
};

List.prototype.refresh = function () {
    let self = this;
    this.iScroll = new IScroll(this.$scrollWrapper[0], {
        scrollbars: false
    });

    if (this.swipeEnabled === true) {
        self.swipedGroup = Swiped.init({
            query: '[data-selector="row"]',
            list: true,
            left: 0,
            right: $(this.swipeActionsSelector).width()
        });
    }
};

List.prototype.clear = function () {
    this.$ul.empty();
};

List.prototype.destroy = function () {
    if (this.pullToRefreshInstance)
        this.pullToRefreshInstance.destroy();
    this.$elem.empty();
    destroySwiped(this.swipedGroup);
};

List.prototype.disable = function () {
    this.disabled = true;
    this.iScroll.disable();
    if (this.pullToRefreshInstance)
        this.pullToRefreshInstance.destroy();
    destroySwiped(this.swipedGroup);
};

List.prototype.enable = function () {
    console.log('called enable in swipped group');
    this.iScroll.enable();
    this.disabled = false;
    this._startPullToRefresh();

    if (this.swipeEnabled === true) {
        this.swipedGroup = Swiped.init({
            query: '[data-selector="row"]',
            list: true,
            left: 0,
            right: $(this.swipeActionsSelector).width()
        });
    }
};


/**
 * @deprecated by newRow (handles confirm delete auto of the box)
 * @param $row
 * @param stripped
 */
List.prototype.appendRow = function ($row, stripped) {
    if (stripped === true)
        this.$ul.append($row);
    else
        this.$ul.append($row.attr('data-selector', 'row'));
};


/**
 * New method for appendRow that also adds the progress li for row actions confirm
 * @param $row
 */
List.prototype.newRow = function ($row) {
    const self = this;
    this.$ul.append($row.attr('data-selector', 'row'));
    this.$ul.append($(`<li class="${self.options.progressLineCustomClass}" style="display: none;"><div class="progress-line" style="width:1%;"></div></li>`));
    this.$ul.append($('<li style="width:1%;height:0;"></li>'));
};

List.prototype.delete = function ($button, id, callback) {
    if (this.lock[id] === true) {
        return this._cancelAction($button, id);
    }
    this._animateAction($button, id, callback || function(){});
};

List.prototype._animateAction = function ($button, id, callback) {
    let self = this;
    self.lock[id] = true;

    // add progress in order to wait for delete
    let $parent = $button.closest('li');
    let $li = $parent.next();
    let $progress = $li.find('div');
    let actionId = Utils.guid();

    self.progress[id] = {$dom: $progress, $li: $li, start: new Date().getTime(), id: actionId, text: $button.text()};

    $button.addClass('cancel');
    $parent.addClass('cancel');
    $button.text(self.appContext.translate('cancel'));
    $li.show();
    $progress.css("width", "1%");


    $({
        property: 0
    }).animate({
        property: 100
    }, {
        duration: 5000,
        step: function () {
            let _percent = Math.round(this.property);
            $progress.css("width", _percent + "%");
        },
        complete: function () {
            if (self.lock[id] !== true || self.progress[id].id !== actionId) return;
            $li.hide();
            $parent.removeClass('cancel');
            let result = callback.apply(self, [/* row = */ $parent, /* progress = */ $li, /*spacer = */ $li.next()]);
            let defer = $.Deferred();
            defer.then(function (success) {
                if (success !== true) return;

                if (self.options.keepDomOnDelete === true) {
                    $parent.addClass('deleted').removeAttr('style');
                } else {
                    $li.next().remove();
                    $li.remove();
                    $parent.remove();
                }
            });

            if (result === undefined) {
                return defer.resolve(true);
            }

            if (typeof result === "boolean") {
                // implementation of common behaviour of returning true to stop execution chain
                return defer.resolve(result === true)
            }

            if (typeof result.then === "function") {
                result.then(function (result) {
                    if (result) return defer.resolve(result === true);
                    defer.resolve(true);
                });
            }
        }
    });
};

List.prototype._cancelAction = function($button, id) {
    let self = this, progress = self.progress[id];
    $button.removeClass('cancel');
    $button.closest('li').removeClass('cancel');
    $button.text(progress.text);
    progress.$li.hide();
    progress.$dom.stop();
    self.lock[id] = false;
};

function destroySwiped(swipedGroup) {
    if (!swipedGroup) return;

    if (Array.isArray(swipedGroup)) {
        swipedGroup.map(function (r) {
            r.destroy()
        });
    } else {
        swipedGroup.destroy();
    }
}


export default List;
