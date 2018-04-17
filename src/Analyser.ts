import {Audio} from 'three';
import {vec2, vec3} from 'gl-matrix';

class Analyser {
    dims: vec2;
    analyser: AnalyserNode;
    beats: vec3[] = [];
    lastTone: number = -1;
    restTime: number = 100;
    beatFreq: number = 0.25; // Makeshift Difficulty

    constructor(node: AnalyserNode, canvasDim: vec2) {
        this.analyser = node;
        this.dims = canvasDim;
    }

    // Note I don't completely understand how this works, but it does pitch detection based on some correlation algorithm of Fast Fourier Transforms
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

    generateBeat(deltaT: number) {
        let newbeats: vec3[] = [];
        for (let i = 0; i < this.beats.length; i++) { // Update beats and remove expired beats
            let beat = this.beats[i];
            if (beat[2] > deltaT) {
                beat[2] -= deltaT;
                newbeats.push(beat);
            }
        }

        let pitch = this.getNote();
        if (pitch == -1 || this.restTime <= 0.02) { // Update the time since the last note
            this.restTime += deltaT;
            //console.log(this.restTime);
            //console.log(deltaT);
        }
        else {
            let tonediff = Math.abs(pitch - this.lastTone);
            if (12 * (Math.log(tonediff / 440)/Math.log(2)) <= 1) { // Tones are the same
                if (this.restTime >= 0.5) { // Repeated tone after pause
                    let lastbeat = this.beats[this.beats.length - 1];
                    newbeats.push(vec3.fromValues(lastbeat[0], lastbeat[1], 6));
                }
                else { // Do something else for slides
                    let lastbeat = this.beats[this.beats.length - 1];
                    newbeats.push(vec3.fromValues(lastbeat[0], lastbeat[1], 6));
                }
            }
            else  if (this.restTime >= this.beatFreq) { // different tones
                let newbeat: vec3;
                if (this.restTime >= 0.75 || this.beats.length == 0) {
                    newbeat = vec3.fromValues(Math.random() * this.dims[0], Math.random() * this.dims[1], 6);
                }
                else {
                    let lastbeat = this.beats[this.beats.length - 1];
                    newbeat = vec3.fromValues(lastbeat[0] + (Math.random() - 0.5) * 150, lastbeat[1] + (Math.random() - 0.5) * 150, 6);
                }

                newbeat[0] = Math.min(this.dims[0] - 10, Math.max(10, newbeat[0])); // Make sure the beat is on the screen
                newbeat[1] = Math.min(this.dims[1] - 10, Math.max(10, newbeat[1]));
                newbeats.push(newbeat);
            }

            this.restTime = 0;
        }
        //console.log(pitch);
        
        this.lastTone = pitch;
        this.beats = newbeats;
    }

    getBeats(): number[] {
        let beatarray: number[] = [];

        for (let i = 0; i < this.beats.length; i++) {
            let beat = this.beats[i];
            if (beat[2] <= 1) {
                beatarray.push(beat[0]);
                beatarray.push(beat[1]);
                beatarray.push(beat[2]);
            }
        }
        for (let i = this.beats.length; i < 50; i++) { // If we dont fill all 50 spots in the array old beats might not get overwritten
            beatarray.push(0);
            beatarray.push(0);
            beatarray.push(0);
        }
        return beatarray;
    }

};

export default Analyser;
