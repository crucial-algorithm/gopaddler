'use strict';

import Context from '../context';
import Api from '../server/api';
import template from './profile.art.html';

export default class ProfileView {
    /**
     *
     * @param page
     * @param {Context} context
     */
    constructor(page, context) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()
            , name: Api.User.getName()
            , email: Api.User.getProfile().email
        }));

        const self = this;
        page.onReady.then(function () {
            self.render($(page), context)
        });
    }

    /**
     *
     * @param {jQuery} $page
     * @param {Context} context
     */
    render($page, context) {
        const $name = $page.find('#name'), $email = $page.find('#email');
        let name = Api.User.getName() || null;
        let email = Api.User.getProfile().email || null;

        $page.find('#update').off('tap').on('tap', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();

            let isNameChanged = name !== Api.User.getName();
            let isEmailChanged = email !== Api.User.getProfile().email;

            if (isNameChanged === false && isEmailChanged === false) {
                return App.back()
            }

            Api.User.updateUserProfile(name, email).then(function (x) {
                App.back();
            }).fail(function (err) {
                console.error(err);
            });
        });

        $name.on('change', function () {
            name = $name.val()
        });

        $email.on('change', function () {
            email = $email.val()
        });
    }
}