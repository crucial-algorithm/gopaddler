
var api = require('../server/api');
var template = require('./choose.boat.art.html');

function ChooseBoatView(page, context) {
    context.render(page, template({isPortraitMode: context.isPortraitMode()}));

    var $page = $(page);
    var selected = null;
    $page.on('click', function (e) {
        var $target = $(e.target);
        var option = $target.data('option');
        if (!option) return;

        $('[data-option]').removeClass('selected');
        $target.addClass('selected');

        selected = option;

        api.User.saveBoat(selected).then(function () {
            App.load('home');
        }).fail(function () {
            var title = context.translate('choose_boat_failed_title');
            var text = '<p>' + context.translate('choose_boat_failed_retry') + '</p><h6 style="text-align: center">' + context.translate('choose_boat_failed_check_internet') + '</h6>';
            context.ui.modal.alert(title, text, {text: context.translate('choose_boat_failed_acknowledge')})
        })
    });
}

exports.ChooseBoatView = ChooseBoatView;
