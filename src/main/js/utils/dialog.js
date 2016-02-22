'use strict';

var $modal = undefined;

/**
 *
 *
 * @param $content
 * @param color override backdrop color
 */
function showModal($content, color) {
    if ($modal) {
        $modal.remove()
    }
    $modal = $('<div id="modal" class="dialog-overlay"></div>');
    if (color) {
        $modal.css({"background-color": color});
    }
    $modal.append($content);
    $modal.appendTo($('body'));


}

function hideModal() {
    $modal.remove();
    $modal = undefined;
}

exports.showModal = showModal;
exports.hideModal = hideModal;