var template = require('./manage.coach.art.html')
    , rowTemplate = require('./manage.coach.row.art.html')
    , List = require('../utils/widgets/list').List;

function ManageCoachView(page, context) {
    var self = this;
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));
    var current = context.getLanguage();

    var $page = $(page);
    var selected = current;
    var changed = false;
    $page.on('click', 'li', function (e) {
        var $target = $(e.target);
        var option = $target.data('option');

        $('li').removeClass('selected');
        $target.addClass('selected');

        selected = option;
        changed = true;
    });

    $page.on('appBeforeBack', function () {
        if (!changed || current === selected) return;

        context.ui.modal.alert(context.translate('choose_language_restart_app_title')
            ,  '<p>' + context.translate('choose_language_restart_app_message') + '</p>'
            , {text: context.translate('choose_language_restart_app_acknowledge')}
            );

        localStorage.setItem('language', selected);
        context.setLanguage(selected);
    });

    page.onShown.then(function () {
        self.$list = $('.coach-list');
        self.render(page);
    })
}

ManageCoachView.prototype.render = function (page) {
    var self = this;
    self.$list.show();

    self.list = new List(page, {
        $elem: self.$list,
        swipe: true,
        swipeSelector: '.coach-list-row-actions',
        ptr: {
            disabled: true,
            onRefresh: function () {}
        }
    });
    self.list.clear();

    // var $row = $(rowTemplate({
    //     coach: "Leonel Correia",
    //     id: "123131",
    //     since: moment(new Date()).format('YYYY-MM-DD')
    // }));

//    self.list.appendRow($row, false);
//    self.list.refresh();

};

exports.ManageCoachView = ManageCoachView;
