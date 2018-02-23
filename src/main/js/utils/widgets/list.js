var utils = require("../utils");

function List(page, options) {
    var self = this;
    var id = "s" + utils.guid().split('-')[4];
    this.$elem = options.$elem;
    options.ptr = options.ptr || {};
    this.$elem.css("overflow", "scroll");

    this.$elem.append($([
        '<div id=' + id + '/>',
        '<div data-selector="scroll-wrapper" style="position: relative;overflow: scroll;height: ' + this.$elem.height() + 'px">',
        '    <ul class="list-widget">',
        '        <li><empty></li>',
        '    </ul>',
        '</div>'
    ].join('')));

    this.$ul = this.$elem.find('ul');
    this.$scrollWrapper = this.$elem.find('[data-selector="scroll-wrapper"]');

    var pullToRefreshInstance = PullToRefresh.init({
        mainElement: "#" + id,
        getStyles: function () {
            return ".__PREFIX__ptr {\n pointer-events: none;\n  font-size: 0.85em;\n  font-weight: bold;\n  top: 0;\n  height: 0;\n  transition: height 0.3s, min-height 0.3s;\n  text-align: center;\n  width: 100%;\n  overflow: hidden;\n  display: flex;\n  align-items: flex-end;\n  align-content: stretch;\n}\n.__PREFIX__box {\n  padding: 10px;\n  flex-basis: 100%;\n}\n.__PREFIX__pull {\n  transition: none;\n}\n.__PREFIX__text {\n  margin-top: .33em;\n  color: rgba(0, 0, 0, 0.3);\n}\n.__PREFIX__icon {\n  color: rgba(0, 0, 0, 0.3);\n  transition: transform .3s;\n}\n.__PREFIX__release .__PREFIX__icon {\n  transform: rotate(180deg);\n}";
        },
        instructionsPullToRefresh: options.ptr.label,
        instructionsReleaseToRefresh: options.ptr.release,
        instructionsRefreshing: options.ptr.refreshing,
        isBlock: function () {
            if (options.ptr.disabled === true) return true;
            var $li = self.$ul.children().first();
            if (!$li) {
                return true;
            }
            return $li.position().top < 0;
        },
        onRefresh: options.ptr.onRefresh,
        refreshTimeout: 300
    });

    if (options.swipe === true) {
        this.swipeEnabled = true;
        this.swipeActionsSelector = options.swipeSelector;
    }

    $(page).on('appBeforeBack', function () {
        if (pullToRefreshInstance)
            pullToRefreshInstance.destroy();
    });
}

List.prototype.rows = function($rows) {
    var self = this;
    self.$ul.empty();
    self.$ul.append($rows);

    setTimeout(function () {
        self.refresh();
    }, 0);
};

List.prototype.refresh = function () {
    new IScroll(this.$scrollWrapper[0], {
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

List.prototype.appendRow = function ($row, stripped) {
    if (stripped === true)
        this.$ul.append($row);
    else
        this.$ul.append($row.attr('data-selector', 'row'));
};

exports.List = List;
