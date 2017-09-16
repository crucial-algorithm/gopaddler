'use strict';

var $modal = undefined;

/**
 *
 *
 * @param $content
 * @param options
 */
function showModal($content, options) {
    if ($modal) {
        $modal.remove()
    }
    $modal = $('<div id="modal" class="dialog-overlay"></div>');

    options = options || {};

    // override background color
    if (options.color) {
        $modal.css({"background-color": options.color});
    }
    $modal.append($content);

    // check if we want to center content in page
    if (options.center === true) {
        setTimeout(function () {
            $content.center();
        }, 0);
    }
    $modal.appendTo($('body'));
    $modal.on('tap');
    return $modal;
}

function hideModal() {
    if (!$modal) return;
    $modal.remove();
    $modal = undefined;
}


function alert(title, body, btn, callback) {
    var html = [
        '<div class="info-modal-body">',
        '<div class="info-modal-title vh_height10 vh_line-height10">',  title , '</div>',
        '<div class="info-modal-content vh_height26">',
        body,
        '</div>',
        '<div class="info-modal-controls vh_height15 vh_line-height15">',
        '<div class="info-modal-primary-action">', btn, '</div>',
        '</div>',
        '</div>'
    ];

    var $body = $(html.join(''))
        , $calibrate = $body.find('.info-modal-primary-action');



    $calibrate.on('tap', function () {
        hideModal();
        if (callback) callback.apply({}, []);
    });

    showModal($body, {center: true});
}

exports.showModal = showModal;
exports.hideModal = hideModal;
exports.alert = alert;
