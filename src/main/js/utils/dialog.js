'use strict';

var $modal = undefined;

function showModal($content) {
    if ($modal) {
        $modal.remove()
    }
    $modal = $('<div id="modal" class="dialog-overlay"></div>');
    $modal.append($content);
    $modal.appendTo($('body'));


}

function hideModal() {
    $modal.remove();
    $modal = undefined;
}

exports.showModal = showModal;
exports.hideModal = hideModal;