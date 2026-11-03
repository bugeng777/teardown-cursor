// The module as a page you drive: views, isolates, cutaways, the two profiles, the disassembly slider, an orbit you
// drag and a zoom on the wheel. Left alone it plays tour.js's SCRIPT with the operator's cursor, looped; a click, drag,
// wheel or key hands control to the visitor, 25 s of quiet hands it back.
import {createConsole, VIEWS, ISOS, CUTS, PROFS} from './console.js';
import {installPhase} from './kin.js';
import {CALLOUTS, DURATION, INFO, ISO, K_DUR, SCRIPT, tourCursor, tourState, VIEW_FN} from './tour.js';
import {DRAM_X, PCB} from './kin.js';
import {createStage} from './stage.js';

const W = 1600;
const H = 900;
const IDLE = 25;
const RATE = 6; // simulated ns per real second
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const PARTS = ['front', 'back', 'bar', 'light', 'pad', 'pcb', 'dram', 'pmic', 'spd'];

const CSS = `
html,body{margin:0;background:#ecedef;overflow:hidden}
#app{position:absolute!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#gl{position:absolute;left:0;top:0;width:${W}px;height:${H}px;touch-action:none;cursor:grab}
#gl.drag{cursor:grabbing}
.tb{pointer-events:auto;cursor:pointer}
.tb:hover{filter:brightness(.95)}
.hit{position:absolute;pointer-events:auto;cursor:ew-resize}
.tourchip{position:absolute;left:800px;top:30px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:24px;padding:0 12px;border:1px solid #e1e3e6;background:rgba(255,255,255,.95);color:#16181b;font:600 11px Inter,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;letter-spacing:.6px;white-space:nowrap;cursor:pointer;pointer-events:auto}
.tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#d6182b}
.tourchip.on i{animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.15}}
`;

export function runLive() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.title = '芝奇幻光戟 Trident Z5 RGB · DDR5 内存拆解';
  const app = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  app.appendChild(canvas);
  const st = createStage({canvas});
  const ui = createConsole(app);

  // ------------------------------------------------------------ quality tiers (integrated GPUs get tier 1-2)
  const TIERS = [{shadow: 2048, pr: 2}, {shadow: 1024, pr: 1.25}, {shadow: 512, pr: 1}];
  const q = new URLSearchParams(location.search);
  const light = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  let tier = q.has('tier') ? +q.get('tier') : light ? 2 : 1;
  let scale = 1;
  const fit = () => {
    scale = Math.min(innerWidth / W, innerHeight / H);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${(innerHeight - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.75, TIERS[tier].pr));
  };
  const applyTier = () => {
    st.setQuality(TIERS[tier]);
    fit();
  };
  applyTier();
  addEventListener('resize', fit);
  const toStage = (cx, cy) => {
    const r = app.getBoundingClientRect();
    return [(cx - r.left) / scale, (cy - r.top) / scale];
  };
  const tourChip = document.createElement('div');
  tourChip.className = 'tourchip';
  ui.root.appendChild(tourChip);

  // ------------------------------------------------------------ state
  let T = 0;
  let tns = 40;
  let paused = false;
  let hidden = false;
  const S = {view: 'hero', viewAt: 0, iso: 'all', e: 0, eTarget: 0, cut: 'solid', profile: 'xmp', info: 'intro', mode: 'teardown', k: 0, kTarget: 0, kAuto: false};
  const vis = Object.fromEntries(PARTS.map((k) => [k, 1]));
  const off = {az: 0, el: 0, k: 1};
  const cam = {...VIEW_FN.hero(0, 0)};
  let ring = {t: -9, x: 0, y: 0};
  const pulse = (k) => (ring = {t: T, x: ui.spots[k][0], y: ui.spots[k][1]});

  const AP = {on: !q.has('notour'), t0: 0};
  let lastInput = 0;
  const startTour = () => {
    AP.on = true;
    AP.t0 = T;
    paused = false;
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  const takeOver = () => {
    lastInput = T;
    if (!AP.on) return;
    AP.on = false;
    const ts = tourState((T - AP.t0) % DURATION);
    Object.assign(S, ts, {viewAt: T, eTarget: ts.e, kTarget: ts.k, kAuto: ts.mode === 'install' && ts.k < 1});
  };
  tourChip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastInput = T;
    if (AP.on) takeOver();
    else startTour();
  });
  addEventListener('pointerdown', (e) => {
    if (e.target !== tourChip) takeOver();
  });

  // ------------------------------------------------------------ controls
  const setView = (v) => {
    S.view = v;
    S.viewAt = T;
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  const leaveInstall = () => {
    if (S.mode !== 'install') return;
    S.mode = 'teardown';
    S.k = S.kTarget = 0;
    S.kAuto = false;
  };
  const click = (k, fn, keep = false) =>
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulse(k);
      if (!keep) leaveInstall();
      fn();
    });
  for (const k of VIEWS)
    click(k, () => {
      setView(k);
      if (k === 'fingers') S.info = 'notch';
    });
  for (const k of ISOS)
    click(k, () => {
      S.iso = k;
      const c = ISO[k];
      if (k === 'all') S.info = S.eTarget > 0.5 ? 'explode' : 'intro';
      else {
        S.eTarget = Math.max(S.eTarget, c.e);
        S.info = k;
        if (S.cut === 'section') S.cut = 'solid';
      }
      setView(c.view || 'hero');
    });
  for (const k of CUTS)
    click(k, () => {
      S.cut = k;
      if (k === 'section') {
        S.eTarget = 0;
        S.iso = 'all';
        S.info = 'section';
        setView('section');
      } else if (S.view === 'section') setView('hero');
    });
  for (const k of PROFS)
    click(k, () => {
      S.profile = k;
      if (S.mode !== 'install') S.info = 'profile';
    }, true);
  // installation: the kit into A2 and B2, played at a steady rate; the slider scrubs it
  click('install', () => {
    S.mode = 'install';
    S.eTarget = S.e = 0;
    S.iso = 'all';
    S.cut = 'solid';
    S.k = 0;
    S.kTarget = 1;
    S.kAuto = true;
    S.info = 'install';
    setView('install');
  }, true);
  // the board on its own: the whole X870E AORUS PRO ICE before anything goes in
  click('board', () => {
    S.mode = 'install';
    S.eTarget = S.e = 0;
    S.iso = 'all';
    S.cut = 'solid';
    S.k = S.kTarget = 0;
    S.kAuto = false;
    S.info = 'installBoard';
    setView('board');
  }, true);
  click('why', () => {
    if (S.mode !== 'install') {
      S.mode = 'install';
      S.eTarget = S.e = 0;
      S.iso = 'all';
      S.cut = 'solid';
    }
    S.k = S.kTarget = 1;
    S.kAuto = false;
    S.info = 'installWhy';
    setView('boardtop');
  }, true);
  click('exit', () => {
    S.info = 'intro';
    setView('hero');
  });
  click('open', () => {
    S.eTarget = 1;
    S.info = 'explode';
  });
  click('close', () => {
    S.eTarget = 0;
    S.iso = 'all';
    S.info = 'intro';
    if (S.view !== 'section') setView('hero');
  });
  click('pause', () => (paused = !paused), true);
  // the disassembly slider
  {
    const [x0, y] = ui.knob(0);
    const [x1] = ui.knob(1);
    const d = document.createElement('div');
    d.className = 'hit';
    Object.assign(d.style, {left: `${x0 - 8}px`, top: `${y - 11}px`, width: `${x1 - x0 + 16}px`, height: '22px'});
    const move = (e) => {
      const [x] = toStage(e.clientX, e.clientY);
      const v = clamp((x - x0) / (x1 - x0), 0, 1);
      if (S.mode === 'install') {
        S.kTarget = v;
        S.kAuto = false;
        if (S.info === 'installWhy') S.info = 'install';
        if (S.view !== 'install') setView('install');
        if (S.info === 'installBoard') S.info = 'install';
      } else {
        S.eTarget = v;
        if (S.eTarget > 0.05 && S.info === 'intro') S.info = 'explode';
      }
      lastInput = T;
    };
    d.addEventListener('pointerdown', (e) => {
      takeOver();
      d.setPointerCapture(e.pointerId);
      const up = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      move(e);
    });
    ui.root.appendChild(d);
  }
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    takeOver();
    const v = {1: 'hero', 2: 'front', 3: 'top', 4: 'fingers', 5: 'rear'}[key];
    if (v) setView(v);
    else if (key === ' ') paused = !paused;
    else if (key === 'h') hidden = !hidden;
    else if (key === 'e') S.eTarget = S.eTarget > 0.5 ? 0 : 1;
    else return;
    e.preventDefault();
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = {x: e.clientX, y: e.clientY};
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    off.az += ((e.clientX - drag.x) / scale) * 0.3;
    off.el = clamp(off.el + ((e.clientY - drag.y) / scale) * 0.2, -20, 70);
    drag = {x: e.clientX, y: e.clientY};
    lastInput = T;
  });
  const endDrag = () => {
    drag = null;
    canvas.classList.remove('drag');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeOver();
      off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.35, 2.2);
    },
    {passive: false},
  );

  // ------------------------------------------------------------ frame
  let prev = null;
  let slow = 0;
  let fast = 0;
  const cutX = (DRAM_X[2] - PCB.w / 2) * 0.01;
  const frame = (now) => {
    const dt = prev === null ? 1 / 60 : Math.min(0.1, (now - prev) / 1000);
    prev = now;
    T += dt;
    // adaptive quality: drop a tier when frames run long for a while
    if (dt > 1 / 40) slow += dt;
    else slow = Math.max(0, slow - dt * 0.5);
    if (dt < 1 / 55) fast += dt;
    else fast = 0;
    if (slow > 2.5 && tier < TIERS.length - 1) {
      tier++;
      slow = 0;
      applyTier();
    }

    let cursor;
    let tgt;
    let cur = S;
    if (AP.on) {
      const tt = (T - AP.t0) % DURATION;
      const ts = tourState(tt);
      cur = {...S, ...ts, eTarget: ts.e};
      S.e = cur.e = S.e + (ts.e - S.e) * (1 - Math.exp(-dt / 0.6));
      Object.assign(S, {view: ts.view, iso: ts.iso, cut: ts.cut, profile: ts.profile, info: ts.info, eTarget: ts.e, mode: ts.mode, k: ts.k});
      tgt = VIEW_FN[ts.view](tt - ts.viewAt, S.e, S.k);
      cursor = tourCursor(tt, ui.spots);
    } else {
      if (T - lastInput > IDLE && !q.has('notour')) startTour();
      S.e += (S.eTarget - S.e) * (1 - Math.exp(-dt / 0.6));
      if (S.kAuto) {
        S.k = Math.min(1, S.k + dt / K_DUR);
        if (S.k >= 1) S.kAuto = false;
      } else S.k += (S.kTarget - S.k) * (1 - Math.exp(-dt / 0.25));
      tgt = VIEW_FN[S.view](T - S.viewAt, S.e, S.k);
      tgt.az += off.az;
      tgt.el = clamp(tgt.el + off.el, -15, 80);
      tgt.d *= off.k;
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y};
    }
    if (!paused) tns += dt * RATE;
    const k = 1 - Math.exp(-dt / (AP.on ? 0.5 : 0.45));
    cam.az += wrap(tgt.az - cam.az) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd', 'sx', 'sy']) cam[key] += (tgt[key] - cam[key]) * k;
    // isolate fades
    const iso = ISO[S.iso];
    const kv = 1 - Math.exp(-dt / 0.3);
    for (const p of PARTS) vis[p] += ((iso.vis[p] ?? 1) - vis[p]) * kv;

    const flow = S.mode === 'install' ? 'none' : iso.flow || 'data';
    st.frame({e: S.e, tns, profile: S.profile, iso: S.iso, vis, cut: S.cut, cutX, rgbT: T, flow, mode: S.mode, k: S.k, kit: S.view !== 'board'}, {...cam, az: cam.az * D2R, el: cam.el * D2R});

    // callouts for what is on screen now
    const ph = S.mode === 'install' ? st.pose : null;
    let set = S.mode === 'install' ? (S.view === 'boardtop' ? 'boardtop' : S.view === 'board' ? 'installBoard' : ph?.align ? 'installAlign' + ph.align : S.k > 0.86 || S.k < 0.09 ? 'install' : null) : S.cut === 'section' ? 'section' : S.view === 'fingers' ? 'fingers' : S.iso !== 'all' ? S.iso : S.e > 0.6 ? 'exploded' : S.e < 0.15 ? 'assembled' : null;
    const settle = Math.min(1, Math.max(0, (T - (AP.on ? AP.t0 + tourState((T - AP.t0) % DURATION).viewAt : S.viewAt) - 0.9) / 0.5));
    const callouts = [];
    for (const c of set ? CALLOUTS[set] : []) {
      const p = st.project((c.board ? st.board.anchors : st.mod.anchors)[c.a]());
      if (!p) continue;
      callouts.push({x: p[0], y: p[1], dx: c.dx, dy: c.dy, title: c.t, sub: c.s, o: AP.on ? settle : 1});
    }
    ui.root.style.display = hidden ? 'none' : '';
    const infoKey = S.info === 'install' ? installPhase(S.k) : S.info;
    ui.update({...S, paused, tns, e: S.e, eTarget: S.eTarget, info: INFO[infoKey], callouts, cursor, scale, lite: tier > 0});
    if (tourChip.classList.contains('on') !== AP.on || !tourChip.firstChild) {
      tourChip.classList.toggle('on', AP.on);
      tourChip.innerHTML = AP.on ? '<i></i>自动讲解中 · 点任意处接管' : '▶ 继续自动讲解';
    }
    if (!window.SIM_SHOWN) {
      window.SIM_SHOWN = true;
      dispatchEvent(new Event('simframe'));
    }
    requestAnimationFrame(frame);
  };
  st.renderer.compileAsync(st.scene, st.camera).then(() => requestAnimationFrame(frame), () => requestAnimationFrame(frame));
  // test hook: jump the tour clock (used by the screenshot script)
  window.LIVE = {
    st,
    S,
    seekTour: (t) => {
      AP.on = true;
      AP.t0 = T - t;
    },
    // jump straight to a state, camera snapped (screenshots and deep links)
    set: (o) => {
      AP.on = false;
      lastInput = T + 1e6;
      Object.assign(S, o);
      if (o.eTarget !== undefined) S.e = o.eTarget;
      S.viewAt = T;
      Object.assign(off, {az: 0, el: 0, k: 1});
      if (o.k !== undefined) S.kTarget = o.k;
      Object.assign(cam, VIEW_FN[S.view](0, S.e, S.k));
      const iso = ISO[S.iso];
      for (const p of PARTS) vis[p] = iso.vis[p] ?? 1;
    },
    get T() {
      return T;
    },
    get tier() {
      return tier;
    },
  };
}
