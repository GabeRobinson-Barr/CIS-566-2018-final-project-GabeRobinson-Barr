import {Audio} from 'three';
import {vec2, vec3} from 'gl-matrix';

class Analyser {
    dims: vec2;
    analyser: AnalyserNode;
    beats: vec3[] = [];
    lastTone: number = -1;
    restTime: number = 100;
    beatFreq: number = 0.25; // Makeshift Difficulty
    score: number = 0;

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
            if (beat[2] - deltaT >= -0.2) { // Give a 0.2 grace period for missing beats
                beat[2] -= deltaT;
                newbeats.push(beat);
            }
            else { // If a beat is expired subtract from the score
                this.score -= 100;
            }
        }

        let pitch = this.getNote();
        if (pitch == -1 || this.restTime <= this.beatFreq) { // Update the time since the last note
            this.restTime += deltaT;
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
            else { // different tones
                let newbeat: vec3;
                if (this.restTime >= 0.75 || this.beats.length == 0) {
                    newbeat = vec3.fromValues(Math.random() * this.dims[0], Math.random() * this.dims[1], 6);
                }
                else {
                    let lastbeat = this.beats[this.beats.length - 1];
                    newbeat = vec3.fromValues(lastbeat[0] + (Math.random() - 0.5) * 200, lastbeat[1] + (Math.random() - 0.5) * 200, 6);
                }

                newbeat[0] = Math.min(this.dims[0] - 100, Math.max(100, newbeat[0])); // Make sure the beat is on the screen
                newbeat[1] = Math.min(this.dims[1] - 100, Math.max(100, newbeat[1]));
                newbeats.push(newbeat);
            }

            this.restTime = 0;
        }
        
        this.lastTone = pitch;
        this.beats = newbeats;
    }

    getBeats(): number[] {
        let beatarray: number[] = [];

        for (let i = 0; i < this.beats.length; i++) {
            let beat = this.beats[i];
            if (beat[2] >= 0 && beat[2] <= 1) {
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

    updateScore(clickpos: vec2) {
        if (this.beats.length > 0) {
            let nextbeat = this.beats.shift(); // Remove and return the values for the first beat
            let nexttime = nextbeat[2];

            let dist = vec2.distance(clickpos, vec2.fromValues(nextbeat[0], nextbeat[1]));

            if (nexttime <= 0.2 && dist <= 30) { // Add score for a good click
                this.score += 100 * Math.floor(20 * (0.2 - nexttime)) + 100;
            }
            else if (dist > 30) { // -100 for a click outside the beat
                this.score -= 100;
            }
            else {
                this.score -= 300; // -300 for a click out of time
            }
        }
    }

};

export default Analyser;
