var utils = require("../utils");
var GPPullToRefresh = require('../widgets/pull-to-refresh').GPPullToRefresh;



function List(page, options, context) {
    var self = this;
    self.id = "s" + utils.guid().split('-')[4];
    this.$elem = options.$elem;
    options.ptr = options.ptr || {};
    this.$elem.css("overflow", "scroll");
    self.appContext = context;
    this.disabled = false;
    self.options = options;

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
    var self = this;
    self.$ul.empty();
    self.$ul.append($rows);

    setTimeout(function () {
        self.refresh();
    }, 0);
};

List.prototype._startPullToRefresh = function () {
    var self = this;
    this.pullToRefreshInstance = new GPPullToRefresh({
        selector: "#" + self.id,
        ptr: self.options.ptr
    });
};

List.prototype.refresh = function () {
    this.iScroll = new IScroll(this.$scrollWrapper[0], {
        scrollbars: false
    });

    if (this.swipeEnabled === true) {
        Swiped.init({
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
};

List.prototype.disable = function () {
    this.disabled = true;
    this.iScroll.disable();
    if (this.pullToRefreshInstance)
        this.pullToRefreshInstance.destroy();
};

List.prototype.enable = function () {
    this.iScroll.enable();
    this.disabled = false;
    this._startPullToRefresh();
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
    this.$ul.append($row.attr('data-selector', 'row'));
    this.$ul.append($('<li style="display: none;"><div class="progress-line" style="width:1%;"></div></li>'));
    this.$ul.append($('<li style="width:1%;height:0;"></li>'));
};

List.prototype.delete = function ($button, id, callback) {
    if (this.lock[id] === true) {
        return this._cancelAction($button, id);
    }
    this._animateAction($button, id, callback || function(){});
};

List.prototype._animateAction = function ($button, id, callback) {
    var self = this;
    self.lock[id] = true;

    // add progress in order to wait for delete
    var $parent = $button.closest('li');
    var $li = $parent.next();
    var $progress = $li.find('div');
    var actionId = utils.guid();

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
            var _percent = Math.round(this.property);
            $progress.css("width", _percent + "%");
        },
        complete: function () {
            if (self.lock[id] !== true || self.progress[id].id !== actionId) return;
            $li.hide();
            $parent.removeClass('cancel');
            var result = callback.apply(self, [/* row = */ $parent, /* progress = */ $li, /*spacer = */ $li.next()]);
            var defer = $.Deferred();
            defer.then(function (success) {
                if (success !== true) return;

                $li.next().remove();
                $li.remove();
                $parent.remove();
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
    var self = this, progress = self.progress[id];
    $button.removeClass('cancel');
    $button.closest('li').removeClass('cancel');
    $button.text(progress.text);
    progress.$li.hide();
    progress.$dom.stop();
    self.lock[id] = false;
};


exports.List = List;
