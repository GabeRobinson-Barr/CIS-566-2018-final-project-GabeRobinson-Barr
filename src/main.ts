import {vec2, vec3, vec4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import {Audio} from 'three';
import Analyser from './Analyser';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'Song': 'City Escape',
  'Load Song': loadScene, // A function pointer, essentially
  'Play/Pause': PlayPause,
  'Volume': 50,
};

let starttime: number = new Date().getTime();

let audioCtx: AudioContext;
let audioSrc: AudioBufferSourceNode;
let audioBuf: AudioBuffer;
let analyser: AnalyserNode;
let delay: DelayNode;
let gain: GainNode;

let generator: Analyser;

let playing: boolean = false;
let started: boolean = false;
let lastVol = 50;

let square: Square;
let currBeats: number[];

function loadScene() {
  if (playing) {
    audioCtx.suspend();
  }

  playing = false;
  started = false;
  let dims = vec2.fromValues(document.documentElement.clientWidth, document.documentElement.clientHeight);
  square = new Square(dims);
  square.create();

  audioCtx = new AudioContext();
  audioSrc = audioCtx.createBufferSource();
  gain = audioCtx.createGain();
  gain.gain.setValueAtTime(controls.Volume / 100, audioCtx.currentTime);

  let request = new XMLHttpRequest();
  request.open('GET', '../../Audio/' + controls.Song + '.mp3');
  console.log(controls.Song);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    let data = request.response;
    audioCtx.decodeAudioData(data, function(buffer) {
      audioBuf = buffer;
    },
    function(e) {console.log("Error decoding audio data"); });

  }
  request.send();
  audioSrc.buffer = audioBuf;
  
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  delay = audioCtx.createDelay(6); // Gives the analyzer time to create the map
  delay.delayTime.value = 6;

  // Set up node network
  audioSrc.connect(analyser);
  analyser.connect(delay);
  delay.connect(gain);
  gain.connect(audioCtx.destination);

  generator = new Analyser(analyser, dims);
  generator.generateBeat(0);
  currBeats = generator.getBeats()
}


function PlayPause() {
  if (!started) {
    audioSrc.start(0);
    started = true;
    playing = true;
  }
  else {
    if (playing) {
      audioCtx.suspend();
      playing = false;
    }
    else {
      audioCtx.resume();
      playing = true;
    }
  }
  console.log(playing);
}

function main() {

  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  
  gui.add(controls, 'Song', ['City Escape', 'E.G.G.M.A.N.', 'Im Blue', 'Mr Blue Sky']);
  gui.add(controls, 'Load Song');
  gui.add(controls, 'Play/Pause');
  gui.add(controls, 'Volume', 0, 100).step(1);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 10, 20), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const beatmap = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/beatmap-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/beatmap-frag.glsl')),
  ]);
 

  // This function will be called every frame
  function tick() {
    if (lastVol != controls.Volume) {
      gain.gain.setValueAtTime(controls.Volume / 100, audioCtx.currentTime);
      lastVol = controls.Volume;
    }
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    
    let prog: ShaderProgram = beatmap;

    let currT = new Date().getTime();
    let deltaT = (currT - starttime) / 1000;
    starttime = currT;

    generator.generateBeat(deltaT);
    currBeats = generator.getBeats();

    renderer.render(camera, prog, [
      square,
    ], currBeats);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
