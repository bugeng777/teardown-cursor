// The studio: a pale backdrop, a soft shadow under the module, a room environment for the aluminium to read.
// Deliberately cheap for integrated GPUs: no post-processing, MSAA on the canvas, one 1-2k shadow map.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildModule} from './module.js';
import {buildBoard} from './board.js';
import {installPose} from './kin.js';

export function createStage({canvas}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 512;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#f3f3f4');
    gr.addColorStop(0.55, '#e9eaec');
    gr.addColorStop(1, '#e1e2e5');
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
  }
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  pm.dispose();
  const camera = new THREE.PerspectiveCamera(26, 16 / 9, 0.02, 40);
  const sun = new THREE.DirectionalLight('#ffffff', 1.9);
  sun.position.set(-1.0, 3.0, 1.8);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {left: -1, right: 1, top: 1, bottom: -1, near: 0.5, far: 8});
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.003;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#ffffff', '#cfd0d3', 0.6));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.ShadowMaterial({color: '#5d636c', opacity: 0.22, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8}),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.0015;
  floor.receiveShadow = true;
  scene.add(floor);

  const mod = buildModule();
  scene.add(mod.root);
  // installation: the board and the kit's second module (a clone sharing every geometry, material and texture)
  const board = buildBoard();
  board.root.visible = false;
  scene.add(board.root);
  const mod2 = mod.root.clone(true);
  mod2.traverse((o) => {
    if (o.name === 'pulses') o.visible = false;
  });
  mod2.visible = false;
  scene.add(mod2);
  mod.pulsesOf = (root) => root.getObjectByName('pulses');

  let shadowInst = false;
  const size = {w: 1600, h: 900};
  const resize = (w, h, pr) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  // cam: target (tx, ty, tz), azimuth from +z toward +x, elevation, distance (radians, world units), sx/sy shift
  const frame = (state, cam) => {
    mod.update(state);
    const inst = state.mode === 'install';
    board.root.visible = inst;
    mod2.visible = inst && state.kit !== false;
    mod.root.visible = !inst || state.kit !== false;
    const pl = mod.pulsesOf(mod.root);
    if (pl) pl.visible = !inst;
    if (inst !== shadowInst) {
      // the whole board needs a wider shadow frustum, centred on it; the module alone keeps the tight one
      shadowInst = inst;
      const r = inst ? 1.75 : 1;
      Object.assign(sun.shadow.camera, {left: -r, right: r, top: r, bottom: -r});
      sun.shadow.camera.updateProjectionMatrix();
      sun.target.position.set(inst ? 0.55 : 0, 0, inst ? 0.7 : 0);
      sun.position.set(sun.target.position.x - 1.0, 3.0, sun.target.position.z + 1.8);
    }
    if (inst) {
      const p = installPose(state.k);
      mod.root.position.set(p.m1[0] * 0.01, p.m1[1] * 0.01, p.m1[2] * 0.01);
      mod2.position.set(p.m2[0] * 0.01, p.m2[1] * 0.01, p.m2[2] * 0.01);
      board.pose(p, state.rgbT);
      floor.position.y = board.top * 0.01 - 0.001;
      st.pose = p;
    } else {
      mod.root.position.set(0, 0, 0);
      floor.position.y = -0.0015;
    }
    const {tx, ty, tz, az, el, d} = cam;
    camera.position.set(tx + d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(tx, ty, tz);
    camera.setViewOffset(size.w, size.h, -(cam.sx ?? 0), -(cam.sy ?? 0), size.w, size.h);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
  };
  const st = {};
  const pv = new THREE.Vector3();
  const project = (p) => {
    pv.set(p[0], p[1], p[2]).project(camera);
    if (pv.z > 1) return null;
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };
  const setQuality = ({shadow}) => {
    if (shadow !== undefined && sun.shadow.mapSize.x !== shadow) {
      sun.shadow.mapSize.set(shadow, shadow);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
  };
  return Object.assign(st, {renderer, scene, camera, mod, board, resize, frame, project, size, setQuality});
}
