'use strict';
var template = require('./dialog.art.html');
var Utils = require('../utils');

var $modal = undefined;
var modal = undefined;

function render(isPortraitMode, undecorated, title, message, primary, secondary, center) {
    var id = Utils.guid();
    $('body').append(template({
        id: id,
        isPortraitMode: isPortraitMode,
        undecorated: undecorated === true,
        title: title,
        content: message,
        primary: primary ? primary.text: null,
        hasSecondary: secondary !== null,
        secondary: secondary ? secondary.text : null
    }));

    var $modal = $('#' + id);

    if (center === true) {
        setTimeout(function () {
            $modal.find('.info-modal-body').center();
        }, 0);
    }

    var $primary = $modal.find('[data-selector="modal-primary"]');
    var $secondary = $modal.find('[data-selector="modal-secondary"]');

    $primary.off('tap click').on('tap click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (!primary)
            return;

        primary.callback = primary.callback || function(){};
        primary.callback.apply({},[]);
    });

    $secondary.off('tap click').on('tap click', function (e) {
        e.stopPropagation();
        e.preventDefault();

        if (!secondary)
            return;

        secondary.callback = secondary.callback || function(){};
        secondary.callback.apply({},[]);
    });

    return {
        $modal: $modal,
        hide: function () {
            $modal.remove();
        },

        on: function (event, context, callback) {
            $modal.on(event, context, callback)

        }
    }
}

function hideModal() {
    if (!$modal) return;
    $modal.remove();
    $modal = undefined;
}

function undecorated(isPortraitMode, $content) {
    var modal = render(isPortraitMode, true, null, $content, null, null, false);
    $modal = modal.$modal;
    return modal;
}

function hide() {
    if (!modal) return;
    modal.hide();
}

function alert(isPortraitMode, title, message, primary) {
    var btn = primary;
    if (typeof primary === "string") {
        btn = {
            text: primary,
            callback: function(){}
        }
    }

    var btnPrimary = {
        text: btn.text,
        callback: function () {
            var result = true;
            if (btn.callback)
                result = btn.callback.apply({});

            if (result !== false && modal) {
                modal.hide()
            }
        }
    };

    modal = render(isPortraitMode, false, title, message, btnPrimary, null, true);
    return modal;
}

function confirm(isPortraitMode, title, message, primary, secondary) {
    var btnPrimary = {
        text: primary.text,
        callback: function () {
            var result = primary.callback.apply({});
            if (result !== false && modal) {
                modal.hide()
            }
        }
    };

    var btnSecondary = {
        text: secondary.text,
        callback: function () {
            var result = secondary.callback.apply({});
            if (result !== false && modal) {
                modal.hide()
            }
        }
    };
    modal = render(isPortraitMode, false, title, message, btnPrimary, btnSecondary, true);
    return modal;
}

exports.hideModal = hideModal;
exports.alert = alert;
exports.confirm = confirm;
exports.undecorated = undecorated;
exports.hide = hide;
