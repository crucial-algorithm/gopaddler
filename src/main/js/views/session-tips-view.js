'use strict';


function SessionTipsView(page, context) {
    var $page = $(page)
        , $content = $page.find('[data-selector="slick"]')
        , $gotIt = $page.find('.got-it');

    setTimeout(function () {
        $content.slick({
            dots: true,
            speed: 300,
            infinite: false,
            arrows: false
        });
    }, 0);

    $gotIt.on('tap', function () {
        // store that we have shown the tutorial to the user
        context.preferences().touchGesturesShown();

        // navigate directly so it works in browser in dev mode
        App.destroyStack();
        App.load('session');
    });
}

exports.SessionTipsView = SessionTipsView;