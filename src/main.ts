import {vec2, vec3, vec4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import {Audio} from 'three';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'Load Song': loadScene, // A function pointer, essentially
  'Play/Pause': PlayPause,
};

let audioCtx: AudioContext;
let audioSrc: AudioBufferSourceNode;
let audioBuf: AudioBuffer;

let playing: boolean = false;
let started: boolean = false;

let square: Square;
let beats: vec3[];
let currBeats: number[] = [600, 200, 2];

function loadScene() {
  let dims = vec2.fromValues(document.documentElement.clientWidth, document.documentElement.clientHeight);
  console.log(dims);
  square = new Square(dims);
  square.create();

  currBeats = [600, 200, 2];

  audioCtx = new AudioContext();
  audioSrc = audioCtx.createBufferSource();

  let request = new XMLHttpRequest();
  request.open('GET', '../../Audio/City Escape.mp3', true);
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
  audioSrc.connect(audioCtx.destination);
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
  
  gui.add(controls, 'Load Song');
  gui.add(controls, 'Play/Pause');

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
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    
    let prog: ShaderProgram = beatmap;

    renderer.render(camera, prog, [
      //icosphere,
      square,
      //cube,
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
