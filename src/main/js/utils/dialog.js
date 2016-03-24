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
}

function hideModal() {
    $modal.remove();
    $modal = undefined;
}

exports.showModal = showModal;
exports.hideModal = hideModal;