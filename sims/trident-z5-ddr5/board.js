// GIGABYTE X870E AORUS PRO ICE（技嘉 X870E 冰雕）: the whole ATX board in white and silver. Layout read off the user's
// manual (§1-1, drawn to the 244 × 305 mm outline): AM5 socket, the I/O shroud and VRM heatsinks, four DDR5 sockets
// (DDR5_A1 A2 B1 B2 from the CPU toward the 24-pin) with clips at both ends as the manual draws them, 24-pin and 2 × 8-pin
// power, the PCIe 5.0 x16 slot with its metal armour, the M.2 and chipset heatsinks. Heights and small parts are 估算.
// The daisy-chain traces printed on the PCB are a diagram (real traces are on inner layers).
import * as THREE from 'three';
import {BOARD, ICE, PCB, PIN, SLOTS, slotZ, toScene} from './kin.js';

const S = 0.01;
const FONT = 'Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const CX = PCB.w / 2;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// the PCB top: canvas X = by, canvas Y = 244 - bx (that is how the box's +y face is mapped)
function pcbTexture() {
  const px = 4;
  return canvasTex(ICE.H * px, ICE.W * px, (g) => {
    const P = (bx, by) => [by * px, (ICE.W - bx) * px];
    const at = (bx, by, rot, f) => {
      g.save();
      g.translate(...P(bx, by));
      g.rotate(rot);
      f();
      g.restore();
    };
    const UP = -Math.PI / 2; // text upright on the board
    const VERT = Math.PI; // text reading bottom → top
    g.fillStyle = '#e4e7ea';
    g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    // the ICE PCB's pale grey graphic: a few long diagonal bands
    g.strokeStyle = 'rgba(150,158,168,0.22)';
    g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.moveTo(...P(150 + i * 6, 175));
      g.lineTo(...P(240, 175 + (90 - i * 6) * 0.9));
      g.stroke();
    }
    // mounting holes (ATX positions, 估算 from the layout)
    g.fillStyle = '#c9ced4';
    for (const [bx, by] of [[45, 150], [63, 150], [233, 10], [233, 135], [233, 290], [45, 290], [160, 10], [160, 290], [10, 10]]) {
      g.beginPath();
      g.arc(...P(bx, by), 4.5 * px, 0, Math.PI * 2);
      g.fill();
    }
    // daisy-chain diagram: CPU → slot 1 → slot 2 (the end). Channel A on the upper half, B on the lower half
    const s0 = ICE.dimmBx0;
    const sp = ICE.pitch;
    const chain = (by0, xs, col) => {
      for (let i = 0; i < 6; i++) {
        const by = by0 + i * 2.6;
        g.strokeStyle = col;
        g.lineWidth = 3.2;
        g.beginPath();
        g.moveTo(...P(ICE.cpu[0] + 21, by));
        g.lineTo(...P(xs[1], by));
        g.stroke();
        g.fillStyle = col;
        for (const x of xs) {
          g.beginPath();
          g.arc(...P(x, by), 2.2, 0, Math.PI * 2);
          g.fill();
        }
      }
    };
    chain(64, [s0, s0 + sp], 'rgba(176,138,64,0.85)');
    chain(104, [s0 + 2 * sp, s0 + 3 * sp], 'rgba(176,138,64,0.85)');
    // silkscreen: the model name beside the slots, the slot names under them, the status-LED legend
    g.fillStyle = '#7d8590';
    g.font = `800 ${7.2 * px}px ${FONT}`;
    at(170, 150, VERT, () => g.fillText('X870E AORUS PRO ICE', 0, 0));
    g.font = `700 ${3.0 * px}px ${FONT}`;
    for (let i = 0; i < 4; i++) at(s0 + i * sp + 1.2, 183, VERT, () => g.fillText(`DDR5_${SLOTS[i]}`, 0, 0));
    g.font = `600 ${2.4 * px}px ${FONT}`;
    at(219, 46, UP, () => g.fillText('CPU  DRAM', 0, 0));
    at(219, 50, UP, () => g.fillText('VGA  BOOT', 0, 0));
    at(226, 128, UP, () => g.fillText('ATX', 0, 0));
    at(48, 12.5, UP, () => g.fillText('12V_2X4_2   12V_2X4_1', 0, 0));
    at(46, 179, UP, () => g.fillText('PCIEX16', 0, 0));
    g.font = `700 ${3.4 * px}px ${FONT}`;
    at(100, 50, UP, () => g.fillText('Socket AM5', 0, 0));
  });
}

function logoTexture(w, h, text, size) {
  return canvasTex(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#eef0f2');
    gr.addColorStop(1, '#d9dde2');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,128,138,0.25)';
    g.lineWidth = 2;
    for (let y = 6; y < h; y += 9) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + 0.3 * w * 0.05);
      g.stroke();
    }
    if (!text) return;
    const lg = g.createLinearGradient(w * 0.2, 0, w * 0.8, 0);
    lg.addColorStop(0, '#6fd0ff');
    lg.addColorStop(0.5, '#c48bff');
    lg.addColorStop(1, '#ff8fc8');
    g.fillStyle = lg;
    g.font = `900 italic ${size}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  });
}

export function buildBoard() {
  const root = new THREE.Group();
  root.scale.setScalar(S);
  const top = -BOARD.sockH;
  const white = new THREE.MeshStandardMaterial({color: '#f3f4f6', roughness: 0.55});
  const silver = new THREE.MeshStandardMaterial({color: '#dde1e6', roughness: 0.32, metalness: 0.75});
  const steel = new THREE.MeshStandardMaterial({color: '#c3c8ce', roughness: 0.28, metalness: 0.9});
  const dark = new THREE.MeshStandardMaterial({color: '#2b2f35', roughness: 0.7});
  const gap = new THREE.MeshStandardMaterial({color: '#15171a', roughness: 0.9});
  // a box spanning board coordinates bx0..bx1 × by0..by1, h tall, standing on the PCB (or at y0)
  const box = (mat, bx0, bx1, by0, by1, h, y0 = top, parent = root) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(by1 - by0, h, bx1 - bx0), mat);
    const [x, z] = toScene((bx0 + bx1) / 2, (by0 + by1) / 2);
    m.position.set(x, y0 + h / 2, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const faceMat = (tex) => [white, white, new THREE.MeshStandardMaterial({map: tex, roughness: 0.35, metalness: 0.45}), white, white, white];

  // PCB 244 × 305 × 1.6
  const edge = new THREE.MeshStandardMaterial({color: '#cfd3d8', roughness: 0.7});
  const pcb = box([edge, edge, new THREE.MeshStandardMaterial({map: pcbTexture(), roughness: 0.62, metalness: 0.05}), edge, edge, edge], 0, ICE.W, 0, ICE.H, 1.6, top - 1.6);
  pcb.castShadow = false;

  // rear I/O shroud (integrated I/O shield with the AORUS RGB logo) and the VRM heatsinks around the socket (估算 outline)
  box(faceMat(logoTexture(472, 232, 'AORUS', 120)), 0, 58, 14, 132, 34);
  box(dark, -0.5, 1, 18, 128, 26, top + 4); // the port openings seen from the edge
  box(faceMat(logoTexture(256, 96, '', 0)), 62, 150, 14, 36, 26);
  // EPS 12 V 2 × 8 pin (12V_2X4_2, 12V_2X4_1) at the top edge
  for (const [a, b] of [[40, 58], [60, 79]]) {
    box(white, a, b, 1.5, 11.5, 13);
    box(gap, a + 1.2, b - 1.2, 2.7, 10.3, 0.4, top + 13);
  }
  // fan headers, power / reset, debug LED, the four status LEDs (CPU DRAM VGA BOOT)
  for (const a of [150, 171, 187]) box(white, a, a + 12, 3, 9, 7);
  box(white, 220, 225, 2.5, 7.5, 4);
  box(white, 227, 232, 2.5, 7.5, 4);
  box(dark, 228, 240, 20, 31, 3);
  const ledM = {};
  for (const [name, bx, by] of [['CPU', 222, 35.5], ['DRAM', 236, 35.5], ['VGA', 222, 39], ['BOOT', 236, 39]]) {
    ledM[name] = new THREE.MeshStandardMaterial({color: '#e8eaec', emissive: new THREE.Color('#ff7a1a'), emissiveIntensity: 0});
    box(ledM[name], bx - 1.5, bx + 1.5, by - 0.8, by + 0.8, 0.8);
  }
  // 24-pin ATX main power (right edge), front USB-C header, SATA, battery
  box(white, 231, 242, 62, 115, 13);
  box(gap, 232.5, 240.5, 63.5, 113.5, 0.4, top + 13);
  box(white, 229, 236, 158, 170, 6);
  box(white, 230, 243, 216, 238, 9);
  {
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 3.2, 32), steel);
    const [x, z] = toScene(214, 273);
    bat.position.set(x, top + 1.6, z);
    root.add(bat);
  }
  // bottom-edge headers (F_PANEL, USB, fans), white
  for (const [a, b] of [[30, 42], [52, 68], [72, 86], [94, 106], [110, 122], [140, 158], [162, 170], [176, 184], [190, 198], [208, 230]]) box(white, a, b, 293, 300, 7);

  // AM5: the retention brackets, the load plate frame, the CPU (40 × 40 mm package, IHS) and the lever
  const [cbx, cby] = ICE.cpu;
  box(white, cbx - 24, cbx + 24, cby - 34, cby - 26, 6);
  box(white, cbx - 24, cbx + 24, cby + 26, cby + 34, 6);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 7, 16), steel);
      const [x, z] = toScene(cbx + sx * 27, cby + sy * 30);
      sc.position.set(x, top + 3.5, z);
      root.add(sc);
    }
  }
  box(steel, cbx - 23, cbx + 23, cby - 24, cby - 20, 3);
  box(steel, cbx - 23, cbx + 23, cby + 20, cby + 24, 3);
  box(steel, cbx - 23, cbx - 19, cby - 20, cby + 20, 3);
  box(steel, cbx + 19, cbx + 23, cby - 20, cby + 20, 3);
  box(new THREE.MeshStandardMaterial({color: '#2f6b3c', roughness: 0.6}), cbx - 20, cbx + 20, cby - 20, cby + 20, 1.2, top + 1);
  const ihs = box(new THREE.MeshStandardMaterial({color: '#c6cacf', metalness: 0.85, roughness: 0.3}), cbx - 15.5, cbx + 15.5, cby - 18, cby + 18, 4, top + 2.2);
  box(steel, cbx + 24, cbx + 26, cby - 18, cby + 22, 2.4); // lever

  // M.2: M2A heatsink between socket and the x16 slot, the big lower heatsink, the chipset heatsink with its logo
  box(faceMat(logoTexture(256, 96, '', 0)), 40, 150, 141, 176, 9);
  box(faceMat(logoTexture(512, 300, '', 0)), 40, 150, 193, 262, 8);
  box(faceMat(logoTexture(300, 300, 'AORUS', 70)), 156, 224, 192, 262, 10);
  // PCIe 5.0 x16 (UD Slot X: metal armour) and the two x4-wired full-length slots
  box(steel, 41, 144, 180, 188.5, 11);
  box(gap, 43, 142, 183.6, 185, 0.4, top + 11);
  box(white, 144, 150, 178.5, 190, 12); // EZ-Latch Plus end
  box(white, 41, 144, 264, 271.5, 11); // PCIEX4_1
  box(white, 41, 144, 282, 289.5, 11); // PCIEX4_2

  // the DDR5 sockets: body with stainless side shields (Memory UD Slot D5), the key ridge, clips at both ends
  const keyM = new THREE.MeshStandardMaterial({color: '#d0d3d7', roughness: 0.6, emissive: new THREE.Color('#d6182b'), emissiveIntensity: 0});
  const latchM = new THREE.MeshStandardMaterial({color: '#f6f7f8', roughness: 0.45});
  const latches = {};
  const keys = {};
  const nx = PIN.notchX - CX;
  const bodyL = BOARD.sockL - 12;
  for (const s of SLOTS) {
    const z = slotZ(s);
    const b = new THREE.Mesh(new THREE.BoxGeometry(bodyL, BOARD.sockH, BOARD.sockW), white);
    b.position.set(0, top + BOARD.sockH / 2, z);
    b.castShadow = b.receiveShadow = true;
    root.add(b);
    for (const sd of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(bodyL - 6, BOARD.sockH - 1.5, 0.3), steel);
      sh.position.set(0, top + (BOARD.sockH - 1.5) / 2, z + sd * (BOARD.sockW / 2 + 0.15));
      root.add(sh);
    }
    const slit = new THREE.Mesh(new THREE.BoxGeometry(PCB.w + 0.6, 0.2, 1.7), gap);
    slit.position.set(0, 0.01, z);
    root.add(slit);
    const k = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.8), keyM.clone());
    k.position.set(nx, 0.3, z);
    root.add(k);
    keys[s] = k;
    // a clip at each end, hinged at its foot; dir = +1 on the bottom (+x) end, −1 on the top end
    latches[s] = [-1, 1].map((dir) => {
      const piv = new THREE.Group();
      piv.position.set(dir * (CX + 1.2), top + 1, z);
      const l = new THREE.Mesh(new THREE.BoxGeometry(3.6, 20, BOARD.sockW), latchM);
      l.position.set(dir * 1.8, 10, 0);
      l.castShadow = true;
      const hook = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, BOARD.sockW - 1), latchM);
      hook.position.set(-dir * 0.4, 9, 0);
      l.add(hook);
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, BOARD.sockW - 1.2), new THREE.MeshStandardMaterial({color: '#cfd3d8', roughness: 0.5}));
      rib.position.set(dir * 1.9, 5, 0);
      l.add(rib);
      piv.add(l);
      piv.userData.dir = dir;
      root.add(piv);
      return piv;
    });
  }
  // press arrows (thumbs on both ends)
  const arrowM = new THREE.MeshBasicMaterial({color: '#d6182b', toneMapped: false});
  const arrows = [-48, 48].map((x) => {
    const a = new THREE.Mesh(new THREE.ConeGeometry(3, 7, 16), arrowM);
    a.rotation.x = Math.PI;
    a.userData.x = x;
    root.add(a);
    return a;
  });
  const anchor = (x, y, z) => () => [x * S, y * S, z * S];
  const onBoard = (bx, by, y) => {
    const [x, z] = toScene(bx, by);
    return anchor(x, y, z);
  };
  const latchTip = (s, i) => () => {
    const p = new THREE.Vector3(latches[s][i].userData.dir * 1.8, 19, 0).applyMatrix4(latches[s][i].matrix).multiplyScalar(S);
    return [p.x, p.y, p.z];
  };
  const endY = top + BOARD.sockH + 7;
  const anchors = {
    A1: anchor(-CX - 2.4, endY, slotZ('A1')),
    A2: anchor(-CX - 2.4, endY, slotZ('A2')),
    B1: anchor(-CX - 2.4, endY, slotZ('B1')),
    B2: anchor(-CX - 2.4, endY, slotZ('B2')),
    A1b: anchor(CX + 2.4, endY, slotZ('A1')),
    A2b: anchor(CX + 2.4, endY, slotZ('A2')),
    B1b: anchor(CX + 2.4, endY, slotZ('B1')),
    B2b: anchor(CX + 2.4, endY, slotZ('B2')),
    cpu: () => [ihs.position.x * S, (top + 6.2) * S, ihs.position.z * S],
    latchA2: latchTip('A2', 0),
    latchA2b: latchTip('A2', 1),
    keyA2: anchor(nx, 0.6, slotZ('A2')),
    keyB2: anchor(nx, 0.6, slotZ('B2')),
    traceA: onBoard(ICE.cpu[0] + 35, 70, top),
    traceB: onBoard(ICE.cpu[0] + 35, 110, top),
    atx: onBoard(236, 88, top + 13),
    eps: onBoard(59, 6, top + 13),
    vrm: onBoard(30, 70, top + 34),
    pcie: onBoard(95, 184, top + 11),
    m2: onBoard(95, 158, top + 9),
    led: onBoard(236, 35.5, top + 1),
  };
  // pose(p, t): clips from the install pose, the key glows while aligning, arrows bob while pressing, the DRAM LED
  const pose = (p, t) => {
    for (const s of SLOTS) for (const l of latches[s]) l.rotation.z = -0.6 * p.latch[s] * l.userData.dir;
    for (const s of SLOTS) keys[s].material.emissiveIntensity = p.align === s ? 0.6 + 0.3 * Math.sin(t * 8) : 0;
    const m = p.press1 ? p.m1 : p.press2 ? p.m2 : null;
    for (const a of arrows) {
      a.visible = !!m;
      if (m) a.position.set(a.userData.x + m[0], m[1] + 44 + 9 + 2.5 * Math.sin(t * 9), m[2]);
    }
    root.updateMatrixWorld();
  };
  return {root, pose, anchors, top: top - 1.6};
}
