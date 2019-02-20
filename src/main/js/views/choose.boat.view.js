
var api = require('../server/api');
var template = require('./choose.boat.art.html');

function ChooseBoatView(page, context) {
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));

    var $page = $(page);
    var $action = $page.find('.choose-boat-actions');
    var selected = null;
    $page.on('click', function (e) {
        var $target = $(e.target);
        var option = $target.data('option');
        if (!option) return;

        $('[data-option]').removeClass('selected');
        $target.addClass('selected');

        selected = option;

        var action = context.translate('choose_boat_option_k1');
        if (option === "C")
            action = context.translate('choose_boat_option_c1');

        $action.text(action);
        $action.addClass('enabled');
    });

    $action.on('click', function (e) {
        if (selected === null)
            return;

        api.User.saveBoat(selected).then(function () {
            App.load('home');
        }).fail(function () {
            var title = context.translate('choose_boat_failed_title');
            var text = '<p>' + context.translate('choose_boat_failed_retry') + '</p><h6 style="text-align: center">' + context.translate('choose_boat_failed_check_internet') + '</h6>';
            context.ui.modal.alert(title, text, {text: context.translate('choose_boat_failed_acknowledge')})
        })
    })
}

exports.ChooseBoatView = ChooseBoatView;
