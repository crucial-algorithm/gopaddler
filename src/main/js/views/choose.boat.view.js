import Context from '../context';
import Api from '../server/api';
import template from './choose.boat.art.html';

class ChooseBoatView {
    constructor(page, context) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));

        let $page = $(page), selected = null, running = false;
        $page.on('click', function (e) {
            if (running) return;
            running = true;
            let $target = $(e.target);
            let option = $target.data('option');
            if (!option) return;

            $('[data-option]').removeClass('selected');
            $target.addClass('selected');

            $('.choose-boat-progress').addClass('running-progress');

            selected = option;

            Api.User.saveBoat(selected).then(function () {
                running = false;
                App.load('home');
                $('.choose-boat-progress').removeClass('running-progress');
            }).fail(function () {
                running = false;
                $('.choose-boat-progress').removeClass('running-progress');
                let title = context.translate('choose_boat_failed_title');
                let text = '<p>' + context.translate('choose_boat_failed_retry') + '</p><h6 style="text-align: center">' + context.translate('choose_boat_failed_check_internet') + '</h6>';
                context.ui.modal.alert(title, text, {text: context.translate('choose_boat_failed_acknowledge')})
            })
        });
    }
}

export default ChooseBoatView;
