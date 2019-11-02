'use strict';
import Context from '../context';
import Calibrate from '../core/calibrate';
import template from './calibration.view.art.html';


class CalibrationView {
    /**
     *
     * @param page
     * @param {Context} context
     * @param request
     */
    constructor(page, context, request) {
        Context.render(page, template({isPortraitMode: context.isPortraitMode()}));
        this._$page = $(page);
        this._context = context;
        this._request = request;
        this._$content = this.$page.find('.app-content');
        this._$calibrate = this.$page.find('.calibrate');

        const $start = this.$content.find('.calibrate-action-start')
            , $flat = this.$content.find('.calibrate-action-preset-flat');

        let self = this;
        $start.off('click').on('click', function () {
            self.start();
        });

        $flat.off('click').on('click', function () {
            Calibrate.setPredefinedPosition(context.isPortraitMode());
            self.setRunning();
            setTimeout(function () {
                self.setDone();
                self.exit();
            }, 1500);
        });

    }

    start() {
        const self = this;
        self.setRunning();
        setTimeout(function () {
            let cal = new Calibrate(self.context.isPortraitMode(), function () {
                self.setDone();
                self.exit();
            });
            cal.start();
        }, 1000);
    }

    /**
     * @private
     */
    setRunning() {
        this.$page.find('.app-topbar').addClass('calibrate-running');
        this.$content.addClass('calibrate-running');
        this.$content.css({height: ''});
    }

    /**
     * @private
     */
    setDone() {
        this.$calibrate.removeClass('listening');
        this.$calibrate.addClass('finished');
        this.$calibrate.html(this.context.translate("calibration_done"));
    }

    /**
     * @private
     */
    exit() {
        const self = this
            , isStartSession = !!(this.request.from === 'start-session');

        setTimeout(function () {
            if (isStartSession)
                self.context.navigate('home', true, {from: "calibration"});
            else
                App.back();
        }, 1500);
    }


    /**
     *
     * @return {Context}
     */
    get context() {
        return this._context;
    }

    set context(value) {
        this._context = value;
    }

    get $page() {
        return this._$page;
    }

    set $page(value) {
        this._$page = value;
    }

    get request() {
        return this._request;
    }

    set request(value) {
        this._request = value;
    }


    get $content() {
        return this._$content;
    }

    set $content(value) {
        this._$content = value;
    }

    get $calibrate() {
        return this._$calibrate;
    }

    set $calibrate(value) {
        this._$calibrate = value;
    }
}

export default CalibrationView;
