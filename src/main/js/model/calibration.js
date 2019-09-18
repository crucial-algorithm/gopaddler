'use strict';


class Calibration {
    constructor(predominant, angleZ, noiseX, noiseY, noiseZ, factorX, factorY, factorZ, alpha, beta, gamma) {
        this._predominant = predominant;
        this._angleZ = angleZ;
        this._noiseX = noiseX;
        this._noiseY = noiseY;
        this._noiseZ = noiseZ;
        this._factorX = factorX;
        this._factorY = factorY;
        this._factorZ = factorZ;
        this._alpha = alpha;
        this._beta = beta;
        this._gamma = gamma;
    }

    save(isPortraitMode) {
        window.localStorage.setItem(isPortraitMode ? "calibration.portrait" : "calibration", JSON.stringify({
            predominant: this.predominant,
            angleZ: this.angleZ,
            noiseX: this.noiseX,
            noiseY: this.noiseY,
            noiseZ: this.noiseZ,
            factorX: this.factorX,
            factorY: this.factorY,
            factorZ: this.factorZ,
            alpha: this.alpha,
            beta: this.beta,
            gamma: this.gamma
        }));
    }

    static load(isPortraitMode) {
        let obj = JSON.parse(window.localStorage.getItem(isPortraitMode ? "calibration.portrait" : "calibration"));
        if (!obj) {
            return;
        }
        return new Calibration(obj.predominant, obj.angleZ
            , obj.noiseX, obj.noiseY, obj.noiseZ, obj.factorX, obj.factorY, obj.factorZ
            , obj.alpha, obj.beta, obj.gamma);
    }

    static blank() {
        return new Calibration(0, 0, 0, 0, 0, 0, 0, 0);
    }

    static clear() {
        window.localStorage.removeItem('calibration');
        window.localStorage.removeItem('calibration.portrait');
    }


    get predominant() {
        return this._predominant;
    }

    set predominant(value) {
        this._predominant = value;
    }

    get angleZ() {
        return this._angleZ;
    }

    set angleZ(value) {
        this._angleZ = value;
    }

    get noiseX() {
        return this._noiseX;
    }

    set noiseX(value) {
        this._noiseX = value;
    }

    get noiseY() {
        return this._noiseY;
    }

    set noiseY(value) {
        this._noiseY = value;
    }

    get noiseZ() {
        return this._noiseZ;
    }

    set noiseZ(value) {
        this._noiseZ = value;
    }

    get factorX() {
        return this._factorX;
    }

    set factorX(value) {
        this._factorX = value;
    }

    get factorY() {
        return this._factorY;
    }

    set factorY(value) {
        this._factorY = value;
    }

    get factorZ() {
        return this._factorZ;
    }

    set factorZ(value) {
        this._factorZ = value;
    }

    get alpha() {
        return this._alpha;
    }

    set alpha(value) {
        this._alpha = value;
    }

    get beta() {
        return this._beta;
    }

    set beta(value) {
        this._beta = value;
    }

    get gamma() {
        return this._gamma;
    }

    set gamma(value) {
        this._gamma = value;
    }
}

export default Calibration;
