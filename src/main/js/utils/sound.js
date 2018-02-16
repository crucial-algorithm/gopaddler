var playStartCountDown, playFinishCountDown, playFinish;

var START_COUNTDOWN_FILE = "start.mp3"
    , FINISH_COUNTDOWN_FILE = "finish.m4a"
    , FINISH_FILE = "finish-immediately.m4a";



function buildPath(filename) {
    return "sound/" + filename
}


function loadAudioFile(filename) {

    var NativeAudio = {preloadSimple: function(){}};
    if (window.plugins && window.plugins.NativeAudio) {
        NativeAudio = window.plugins.NativeAudio;
    }

    NativeAudio.preloadSimple(filename, buildPath(filename)
        , function success() {
            console.log("playAudio():Audio Success");
        }
        , function error(err) {
            console.log("playAudio():Audio Error: " + err);
        });

    return {
        play: function () {
            NativeAudio.play(filename)
        }
    }
}


function Sound() {
    this.start = loadAudioFile(START_COUNTDOWN_FILE);
    this.finish = loadAudioFile(FINISH_COUNTDOWN_FILE);
    this.finishIm = loadAudioFile(FINISH_FILE);
}

Sound.prototype.playStartCountDown = function () {

    this.start.play();
};

Sound.prototype.playFinishCountDown = function () {
    this.finish.play();
};

Sound.prototype.playFinish = function () {
    this.finishIm.play();
};


exports.Sound = Sound;
