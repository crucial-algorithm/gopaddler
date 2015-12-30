var assert = require('assert');
var data = require('./data');
var StrokeDetector = require('../../main/js/core/stroke-detector').StrokeDetector;
var Calibration = require('../../main/js/model/calibration').Calibration;

function loop(records, strokeDetector) {
    var strokes = [];
    strokeDetector.onStrokeDetected(function (stroke) {
        strokes.push(stroke);
    });

    for (var i = 0; i < records.length; i++) {
        strokeDetector.process(records[i], strokeDetector.filter(records[i]));
    }
    return strokes;
}


function detectedBeforeMax(strokes) {
    for (var i = 0; i < strokes.length; i++) {
        if (strokes[i].getDetected().getSampleAt() - strokes[i].getDetected().getSampleAt() < 0) {
            throw "Stroke #" + i +" detection before max";
        }
    }
}


describe('Stroke Detector', function() {
    describe('#', function () {

        // actual test is to make sure 13 is not created at all
        it('should create 13 paddle after 12 (fixed with abs in min seconds)', function (done) {

            var calibration = new Calibration(2, 0.731365031532024, 7.99823059387206, null, 6.55196362152099, 0.839431295262873, 0.744263410302282);
            var strokeDetector = new StrokeDetector(null, calibration);

            data.get(1).then(function (records) {
                var strokes = loop(records, strokeDetector);
                detectedBeforeMax(strokes);
                assert.equal(12, strokes.length);
                done();
            }).catch(function(err){
                  done(err);
                });
        });

        it('Must validate 38 strokes', function (done) {

            var calibration = new Calibration(2, 0.731365031532024, 7.99823059387206, null, 6.55196362152099, 0.839431295262873, 0.744263410302282);
            var strokeDetector = new StrokeDetector(null, calibration);

            data.get(2).then(function (records) {
                var strokes = loop(records, strokeDetector);
                detectedBeforeMax(strokes);
                assert.equal(38, strokes.length);
                done();
            }).catch(function (err) {
                    done(err);
                });
        });

    });
});