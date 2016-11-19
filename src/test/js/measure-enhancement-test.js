var assert = require('assert');
var data = require('./data');
var MeasureEnhancement = require('../../main/js/core/measure-enhancement').MeasureEnhancement;


describe('measure enhacement', function () {

    var measureEnhancement = new MeasureEnhancement();

    it('Should discard 122', function (done) {

        data.getSessionData('5ebtxyGWqKpFd8uiE').then(function (records) {
            var value = measureEnhancement.getMaxSPM(records);
            assert.notEqual(value, 122);
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('Should discard all... return highest', function (done) {

        data.getSessionData('Pqcp2dNwPXs2pz5TD').then(function (records) {
            var value = measureEnhancement.getMaxSPM(records);
            assert.equal(value, 164);
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('Should discard 115', function (done) {

        data.getSessionData('KQCR2RrvcRaGhNCur').then(function (records) {
            var value = measureEnhancement.getMaxSPM(records);
            assert.notEqual(value, 115);
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('Should accept 117', function (done) {

        data.getSessionData('499H7yzLmD2ek2vNe').then(function (records) {
            var value = measureEnhancement.getMaxSPM(records);
            assert.equal(value, 117);
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('Should discard 121', function (done) {

        data.getSessionData('pcL6kGDmLF9qoW8SD').then(function (records) {
            var value = measureEnhancement.getMaxSPM(records);
            assert.notEqual(value, 121);
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('Should discard 116', function (done) {

        data.getSessionData('Ki5Hg3Zc38rsvoNxD').then(function (records) {
            var value = measureEnhancement.getMaxSPM(records);
            assert.notEqual(value, 116);
            done();
        }).catch(function (err) {
            done(err);
        });
    });


    it('Should discard 144', function (done) {

        data.getSessionData('AcWNEmrtXeE9W33yA').then(function (records) {
            var value = measureEnhancement.getMaxSPM(records);
            assert.notEqual(value, 144);
            done();
        }).catch(function (err) {
            done(err);
        });
    });

    it('Should discard 12312', function (done) {

        data.getSessionData('EYC44CTCFrZH2yWsG').then(function (records) {
            var value = measureEnhancement.getMaxSPM(records);
            assert.notEqual(value, 123123);
            done();
        }).catch(function (err) {
            done(err);
        });
    });




});