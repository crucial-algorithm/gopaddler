var template = require('./define.language.art.html');

function DefineLanguage(page, context) {
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
        var $li = $('li[data-option="' + current + '"]').addClass('selected');

        $li[0].scrollIntoView();

    })
}

exports.DefineLanguageView = DefineLanguage;
