'use strict';

const START_COUNTDOWN_FILE = "start.m4a"
    , FINISH_COUNTDOWN_FILE = "finish.m4a"
    , FINISH_FILE = "finish-immediately.m4a";



function buildPath(filename) {
    return "sound/" + filename
}


function loadAudioFile(filename) {

    let NativeAudio = {preloadSimple: function(){}};
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
            if (NativeAudio.play)
                NativeAudio.play(filename)
        }
    }
}

class Sound {
    constructor() {
        this.start = loadAudioFile(START_COUNTDOWN_FILE);
        this.finish = loadAudioFile(FINISH_COUNTDOWN_FILE);
        this.finishIm = loadAudioFile(FINISH_FILE);
    }

    playStartCountDown() {
        this.start.play();
    }

    playFinishCountDown() {
        this.finish.play();
    }

    playFinish() {
        this.finishIm.play();
    }
}


export default Sound;

// Adicionar opção para terminar treino programado sem desligar o treino
// Adicionar opção para calibrar durante o treino
// Verificar o que se passa com a cadência em sessões programadas - está muito baixa!!