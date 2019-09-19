'use strict';

import template from './dialog.art.html';

let Utils = require('../utils');

let $modal = undefined;
let modal = undefined;

class Dialog {
    
    static _render(isPortraitMode, undecorated, title, message, primary, secondary, center) {
        let id = Utils.guid();
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

        let $modal = $('#' + id);

        if (center === true) {
            setTimeout(function () {
                $modal.find('.info-modal-body').center();
            }, 0);
        }

        let $primary = $modal.find('[data-selector="modal-primary"]');
        let $secondary = $modal.find('[data-selector="modal-secondary"]');

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
    
    static hideModal() {
        if (!$modal) return;
        $modal.remove();
        $modal = undefined;
    }
    
    static alert(isPortraitMode, title, message, primary) {
        let btn = primary;
        if (typeof primary === "string") {
            btn = {
                text: primary,
                callback: function(){}
            }
        }

        let btnPrimary = {
            text: btn.text,
            callback: function () {
                let result = true;
                if (btn.callback)
                    result = btn.callback.apply({});

                if (result !== false && modal) {
                    modal.hide()
                }
            }
        };

        modal = Dialog._render(isPortraitMode, false, title, message, btnPrimary, null, true);
        return modal;
    }
    
    static confirm(isPortraitMode, title, message, primary, secondary) {
        let btnPrimary = {
            text: primary.text,
            callback: function () {
                let result = primary.callback.apply({});
                if (result !== false && modal) {
                    modal.hide()
                }
            }
        };

        let btnSecondary = {
            text: secondary.text,
            callback: function () {
                let result = secondary.callback.apply({});
                if (result !== false && modal) {
                    modal.hide()
                }
            }
        };
        modal = Dialog._render(isPortraitMode, false, title, message, btnPrimary, btnSecondary, true);
        return modal;
    }
    
    static undecorated(isPortraitMode, $content) {
        let modal = Dialog._render(isPortraitMode, true, null, $content, null, null, false);
        $modal = modal.$modal;
        return modal;
    }
    
    static hide() {
        if (!modal) return;
        modal.hide();
    }
}

export default Dialog;
