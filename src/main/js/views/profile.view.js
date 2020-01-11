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
        const self = this;
        this.$name = $page.find('#name');
        this.$email = $page.find('#email');
        this.$update = $page.find('#update');

        this.$update.off('tap').on('tap', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!self.isFormValid()) return;
            let name = self.$name.val();
            let email = self.$email.val();

            let isNameChanged = name !== Api.User.getName();
            let isEmailChanged = email !== Api.User.getProfile().email;

            if (isNameChanged === false && isEmailChanged === false) {
                return App.back()
            }

            Api.User.updateUserProfile(name, email).then(function (x) {
                console.log('profile updated');
                App.back();
            }).fail(function (err) {
                console.error(err);
            });
        });

        this.$name.on('change', function () {
            self.isFormValid();
        });

        this.$email.on('change', function () {
            self.isFormValid()
        });

        $page.find('form').submit(function (e) {
            e.preventDefault();
        });
    }

    isFormValid() {
        let name = this.$name.val();
        let email = this.$email.val();
        let valid = [];
        if (!name) {
            this.$name.addClass('error');
            valid.push(0);
        } else {
            valid.push(1);
            this.$name.removeClass('error')
        }

        if (!email || !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)) {
            this.$email.addClass('error');
            valid.push(0);
        } else {
            this.$email.removeClass('error');
            valid.push(1);
        }

        let isFormValid = valid.join('') === '11';

        if (isFormValid) {
            this.$update.removeClass('disabled');
        } else {
            this.$update.addClass('disabled');
        }

        return isFormValid;
    }
}