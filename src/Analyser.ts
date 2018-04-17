import {Audio} from 'three';
import {vec2, vec3} from 'gl-matrix';

class Analyser {
    dims: vec2;
    analyser: AnalyserNode;
    beats: vec3[] = [];
    lastTone: number = 0;

    constructor(node: AnalyserNode, canvasDim: vec2) {
        this.analyser = node;
        this.dims = canvasDim;
    }

    // Note I don't really understand how this works, but it does pitch detection based on some auto correlation algorithm
    // from a guy at MIT, found at https://github.com/cwilso/PitchDetect. I used his because I have no idea how to write one myself
    getNote(): number {
        let samplerate = this.analyser.context.sampleRate;
        let bufLength = this.analyser.fftSize;
        let maxsamples = Math.floor(bufLength / 2);
        let dataArray = new Float32Array(bufLength);
        this.analyser.getFloatTimeDomainData(dataArray);
        let best_offset = -1;
        let best_correlation = 0;
        let rms = 0;
        let foundCorrelation = false;
        let correlations: number[] = new Array(maxsamples);

        for (let i = 0; i < bufLength; i++) {
            let v = dataArray[i];
            rms += v * v;
        }
        rms = Math.sqrt(rms / bufLength);
        if (rms < 0.01) { // Silent
            return -1;
        }

        let lastCorrelation = 1;
        for (let offset = 0; offset < maxsamples; offset++) {
            let correlation = 0;

            for (let i = 0; i < maxsamples; i++) {
                correlation += Math.abs(dataArray[i] - dataArray[i + offset]);
            }
            correlation = 1 - (correlation / maxsamples);
            correlations[offset] = correlation; // Store this correlation

            if ((correlation > 0.9) && (correlation > lastCorrelation)) {
                foundCorrelation = true;
                if (correlation > best_correlation) {
                    best_correlation = correlation;
                    best_offset = offset;
                }
            }
            else if (foundCorrelation) {
                let shift = (correlations[best_offset + 1] - correlations[best_offset - 1]) / correlations[best_offset];
                return samplerate / (best_offset + (8 * shift));
            }
            lastCorrelation = correlation;
        }
        if (best_correlation > 0.01) {
            return samplerate / best_offset;
        }
        return -1; // if we got here there is no correlation (noise)

    }

    generateBeat() {
        this.beats = [];
        let pitch = this.getNote();
        if (pitch != -1 && this.lastTone != -1) {
            this.beats.push(vec3.fromValues(600 + (pitch - this.lastTone) / 10, 300, 1));
        }
        else {
            this.beats.push(vec3.fromValues(600, 300, 1));
        }
        //console.log(pitch);
        
        this.lastTone = pitch;
    }

    getBeats(): number[] {
        let beatarray: number[] = [];

        for (let i = 0; i < this.beats.length; i++) {
            let beat = this.beats[i];
            beatarray.push(beat[0]);
            beatarray.push(beat[1]);
            beatarray.push(beat[2]);
        }
        return beatarray;
    }

};

export default Analyser;
