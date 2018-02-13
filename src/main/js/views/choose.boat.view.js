
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

        var action = "Go kayak";
        if (option === "C")
            action = "Go canoe";

        $action.text(action);
        $action.addClass('enabled');
    });

    $action.on('click', function (e) {
        if (selected === null)
            return;

        api.User.saveBoat(selected).then(function () {
            App.load('home');
        }).fail(function () {
            var title = 'Could not store boat setting';
            var text = '<p>Please try again later.</p><h6 style="text-align: center">Make sure you are connected to the internet.</h6>';
            context.ui.modal.alert(title, text, {text: "ok"})
        })
    })
}

exports.ChooseBoatView = ChooseBoatView;
