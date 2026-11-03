// The module's geometry, built from code in millimetres (the root is scaled to metres ×10: 1 unit = 100 mm).
// update(state) poses it: the disassembly offsets, the RGB wave, the data and power pulses, the isolate fades.
import * as THREE from 'three';
import {
  PCB, PIN, pinX, SPREADER, PAD_T, DRAM_SIZE, DRAM_X, DRAM_Y, PMIC_POS, PMIC_SIZE, SPD_POS, SPD_SIZE, RGBC_POS, LEDS,
  explode, busState, MODULE_H,
} from './kin.js';

export const S = 0.01;
const CX = PCB.w / 2; // shape x → centred x
const ZF = PCB.t / 2; // front face of the PCB
export const toWorld = (x, y, z = 0) => [(x - CX) * S, y * S, z * S];
const FONT = 'Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
// a seeded PRNG for the passives and trace layout (setup only)
const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

// ------------------------------------------------------------ textures
const PX = 14; // px per mm on the PCB textures
function pcbTexture(back) {
  return canvasTex(Math.round(PCB.w * PX), Math.round(PCB.h * PX), (g, w, h) => {
    const X = (mm) => mm * PX;
    const Y = (mm) => h - mm * PX; // y up from the contact edge
    g.fillStyle = '#17191c';
    g.fillRect(0, 0, w, h);
    // the ground pour: a slightly lighter copper under the mask, hatched
    g.fillStyle = '#1d2024';
    g.fillRect(X(1.2), Y(PCB.h - 1.2), X(PCB.w - 2.4), X(PCB.h - 6.5));
    const r = rng(back ? 7 : 3);
    // traces from the contacts up to the chips: fly-by in the real board, drawn here as fanned routes
    g.lineWidth = 1.1;
    for (let n = 1; n <= 144; n++) {
      const x = pinX(n);
      const chip = DRAM_X.reduce((b, cx) => (Math.abs(cx - x) < Math.abs(b - x) ? cx : b), DRAM_X[0]);
      const tx = chip + (r() - 0.5) * DRAM_SIZE[0] * 0.8;
      g.strokeStyle = r() < 0.15 ? '#2b2f35' : '#24282d';
      g.beginPath();
      g.moveTo(X(x), Y(4));
      g.lineTo(X(x), Y(5 + r() * 1.5));
      g.lineTo(X(tx), Y(DRAM_Y - DRAM_SIZE[1] / 2 + 0.5));
      g.stroke();
    }
    // vias
    g.fillStyle = '#2c3036';
    for (let i = 0; i < 420; i++) {
      g.beginPath();
      g.arc(X(2 + r() * (PCB.w - 4)), Y(5 + r() * (PCB.h - 7)), 2.2, 0, Math.PI * 2);
      g.fill();
    }
    // silkscreen
    g.fillStyle = '#d9c27a';
    g.font = `700 ${X(2.2)}px ${FONT}`;
    g.textBaseline = 'alphabetic';
    if (!back) {
      g.fillText('G.SKILL', X(3), Y(28.6));
      g.font = `600 ${X(1.3)}px ${FONT}`;
      g.fillStyle = '#c9cdd3';
      DRAM_X.forEach((x, i) => g.fillText(`U${i + 1}`, X(x - 1.2), Y(DRAM_Y + DRAM_SIZE[1] / 2 + 2.2)));
      g.fillText('PMIC', X(PMIC_POS[0] - 2), Y(PMIC_POS[1] - 2.6));
      g.fillText('SPD', X(SPD_POS[0] + 1.6), Y(SPD_POS[1] - 0.4));
      g.fillText('A  ←  子通道  →  B', X(55), Y(5.6));
    } else {
      g.font = `700 ${X(1.6)}px ${FONT}`;
      g.fillStyle = '#c9cdd3';
      g.fillText('5GS1001D', X(10), Y(9));
      g.fillText('HJ  94V-0', X(10), Y(6.6));
      g.fillText('PC5-48000U', X(100), Y(9));
    }
  });
}
function chipTexture(i) {
  return canvasTex(240, 300, (g, w, h) => {
    g.fillStyle = '#26282c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.05)';
    g.fillRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#8f949b';
    g.beginPath();
    g.arc(26, 26, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c3c7cc';
    g.textAlign = 'center';
    g.font = `700 34px ${FONT}`;
    g.fillText('SK hynix', w / 2, 118);
    g.font = `600 24px ${FONT}`;
    g.fillText('H5CG48AGBD', w / 2, 160);
    g.fillText('X018', w / 2, 194);
    g.font = `500 20px ${FONT}`;
    g.fillText(`233A  ${i < 4 ? 'A' : 'B'}${(i % 4) + 1}`, w / 2, 232);
  });
}
function smallTex(lines, bg = '#2a2c30') {
  return canvasTex(160, 120, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b9bdc2';
    g.textAlign = 'center';
    g.font = `600 26px ${FONT}`;
    lines.forEach((l, i) => g.fillText(l, w / 2, 48 + i * 34));
  });
}
// the heatspreader's outer face: metallic silver, the black brushed slash, the wordmark (shape coords → uv)
function spreaderTexture(back) {
  const W = 1600;
  const Hh = Math.round((W * MODULE_H) / PCB.w);
  const t = canvasTex(W, Hh, (g, w, h) => {
    const X = (mm) => (mm / PCB.w) * w;
    const Y = (mm) => h - (mm / MODULE_H) * h;
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#d9dce0');
    gr.addColorStop(0.5, '#c2c6cb');
    gr.addColorStop(1, '#b3b7bd');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // brushed grain
    const r = rng(back ? 11 : 5);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '90,95,100'},${0.04 + r() * 0.05})`;
      g.fillRect(0, r() * h, w, 1);
    }
    // the black slash band
    g.fillStyle = '#1b1d20';
    g.beginPath();
    g.moveTo(X(18), Y(11));
    g.lineTo(X(124), Y(11));
    g.lineTo(X(116), Y(30));
    g.lineTo(X(10), Y(30));
    g.closePath();
    g.fill();
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`;
      g.fillRect(X(8), Y(11 + r() * 19), X(118), 1);
    }
    g.fillStyle = '#e8eaed';
    g.font = `800 ${Y(0) - Y(5.2)}px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText('TRIDENT Z5', X(back ? 64 : 22), Y(20.6));
    g.font = `700 ${Y(0) - Y(2.6)}px ${FONT}`;
    g.fillStyle = '#2a2d31';
    g.fillText(back ? 'DDR5-6000  CL30-36-36-96  1.35V  16GB' : 'G.SKILL', X(back ? 20 : 104), Y(36.5));
  });
  t.repeat.set(1 / PCB.w, 1 / MODULE_H);
  t.offset.set(0.5, 0);
  return t;
}

// split an extruded plate's caps: outer face (normal +z) 0, rim 1, inner face (normal -z) 2
function regroup(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  const bins = [[], [], []];
  for (let t = 0; t < pos.count / 3; t++) {
    let nz = 0;
    for (let k = 0; k < 3; k++) nz += nor.getZ(t * 3 + k);
    nz /= 3;
    bins[nz > 0.9 ? 0 : nz < -0.9 ? 2 : 1].push(t);
  }
  const out = new THREE.BufferGeometry();
  const P = [], N = [], U = [];
  let start = 0;
  bins.forEach((tris, m) => {
    for (const t of tris)
      for (let k = 0; k < 3; k++) {
        const i = t * 3 + k;
        P.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        N.push(nor.getX(i), nor.getY(i), nor.getZ(i));
        U.push(uv.getX(i), uv.getY(i));
      }
    out.addGroup(start, tris.length * 3, m);
    start += tris.length * 3;
  });
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return out;
}

// ------------------------------------------------------------ build
export function buildModule() {
  const root = new THREE.Group();
  root.scale.setScalar(S);
  const parts = {}; // name → {group, mats: []}
  const part = (name) => {
    const g = new THREE.Group();
    g.name = name;
    root.add(g);
    parts[name] = {group: g, mats: []};
    return parts[name];
  };
  const mat = (p, m) => {
    p.mats.push(m);
    m.userData.base = {opacity: m.opacity, transparent: m.transparent};
    return m;
  };
  const shadow = (m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // ------------------------------------------------------------ PCB: the board with its key notch and side latches
  const pcb = part('pcb');
  {
    const s = new THREE.Shape();
    const nx = PIN.notchX - CX;
    const hw = PIN.notchW / 2;
    s.moveTo(-CX + 0.5, 0);
    s.lineTo(nx - hw, 0);
    s.lineTo(nx - hw, PIN.notchD - hw);
    s.absarc(nx, PIN.notchD - hw, hw, Math.PI, 0, true);
    s.lineTo(nx + hw, 0);
    s.lineTo(CX - 0.5, 0);
    s.lineTo(CX, 0.5);
    // the latch notch on each end (retention clip), 估算 position
    s.lineTo(CX, 16);
    s.absarc(CX, 18, 2, -Math.PI / 2, Math.PI / 2, true);
    s.lineTo(CX, PCB.h);
    s.lineTo(-CX, PCB.h);
    s.lineTo(-CX, 20);
    s.absarc(-CX, 18, 2, Math.PI / 2, -Math.PI / 2, true);
    s.lineTo(-CX, 0.5);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {depth: PCB.t, bevelEnabled: false, curveSegments: 10});
    geo.translate(0, 0, -PCB.t / 2);
    const mask = mat(pcb, new THREE.MeshStandardMaterial({color: '#191b1e', roughness: 0.55, metalness: 0.1}));
    const edge = mat(pcb, new THREE.MeshStandardMaterial({color: '#4a4636', roughness: 0.8}));
    const board = shadow(new THREE.Mesh(geo, [mask, edge]));
    pcb.group.add(board);
    // printed faces (above the contacts, so the notch stays clean)
    for (const back of [false, true]) {
      const tex = pcbTexture(back);
      tex.repeat.set(1, (PCB.h - 4.2) / PCB.h);
      tex.offset.set(0, 4.2 / PCB.h);
      const m = mat(pcb, new THREE.MeshStandardMaterial({map: tex, roughness: 0.5, metalness: 0.15, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}));
      const q = new THREE.Mesh(new THREE.PlaneGeometry(PCB.w, PCB.h - 4.2), m);
      q.position.set(0, 4.2 + (PCB.h - 4.2) / 2, back ? -ZF - 0.01 : ZF + 0.01);
      if (back) {
        q.rotation.y = Math.PI;
      }
      q.receiveShadow = true;
      pcb.group.add(q);
    }
    // 288 gold contacts
    const gold = mat(pcb, new THREE.MeshStandardMaterial({color: '#e2b65c', metalness: 1, roughness: 0.32}));
    const fg = new THREE.BoxGeometry(0.6, PIN.h, 0.04);
    const fingers = new THREE.InstancedMesh(fg, gold, 288);
    const m4 = new THREE.Matrix4();
    for (let side = 0; side < 2; side++)
      for (let n = 1; n <= 144; n++) {
        m4.makeTranslation(pinX(n) - CX, 0.35 + PIN.h / 2, side ? -ZF - 0.02 : ZF + 0.02);
        fingers.setMatrixAt(side * 144 + n - 1, m4);
      }
    pcb.group.add(fingers);
    // passives: decoupling capacitors and termination resistors around the chips
    const r = rng(42);
    const caps = [];
    for (let i = 0; i < DRAM_X.length; i++) {
      const x0 = DRAM_X[i];
      for (let j = 0; j < 5; j++) caps.push([x0 - 3.5 + j * 1.75, DRAM_Y + DRAM_SIZE[1] / 2 + 3.8 + (r() < 0.5 ? 0 : 1.4), 1]);
      for (let j = 0; j < 4; j++) caps.push([x0 - 3 + j * 2, 6.2 + r() * 0.8, 1]);
      for (let j = 0; j < 4; j++) caps.push([x0 - 3 + j * 2, DRAM_Y, -1]);
    }
    for (let j = 0; j < 8; j++) caps.push([PMIC_POS[0] - 6 + (j % 4) * 1.6 + (j > 3 ? 8.5 : 0), PMIC_POS[1] - 4.5 + (j % 2) * 1.2, 1]);
    const capM = mat(pcb, new THREE.MeshStandardMaterial({color: '#a68a62', roughness: 0.5, metalness: 0.2}));
    const capI = new THREE.InstancedMesh(new THREE.BoxGeometry(1.0, 0.5, 0.5), capM, caps.length);
    caps.forEach(([x, y, side], i) => {
      m4.makeTranslation(x - CX, y, side * (ZF + 0.25));
      capI.setMatrixAt(i, m4);
    });
    pcb.group.add(capI);
  }

  // ------------------------------------------------------------ DRAM: 8 × SK hynix 16 Gb x8, one rank, front side
  const dram = part('dram');
  const chipMats = [];
  DRAM_X.forEach((x, i) => {
    const top = mat(dram, new THREE.MeshStandardMaterial({map: chipTexture(i), roughness: 0.62, metalness: 0.05, emissive: new THREE.Color(i < 4 ? '#2f7de1' : '#d6182b'), emissiveIntensity: 0}));
    const side = mat(dram, new THREE.MeshStandardMaterial({color: '#202226', roughness: 0.7}));
    chipMats.push(top);
    const m = shadow(new THREE.Mesh(new THREE.BoxGeometry(...DRAM_SIZE), [side, side, side, side, top, side]));
    m.position.set(x - CX, DRAM_Y, ZF + DRAM_SIZE[2] / 2);
    dram.group.add(m);
  });

  // ------------------------------------------------------------ PMIC with its two inductors
  const pmic = part('pmic');
  {
    const top = mat(pmic, new THREE.MeshStandardMaterial({map: smallTex(['0D=9D', 'K6W']), roughness: 0.6, emissive: new THREE.Color('#f05a23'), emissiveIntensity: 0}));
    const side = mat(pmic, new THREE.MeshStandardMaterial({color: '#25272b', roughness: 0.7}));
    const m = shadow(new THREE.Mesh(new THREE.BoxGeometry(...PMIC_SIZE), [side, side, side, side, top, side]));
    m.position.set(PMIC_POS[0] - CX, PMIC_POS[1], ZF + PMIC_SIZE[2] / 2);
    pmic.group.add(m);
    const ind = mat(pmic, new THREE.MeshStandardMaterial({color: '#3b3d41', roughness: 0.45, metalness: 0.3}));
    for (const dx of [-5.2, 5.2]) {
      const l = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 1.2), ind));
      l.position.set(PMIC_POS[0] - CX + dx, PMIC_POS[1] - 0.4, ZF + 0.6);
      pmic.group.add(l);
    }
    pmic.top = top;
  }

  // ------------------------------------------------------------ SPD5118 hub with the thermal sensor
  const spd = part('spd');
  {
    const top = mat(spd, new THREE.MeshStandardMaterial({map: smallTex(['511', '8Y1']), roughness: 0.6, emissive: new THREE.Color('#2f7de1'), emissiveIntensity: 0}));
    const side = mat(spd, new THREE.MeshStandardMaterial({color: '#25272b', roughness: 0.7}));
    const m = shadow(new THREE.Mesh(new THREE.BoxGeometry(...SPD_SIZE), [side, side, side, side, top, side]));
    m.position.set(SPD_POS[0] - CX, SPD_POS[1], ZF + SPD_SIZE[2] / 2);
    spd.group.add(m);
    spd.top = top;
  }

  // ------------------------------------------------------------ RGB: LEDs on both faces, the controller, the diffuser
  const light = part('light');
  const N = 64;
  const rgbData = new Uint8Array(N * 4);
  const rgbTex = new THREE.DataTexture(rgbData, N, 1);
  rgbTex.colorSpace = THREE.SRGBColorSpace;
  rgbTex.magFilter = THREE.LinearFilter;
  rgbTex.needsUpdate = true;
  const ledMats = [];
  {
    const ctl = mat(light, new THREE.MeshStandardMaterial({map: smallTex(['6K58', '50UA0']), roughness: 0.6}));
    const m = shadow(new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.7), ctl));
    m.position.set(RGBC_POS[0] - CX, RGBC_POS[1], ZF + 0.35);
    light.group.add(m);
    const lg = new THREE.BoxGeometry(1.6, 0.8, 0.6);
    for (const side of [1, -1])
      LEDS.forEach((x, i) => {
        const lm = mat(light, new THREE.MeshStandardMaterial({color: '#f4f4f4', emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.4}));
        ledMats.push({m: lm, u: x / PCB.w});
        const l = new THREE.Mesh(lg, lm);
        l.position.set(x - CX, 30.4, side * (ZF + 0.3));
        light.group.add(l);
      });
  }
  const bar = part('bar');
  {
    const L = 126;
    const zIn = ZF + 1.0 + PAD_T; // inner face of each half
    const diff = mat(bar, new THREE.MeshStandardMaterial({color: '#e9eaec', roughness: 0.55, emissive: '#ffffff', emissiveMap: rgbTex, emissiveIntensity: 0.85, transparent: true, opacity: 0.94}));
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, SPREADER.lightH, zIn * 2 - 0.2), diff);
    m.position.set(0, SPREADER.lightY0 + SPREADER.lightH / 2, 0);
    m.castShadow = true;
    bar.group.add(m);
    // the dark carrier the diffuser clips into
    const car = mat(bar, new THREE.MeshStandardMaterial({color: '#202226', roughness: 0.6}));
    const c = shadow(new THREE.Mesh(new THREE.BoxGeometry(L + 2, 1.6, zIn * 2 - 0.2), car));
    c.position.set(0, SPREADER.lightY0 - 0.8, 0);
    bar.group.add(c);
  }

  // ------------------------------------------------------------ thermal pad (over the 8 DRAMs)
  const pad = part('pad');
  {
    const pm = mat(pad, new THREE.MeshStandardMaterial({color: '#8fa3b5', roughness: 0.9, transparent: true, opacity: 0.88}));
    const m = shadow(new THREE.Mesh(new THREE.BoxGeometry(DRAM_X[7] - DRAM_X[0] + DRAM_SIZE[0] + 2, DRAM_SIZE[1] + 1, PAD_T), pm));
    m.position.set(((DRAM_X[0] + DRAM_X[7]) / 2) - CX, DRAM_Y, ZF + DRAM_SIZE[2] + PAD_T / 2);
    pad.group.add(m);
  }

  // ------------------------------------------------------------ the two aluminium halves
  const halfShape = () => {
    const s = new THREE.Shape();
    const y0 = SPREADER.y0;
    s.moveTo(-CX + 1.5, y0);
    s.lineTo(CX - 1.5, y0);
    s.lineTo(CX, y0 + 1.5);
    s.lineTo(CX, MODULE_H - 6);
    s.lineTo(CX - 14, MODULE_H);
    s.lineTo(-CX + 14, MODULE_H);
    s.lineTo(-CX, MODULE_H - 6);
    s.lineTo(-CX, y0 + 1.5);
    s.closePath();
    return s;
  };
  for (const [name, side] of [['front', 1], ['back', -1]]) {
    const p = part(name);
    const t = SPREADER.t;
    const geo = regroup(new THREE.ExtrudeGeometry(halfShape(), {depth: t - 0.6, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.35, bevelSegments: 2, curveSegments: 4}));
    // the inner face: bare aluminium with the pad's footprint
    const face = mat(p, new THREE.MeshStandardMaterial({map: spreaderTexture(side < 0), roughness: 0.42, metalness: 0.75, envMapIntensity: 0.6}));
    const rim = mat(p, new THREE.MeshStandardMaterial({color: '#aeb2b8', roughness: 0.4, metalness: 0.8, envMapIntensity: 0.6}));
    const inner = mat(p, new THREE.MeshStandardMaterial({color: '#9a9ea4', roughness: 0.6, metalness: 0.6, envMapIntensity: 0.5}));
    const m = shadow(new THREE.Mesh(geo, [face, rim, inner]));
    const zIn = ZF + DRAM_SIZE[2] + PAD_T;
    if (side > 0) m.position.z = zIn + 0.3;
    else {
      m.rotation.y = Math.PI;
      m.position.z = -zIn - 0.3;
    }
    p.group.add(m);
    // the "wing": a flared upper lip along the top edge
    const wing = shadow(new THREE.Mesh(new THREE.BoxGeometry(PCB.w - 30, 4, 0.9), rim));
    wing.position.set(0, MODULE_H - 2.2, side * (zIn + t + 0.25));
    wing.rotation.x = side * 0.32;
    p.group.add(wing);
  }

  // ------------------------------------------------------------ pulses: data bits on the DQ lines, power from 5 V
  const PULSES = 8 * 8 + 24;
  const pulseM = new THREE.MeshBasicMaterial({color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.95, depthTest: true});
  const pulses = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 1.1, 0.25), pulseM, PULSES);
  pulses.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PULSES * 3), 3);
  pulses.frustumCulled = false;
  pulses.name = 'pulses';
  root.add(pulses);
  const COL = {A: new THREE.Color('#2f7de1'), B: new THREE.Color('#d6182b'), P: new THREE.Color('#f08a23')};

  // ------------------------------------------------------------ clipping (section through a DRAM column)
  const CLIP = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  const allMats = Object.values(parts).flatMap((p) => p.mats);

  const hsv = new THREE.Color();
  const tmp = new THREE.Matrix4();
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const fade = {};
  for (const k of Object.keys(parts)) fade[k] = 1;

  // state: {e, tns, profile, iso, vis: {part: 0..1}, cut, rgbT, flow: 'data'|'power'}
  function update(st) {
    const ex = explode(st.e);
    parts.front.group.position.set(...ex.front);
    parts.back.group.position.set(...ex.back);
    parts.bar.group.position.set(...ex.light);
    parts.pad.group.position.set(ex.pad[0], ex.pad[1], ex.pad[2]);

    // fades for isolate and the x-ray cut
    for (const [k, p] of Object.entries(parts)) {
      let o = st.vis[k] ?? 1;
      if (st.cut === 'xray' && (k === 'front' || k === 'back' || k === 'pad')) o = Math.min(o, 0.22);
      fade[k] = o;
      p.group.visible = o > 0.015;
      for (const m of p.mats) {
        const b = m.userData.base;
        const tr = o < 0.999 || b.transparent;
        if (m.transparent !== tr) {
          m.transparent = tr;
          m.needsUpdate = true;
        }
        m.opacity = b.opacity * o;
        m.depthWrite = o > 0.6;
        const clip = st.cut === 'section' ? [CLIP] : null;
        if ((m.clippingPlanes?.length ?? 0) !== (clip ? 1 : 0)) {
          m.clippingPlanes = clip;
          m.side = clip ? THREE.DoubleSide : THREE.FrontSide;
          m.needsUpdate = true;
        }
      }
    }
    CLIP.constant = -(st.cutX ?? 0);

    // the RGB wave: a rainbow drifting along the bar
    for (let i = 0; i < N; i++) {
      hsv.setHSL((((i / N) * 0.9 - st.rgbT * 0.18) % 1 + 1) % 1, 0.9, 0.55);
      rgbData[i * 4] = hsv.r * 255;
      rgbData[i * 4 + 1] = hsv.g * 255;
      rgbData[i * 4 + 2] = hsv.b * 255;
      rgbData[i * 4 + 3] = 255;
    }
    rgbTex.needsUpdate = true;
    for (const l of ledMats) {
      hsv.setHSL((((l.u * 0.9 - st.rgbT * 0.18) % 1) + 1) % 1, 0.9, 0.55);
      l.m.emissive.copy(hsv);
    }

    // DRAM activity: a chip glows while its subchannel is busy with it
    const busy = {A: busState('A', st.tns, st.profile), B: busState('B', st.tns, st.profile)};
    chipMats.forEach((m, i) => {
      const b = busy[i < 4 ? 'A' : 'B'];
      const mine = b.mode !== 'idle' && b.r.chip === i % 4;
      // on a one-rank x8 module every chip of a subchannel answers together; the lit one is the bank being opened
      const all = b.mode === 'data';
      m.emissiveIntensity = (mine ? 0.35 : 0) + (all ? 0.18 : 0);
    });
    parts.pmic.top.emissiveIntensity = st.flow === 'power' ? 0.25 + 0.15 * Math.sin(st.rgbT * 6) : 0;
    parts.spd.top.emissiveIntensity = st.iso === 'spd' ? 0.25 + 0.2 * Math.max(0, Math.sin(st.rgbT * 3)) : 0;

    // pulses
    let n = 0;
    const put = (x, y, z, c, s = 1) => {
      tmp.makeScale(s, s, s).setPosition(x, y, z);
      pulses.setMatrixAt(n, tmp);
      pulses.setColorAt(n, c);
      n++;
    };
    const zP = ZF + 0.2;
    const dataVis = Math.min(fade.dram, fade.pcb);
    if (st.flow === 'data' && dataVis > 0.3) {
      for (const sub of ['A', 'B']) {
        const b = busy[sub];
        if (b.mode !== 'data') continue;
        const k = (st.tns - b.r.d0) / (b.r.d1 - b.r.d0); // 0..1 through the burst
        for (let c = 0; c < 4; c++) {
          const cx = DRAM_X[(sub === 'A' ? 0 : 4) + c];
          for (let bit = 0; bit < 8; bit++) {
            const ph = (k * 4 + bit * 0.37) % 1; // dots stream along the DQ lines, 16 beats
            const yy = b.r.write ? 4.4 + ph * 6.5 : 10.9 - ph * 6.5;
            put(cx - 3.5 + bit, yy, zP, COL[sub]);
          }
        }
      }
    }
    if (st.flow === 'power') {
      for (let i = 0; i < 24; i++) {
        const ph = (st.rgbT * 0.45 + i / 24) % 1;
        if (i < 6) {
          // 5 V in from the contacts up to the PMIC
          put(PMIC_POS[0] - CX - 1.5 + (i % 3) * 1.5, 4.5 + ph * 18, zP, COL.P, 0.9);
        } else {
          // regulated rails out along the board to every chip
          const left = i % 2 === 0;
          const x = PMIC_POS[0] + (left ? -1 : 1) * (6 + ph * 54);
          put(x - CX, PMIC_POS[1] + ((i >> 1) % 3) * 0.9 - 0.5, zP, COL.P, 0.8);
        }
      }
    }
    for (let i = n; i < PULSES; i++) pulses.setMatrixAt(i, hide);
    pulses.count = PULSES;
    pulses.instanceMatrix.needsUpdate = true;
    if (pulses.instanceColor) pulses.instanceColor.needsUpdate = true;
  }

  // anchors for callouts, in module mm, by part (they follow the part's explode offset)
  const anchor = (name, x, y, z) => {
    const g = parts[name].group;
    return () => {
      const v = new THREE.Vector3(x - CX, y, z).add(g.position).multiplyScalar(S);
      return [v.x, v.y, v.z];
    };
  };
  const zIn = ZF + DRAM_SIZE[2] + PAD_T;
  const anchors = {
    front: anchor('front', 30, 36, zIn + 2.2),
    back: anchor('back', 110, 36, -zIn - 2.2),
    bar: anchor('bar', 100, SPREADER.lightY0 + SPREADER.lightH, 0),
    leds: anchor('light', LEDS[5], 30.8, ZF + 0.6),
    rgbc: anchor('light', RGBC_POS[0], RGBC_POS[1] + 1, ZF + 0.7),
    pad: anchor('pad', 40, DRAM_Y, ZF + 1.6),
    pcb: anchor('pcb', 125, 26, ZF),
    notch: anchor('pcb', PIN.notchX, 1, ZF),
    fingers: anchor('pcb', 24, 2.5, ZF + 0.05),
    dramA: anchor('dram', DRAM_X[1], DRAM_Y + 5.5, ZF + 1),
    dramB: anchor('dram', DRAM_X[6], DRAM_Y + 5.5, ZF + 1),
    pmic: anchor('pmic', PMIC_POS[0], PMIC_POS[1] + 1.5, ZF + 0.8),
    spd: anchor('spd', SPD_POS[0], SPD_POS[1] - 1.5, ZF + 0.8),
  };
  return {root, parts, update, anchors, CLIP, toWorld, chipMats};
}
