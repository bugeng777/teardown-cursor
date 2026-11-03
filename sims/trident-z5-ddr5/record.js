// Record mode: ?record=1&ratio=9x16|16x9&subs=zh-en|en[&cut=short|long]
// A fixed, scripted film of the same model the live page drives: no buttons or panels, a scripted camera, burned-in
// subtitles inside the platform safe areas, a hook card for the first 10 s, gl-transitions between scenes, GSAP for
// every piece of type and ECharts for the two charts. render(t) is a pure function of t (GSAP timeline seeked, ECharts
// redrawn from t, the 3D state folded from the script), so sims/record.mjs can step it frame by frame.
import * as THREE from 'three';
import gsap from 'gsap';
import {SplitText} from 'gsap/SplitText';
import * as echarts from 'echarts/core';
import {BarChart} from 'echarts/charts';
import {GridComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import GLT from 'gl-transitions';
import {createStage} from './stage.js';
import {ISO, VIEW_FN} from './tour.js';
import {DRAM_X, PCB, PROFILES, ns, bandwidth} from './kin.js';
import {SHORT, LONG} from './record-script.js';

gsap.registerPlugin(SplitText);
echarts.use([BarChart, GridComponent, CanvasRenderer]);

const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const PARTS = ['front', 'back', 'bar', 'light', 'pad', 'pcb', 'dram', 'pmic', 'spd'];
const RED = '#d6182b';
const CJK = `Inter,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",system-ui,sans-serif`;

export async function runRecord() {
  const q = new URLSearchParams(location.search);
  const ratio = q.get('ratio') === '9x16' ? '9x16' : '16x9';
  const V = ratio === '9x16';
  const cut = q.get('cut') || (V ? 'short' : 'long');
  const SC = cut === 'long' ? LONG : SHORT;
  const subsMode = q.get('subs') || (V ? 'zh-en' : 'en');
  const ZH = subsMode !== 'en';
  const W = V ? 1080 : 1920;
  const H = V ? 1920 : 1080;
  const tx = (o) => (ZH ? o.zh : o.en);
  document.title = (ZH ? SC.title.zh : SC.title.en) + ' · record';

  // -------------------------------------------------------------- layout and type
  const css = document.createElement('style');
  css.textContent = `
html,body{margin:0;background:#111;overflow:hidden}
#rec{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;overflow:hidden;font-family:${CJK};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums;color:#16181b}
#rec canvas.gl{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
#rec .ov{position:absolute;inset:0;pointer-events:none}
.sub{position:absolute;left:${V ? 60 : 160}px;right:${V ? 170 : 160}px;bottom:${V ? Math.round(H * 0.2) + 24 : 64}px;display:flex;flex-direction:column;align-items:center;gap:${V ? 10 : 8}px;visibility:hidden}
.sub .zh,.sub .en{max-width:100%;text-align:center;padding:${V ? '10px 22px' : '8px 22px'};border-radius:14px;background:rgba(14,15,18,.78);box-shadow:0 6px 24px rgba(0,0,0,.18);backdrop-filter:blur(6px)}
.sub .zh,.sub .en{text-wrap:balance;line-break:strict}
.sub .zh{color:#fff;font-weight:800;font-size:${V ? 46 : 46}px;line-height:1.3;letter-spacing:.5px}
.sub .en{color:#e8e9ec;font-weight:600;font-size:${ZH ? (V ? 30 : 30) : (V ? 44 : 44)}px;line-height:1.3}
.sub.enonly .en{color:#fff;font-weight:700}
.hook{position:absolute;left:${V ? 40 : 90}px;${V ? 'right:150px' : 'width:900px'};top:${V ? Math.round(H * 0.12) + 24 : 80}px;visibility:hidden;padding:${V ? '26px 26px 30px' : '30px 34px 34px'};border-radius:26px;background:rgba(246,247,249,.84);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.12);box-sizing:border-box}
.hook .tag{display:inline-block;font:800 ${V ? 30 : 26}px ${CJK};letter-spacing:3px;color:#fff;background:${RED};padding:6px 16px;border-radius:6px}
.hook .q{margin-top:22px;font-weight:900;font-size:${V ? 84 : 80}px;line-height:1.14;color:#111317;white-space:pre-line;text-shadow:0 2px 0 rgba(255,255,255,.6)}
.hook .bar{height:10px;width:${V ? 420 : 520}px;margin-top:26px;background:linear-gradient(90deg,${RED},#ff6a3d);border-radius:5px;transform-origin:0 50%}
.hook .a{display:inline-block;margin-top:28px;font-weight:900;font-size:${V ? 64 : 58}px;color:#fff;padding:14px 28px;border-radius:16px;background:linear-gradient(100deg,${RED} 0%,${RED} 40%,#ff7a59 50%,${RED} 60%,${RED} 100%);background-size:300% 100%;box-shadow:0 14px 40px rgba(214,24,43,.35)}
.hook .src{margin-top:18px;font-weight:700;font-size:${V ? 32 : 28}px;color:#3a3e45;background:rgba(255,255,255,.85);display:inline-block;padding:6px 14px;border-radius:8px}
.lab{position:absolute;left:0;top:0;white-space:nowrap;background:rgba(255,255,255,.92);padding:8px 14px;border-left:5px solid ${RED};border-radius:4px;box-shadow:0 4px 18px rgba(0,0,0,.12)}
.lab b{display:block;font-size:${V ? 38 : 34}px;font-weight:800;color:#16181b}
.lab span{display:block;font-size:${V ? 26 : 24}px;font-weight:600;color:#6f747c;margin-top:2px}
.lab.hot{background:${RED};border-left-color:#fff}
.lab.hot b{color:#fff}.lab.hot span{color:#ffd9dc}
.lab i{font-style:normal;color:#b07a12;font-size:.7em;border:1.5px solid #e9cf94;padding:0 6px;margin-left:8px;border-radius:4px;background:#fff8e6}
.chart{position:absolute;${V ? `left:60px;right:170px;top:${Math.round(H * 0.12) + 30}px;height:560px` : 'right:100px;top:150px;width:800px;height:500px'};background:rgba(255,255,255,.93);border-radius:22px;box-shadow:0 18px 50px rgba(0,0,0,.14);visibility:hidden;padding:26px 30px 10px;box-sizing:border-box}
.chart h5{margin:0;font-size:${V ? 40 : 34}px;font-weight:900}
.chart h6{margin:6px 0 0;font-size:${V ? 26 : 24}px;font-weight:600;color:#6f747c}
.chart .c{position:absolute;left:10px;right:20px;top:${V ? 130 : 110}px;bottom:10px}
.end{position:absolute;left:50%;top:${V ? Math.round(H * 0.15) : 90}px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;visibility:hidden;padding:30px 50px;border-radius:26px;background:rgba(246,247,249,.84);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.12);white-space:nowrap}
.end .t{font-weight:900;font-size:${V ? 72 : 76}px;color:#111317}
.end .u{margin-top:22px;font:700 ${V ? 48 : 50}px 'JetBrains Mono',monospace;color:#fff;background:#111317;padding:12px 26px;border-radius:14px}
.end .s{margin-top:18px;font-weight:700;font-size:${V ? 34 : 32}px;color:#4a4e55}
.chap{position:absolute;left:110px;top:70px;font:800 30px ${CJK};color:#fff;background:rgba(14,15,18,.82);padding:8px 18px;border-radius:8px;border-left:6px solid ${RED};visibility:hidden}
.brand{position:absolute;right:${V ? 190 : 70}px;top:${V ? Math.round(H * 0.12) + 4 : 64}px;font:700 ${V ? 24 : 24}px ${CJK};color:rgba(22,24,27,.55);letter-spacing:1px}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 60%,rgba(0,0,0,.10) 100%)}
`;
  document.head.appendChild(css);
  const app = document.getElementById('app');
  const root = document.createElement('div');
  root.id = 'rec';
  app.appendChild(root);
  const canvas = document.createElement('canvas');
  canvas.className = 'gl';
  root.appendChild(canvas);
  const ov = document.createElement('div');
  ov.className = 'ov';
  root.appendChild(ov);
  const add = (cls, html, parent = ov) => {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    parent.appendChild(d);
    return d;
  };
  add('vig', '');
  add('brand', ZH ? '硬件踩坑记 · Hardware Pitfalls' : 'Hardware Pitfalls');
  const fit = () => {
    const s = Math.min(innerWidth / W, innerHeight / H);
    root.style.transform = `translate(${(innerWidth - W * s) / 2}px,${(innerHeight - H * s) / 2}px) scale(${s})`;
  };
  fit();
  addEventListener('resize', fit);

  // -------------------------------------------------------------- 3D: the stage, offscreen targets, transitions
  const st = createStage({canvas});
  st.resize(W, H, 1);
  if (V) {
    st.camera.fov = 36;
    st.camera.updateProjectionMatrix();
  }
  const DM = V ? 1.85 : 1; // portrait: pull back so the wide parts stay in frame
  const R = st.renderer;
  const mkRT = () => new THREE.WebGLRenderTarget(W, H, {samples: 4, type: THREE.HalfFloatType});
  const rtA = mkRT();
  const rtB = mkRT();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const qScene = new THREE.Scene();
  qScene.add(quad);
  const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const mkMat = (glsl, params = {}) => {
    const uniforms = {from: {value: rtA.texture}, to: {value: rtB.texture}, progress: {value: 1}, ratio: {value: W / H}};
    for (const [k, v] of Object.entries(params)) uniforms[k] = {value: Array.isArray(v) ? new THREE.Vector2(...v) : v};
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VS,
      fragmentShader: `uniform sampler2D from; uniform sampler2D to; uniform float progress; uniform float ratio; varying vec2 vUv;
vec4 getFromColor(vec2 uv){ return texture2D(from, uv); }
vec4 getToColor(vec2 uv){ return texture2D(to, uv); }
${glsl}
void main(){
  gl_FragColor = transition(vUv);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
      depthTest: false,
      depthWrite: false,
    });
  };
  const MATS = {copy: mkMat('vec4 transition(vec2 uv){ return getToColor(uv); }')};
  for (const sh of SC.shots) {
    if (!sh.tr || MATS[sh.tr]) continue;
    const g = GLT.find((x) => x.name === sh.tr);
    MATS[sh.tr] = mkMat(g.glsl, {...g.defaultParams, ...(sh.trParams || {})});
  }

  // -------------------------------------------------------------- the script folded into a state at time t
  const TUNE = q.get('tune') ? JSON.parse(q.get('tune')) : null;
  const shots = TUNE ? SC.shots.map((s, i) => ({...s, ...(TUNE[i] || {})})) : SC.shots;
  const shotAt = (t) => {
    let i = 0;
    while (i + 1 < shots.length && shots[i + 1].t <= t) i++;
    return i;
  };
  const kOf = (sh, u) => (Array.isArray(sh.k) ? clamp(sh.k[0] + ((sh.k[1] - sh.k[0]) * u) / sh.k[2], 0, 1) : sh.k ?? 0);
  const visOf = (sh) => Object.fromEntries(PARTS.map((p) => [p, ISO[sh.iso || 'all'].vis[p] ?? 1]));
  const camOf = (sh, u, e, k) => {
    const c = {...VIEW_FN[sh.view](u, e, k)};
    const m = {...(sh.cam || {}), ...((V ? sh.cam9 : sh.cam16) || {})};
    c.d *= (m.d ?? 1) * (sh.dm ?? DM);
    for (const key of ['tx', 'ty', 'tz', 'az', 'el', 'sx', 'sy']) if (m[key] !== undefined) c[key] = (c[key] ?? 0) + m[key];
    return c;
  };
  const evalShot = (i, t) => {
    const sh = shots[i];
    const u = t - sh.t;
    const k = kOf(sh, u);
    const eT = sh.e ?? 0;
    if (i === 0 || sh.tr) {
      return {e: eT, vis: visOf(sh), k, cam: camOf(sh, u, eT, k)};
    }
    const p = evalShot(i - 1, sh.t);
    const e = p.e + (eT - p.e) * ease(u / 1.1);
    const vT = visOf(sh);
    const fv = ease(u / 0.5);
    const vis = Object.fromEntries(PARTS.map((n) => [n, p.vis[n] + (vT[n] - p.vis[n]) * fv]));
    const tgt = camOf(sh, u, e, k);
    const f = ease(u / (sh.blend ?? 1.5));
    const cam = {};
    for (const key of ['tx', 'ty', 'tz', 'el', 'd', 'sx', 'sy']) cam[key] = (p.cam[key] ?? 0) + ((tgt[key] ?? 0) - (p.cam[key] ?? 0)) * f;
    cam.az = p.cam.az + wrap(tgt.az - p.cam.az) * f;
    return {e, vis, k, cam};
  };
  const cutX = (DRAM_X[2] - PCB.w / 2) * 0.01;
  const draw = (sh, s, t, rt) => {
    const iso = sh.iso || 'all';
    st.frame(
      {e: s.e, tns: 40 + t * 6, profile: sh.profile || 'xmp', iso, vis: s.vis, cut: 'solid', cutX, rgbT: t,
        flow: sh.mode === 'install' ? 'none' : ISO[iso].flow || 'data', mode: sh.mode, k: s.k, kit: sh.kit !== false},
      {...s.cam, az: s.cam.az * D2R, el: s.cam.el * D2R},
      rt,
    );
  };

  // -------------------------------------------------------------- type: GSAP timeline, seeked to t
  await document.fonts.ready;
  const tl = gsap.timeline({paused: true});
  const ph = (s) => s.replace(/\n/g, '<br>');
  // subtitles
  for (const s of SC.subs) {
    const el = add('sub' + (ZH ? '' : ' enonly'), (ZH ? `<div class="zh">${s.zh}</div>` : '') + `<div class="en">${s.en}</div>`);
    gsap.set(el, {autoAlpha: 0});
    tl.set(el, {autoAlpha: 1}, s.t0);
    if (ZH) {
      // a wipe keeps the browser's CJK line breaking (no comma at a line start)
      tl.fromTo(el.querySelector('.zh'), {clipPath: 'inset(0 100% 0 0 round 14px)'}, {clipPath: 'inset(0 0% 0 0 round 14px)', duration: 0.38, ease: 'power3.out'}, s.t0);
    }
    const se = new SplitText(el.querySelector('.en'), {type: 'words'});
    tl.from(se.words, {autoAlpha: 0, y: 10, duration: 0.26, stagger: 0.02, ease: 'power3.out'}, s.t0 + (ZH ? 0.08 : 0));
    tl.from(el, {scale: 0.96, duration: 0.3, ease: 'back.out(2)'}, s.t0);
    tl.to(el, {autoAlpha: 0, y: -8, duration: 0.16, ease: 'power2.in'}, s.t1 - 0.16);
    tl.set(el, {y: 0}, s.t1 + 0.01);
  }
  // hook card: the question flips in, the answer pops, the source follows
  {
    const h = SC.hook;
    const el = add('hook', `<div class="tag">${ZH ? '冷知识 · 先说重点' : 'QUICK ANSWER FIRST'}</div><div class="q">${ph(tx(h.q))}</div><div class="bar"></div><div class="a">${tx(h.a)}</div><br><div class="src">${ZH ? '来源：' : 'Source: '}${tx(h.src)}</div>`);
    const qs = new SplitText(el.querySelector('.q'), {type: 'words,chars'});
    gsap.set(el, {autoAlpha: 0});
    tl.set(el, {autoAlpha: 1}, h.t0);
    tl.from(el.querySelector('.tag'), {autoAlpha: 0, x: -40, duration: 0.4, ease: 'power3.out'}, h.t0 + 0.05);
    tl.from(qs.chars, {autoAlpha: 0, rotationX: -90, yPercent: 40, transformPerspective: 600, transformOrigin: '50% 100%', duration: 0.55, stagger: 0.028, ease: 'back.out(1.8)'}, h.t0 + 0.15);
    tl.from(el.querySelector('.bar'), {scaleX: 0, duration: 0.7, ease: 'expo.out'}, h.t0 + 0.9);
    const a = el.querySelector('.a');
    gsap.set(a, {autoAlpha: 0});
    tl.fromTo(a, {autoAlpha: 0, scale: 0.6, rotation: -3}, {autoAlpha: 1, scale: 1, rotation: 0, duration: 0.9, ease: 'elastic.out(1,0.55)'}, h.a1);
    tl.fromTo(a, {backgroundPosition: '100% 0'}, {backgroundPosition: '0% 0', duration: 1.4, ease: 'power2.inOut'}, h.a1 + 0.3);
    tl.fromTo(a, {backgroundPosition: '100% 0'}, {backgroundPosition: '0% 0', duration: 1.4, ease: 'power2.inOut'}, h.a2 + 0.6);
    tl.to(qs.chars, {opacity: 0.55, duration: 0.4}, h.a1);
    const src = el.querySelector('.src');
    gsap.set(src, {autoAlpha: 0});
    tl.fromTo(src, {autoAlpha: 0, y: 16}, {autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out'}, h.a2);
    tl.to(el, {autoAlpha: 0, y: -40, duration: 0.45, ease: 'power2.in'}, h.t1 - 0.45);
  }
  // end card
  {
    const e = SC.end;
    const el = add('end', `<div class="t">${tx(e)}</div><div class="u">${e.url}</div><div class="s">${ZH ? '硬件踩坑记 · 中英双语' : 'Hardware Pitfalls · interactive teardowns'}</div>`);
    const us = new SplitText(el.querySelector('.u'), {type: 'chars'});
    gsap.set(el, {autoAlpha: 0});
    tl.fromTo(el, {autoAlpha: 0, y: 30}, {autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out'}, e.t0 + 0.6);
    tl.from(el.querySelector('.t'), {y: 40, autoAlpha: 0, duration: 0.6, ease: 'power3.out'}, e.t0 + 0.6);
    tl.from(el.querySelector('.u'), {autoAlpha: 0, scaleX: 0.2, duration: 0.45, ease: 'expo.out'}, e.t0 + 0.9);
    tl.from(us.chars, {autoAlpha: 0, duration: 0.05, stagger: 0.035}, e.t0 + 1.1);
    tl.from(el.querySelector('.s'), {autoAlpha: 0, y: 14, duration: 0.4}, e.t0 + 1.9);
  }
  // chapter tags (horizontal only)
  if (!V)
    for (const c of SC.chapters) {
      const el = add('chap', tx(c));
      gsap.set(el, {autoAlpha: 0});
      tl.fromTo(el, {autoAlpha: 0, x: -30}, {autoAlpha: 1, x: 0, duration: 0.45, ease: 'power3.out'}, c.t + 0.6);
      tl.to(el, {autoAlpha: 0, duration: 0.3}, c.t + 4.2);
    }
  // charts: ECharts, values driven by t
  const charts = SC.charts.map((c) => {
    const el = add('chart', '');
    const x = PROFILES.xmp;
    const j = PROFILES.jedec;
    let cfg;
    if (c.kind === 'bw') {
      cfg = {
        h5: ZH ? '理论峰值带宽 @ 6000 MT/s' : 'Peak bandwidth @ 6000 MT/s',
        h6: ZH ? 'Peak bandwidth · 每条 64 bit × 6000 MT/s = 48 GB/s' : 'each stick: 64 bit × 6000 MT/s = 48 GB/s',
        cats: ZH ? ['单通道 · 插 1、2 槽', '双通道 · 插 2、4 槽'] : ['Single · slots 1 & 2', 'Dual · slots 2 & 4'],
        vals: [bandwidth(x), 2 * bandwidth(x)],
        unit: ' GB/s',
        dec: 0,
        colors: ['#9aa0a8', RED],
      };
    } else {
      cfg = {
        h5: ZH ? '首字延迟 CL × tCK（越短越好）' : 'First-word latency, CL × tCK (lower is better)',
        h6: ZH ? 'JEDEC 档时序为估算 · est.' : 'JEDEC timings are an estimate (est.)',
        cats: ZH ? ['JEDEC 4800 · CL40（估算）', 'XMP 6000 · CL30'] : ['JEDEC 4800 · CL40 (est.)', 'XMP 6000 · CL30'],
        vals: [ns(j, j.cl), ns(x, x.cl)],
        unit: ' ns',
        dec: 1,
        colors: ['#9aa0a8', RED],
      };
    }
    el.innerHTML = `<h5>${cfg.h5}</h5><h6>${cfg.h6}</h6><div class="c"></div>`;
    const ch = echarts.init(el.querySelector('.c'), null, {renderer: 'canvas', devicePixelRatio: 1});
    const max = Math.max(...cfg.vals) * 1.25;
    gsap.set(el, {autoAlpha: 0});
    tl.fromTo(el, {autoAlpha: 0, y: 40, scale: 0.97}, {autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out'}, c.t0);
    tl.to(el, {autoAlpha: 0, y: -20, duration: 0.3, ease: 'power2.in'}, c.t1 - 0.3);
    const fs = V ? 30 : 26;
    const drawAt = (t) => {
      const p = [0, 1].map((i) => ease((t - c.t0 - 0.35 - i * 0.35) / 1.1));
      ch.setOption({
        animation: false,
        grid: {left: 10, right: 40, top: 10, bottom: 10, containLabel: true},
        xAxis: {type: 'value', max, show: false},
        yAxis: {type: 'category', data: cfg.cats, axisLine: {show: false}, axisTick: {show: false}, axisLabel: {fontSize: fs, fontWeight: 700, color: '#16181b', fontFamily: CJK, margin: 18}},
        series: [{
          type: 'bar', barWidth: V ? 70 : 64,
          data: cfg.vals.map((v, i) => ({value: v * p[i], itemStyle: {color: cfg.colors[i], borderRadius: [0, 12, 12, 0]}})),
          label: {show: true, position: 'right', fontSize: fs + 6, fontWeight: 900, fontFamily: CJK, color: '#16181b', formatter: (d) => (d.value > 0.01 ? '≈ ' + d.value.toFixed(cfg.dec) + cfg.unit : '')},
        }],
      }, {notMerge: false, lazyUpdate: false});
      ch.getZr().flush();
    };
    return {c, drawAt};
  });

  // -------------------------------------------------------------- labels projected from the model's anchors
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.style.cssText = 'position:absolute;left:0;top:0';
  ov.insertBefore(svg, ov.firstChild.nextSibling);
  const labs = SC.labels.map((l) => {
    const el = add('lab' + (l.hot ? ' hot' : ''), `<b>${tx(l)}${l.est ? (ZH ? '<i>估算</i>' : '<i>est.</i>') : ''}</b>${ZH && l.en !== l.zh ? `<span>${l.en}</span>` : ''}`);
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('stroke', RED);
    line.setAttribute('stroke-width', '3');
    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('r', '7');
    dot.setAttribute('fill', RED);
    dot.setAttribute('stroke', '#fff');
    dot.setAttribute('stroke-width', '3');
    svg.append(line, dot);
    return {l, el, line, dot, w: 0, h: 0};
  });
  for (const b of labs) {
    b.w = b.el.offsetWidth;
    b.h = b.el.offsetHeight;
  }
  const LS = V ? 1 : 1.1;
  const placeLabels = (t, inTr) => {
    for (const b of labs) {
      const {l} = b;
      let o = ease((t - l.t0) / 0.35) * (1 - ease((t - (l.t1 - 0.25)) / 0.25));
      if (t < l.t0 || t > l.t1 || inTr) o = 0;
      const p = o > 0 ? st.project((l.board ? st.board.anchors : st.mod.anchors)[l.a]()) : null;
      if (!p) {
        b.el.style.opacity = 0;
        b.line.setAttribute('opacity', 0);
        b.dot.setAttribute('opacity', 0);
        continue;
      }
      const lx = clamp(p[0] + l.dx * LS - (l.dx < 0 ? b.w : 0), 30, W - b.w - (V ? 170 : 30));
      const ly = clamp(p[1] + l.dy * LS - b.h / 2, V ? H * 0.12 : 30, H - b.h - (V ? H * 0.2 + 300 : 150));
      const slide = (1 - ease((t - l.t0) / 0.35)) * 16;
      b.el.style.opacity = o;
      b.el.style.transform = `translate(${lx + (l.dx < 0 ? -slide : slide)}px,${ly}px)`;
      const ex = l.dx < 0 ? lx + b.w : lx;
      const ey = ly + b.h / 2;
      b.line.setAttribute('x1', p[0]);
      b.line.setAttribute('y1', p[1]);
      b.line.setAttribute('x2', ex);
      b.line.setAttribute('y2', ey);
      b.line.setAttribute('opacity', o);
      b.dot.setAttribute('cx', p[0]);
      b.dot.setAttribute('cy', p[1]);
      b.dot.setAttribute('opacity', o);
    }
  };

  // -------------------------------------------------------------- render(t)
  const render = (t) => {
    t = clamp(t, 0, SC.duration);
    const i = shotAt(t);
    const sh = shots[i];
    const B = evalShot(i, t);
    let prog = 1;
    let mat = MATS.copy;
    if (i > 0 && sh.tr && t - sh.t < sh.trDur) {
      prog = (t - sh.t) / sh.trDur;
      mat = MATS[sh.tr];
      draw(shots[i - 1], evalShot(i - 1, t), t, rtA);
    }
    draw(sh, B, t, rtB);
    mat.uniforms.progress.value = prog;
    quad.material = mat;
    R.setRenderTarget(null);
    R.render(qScene, qCam);
    placeLabels(t, prog < 1);
    tl.seek(t, false);
    for (const c of charts) if (t >= c.c.t0 - 0.1 && t <= c.c.t1 + 0.1) c.drawAt(t);
    return {shot: i};
  };

  // timeline for the score: every beat in seconds
  const timeline = {
    duration: SC.duration,
    fps: 30,
    shots: shots.map((s) => s.t),
    transitions: shots.filter((s) => s.tr).map((s) => s.t),
    subs: SC.subs.map((s) => s.t0),
    labels: SC.labels.map((l) => l.t0),
    hook: [SC.hook.t0, SC.hook.a1, SC.hook.a2],
    end: SC.end.t0,
    clicks: shots.filter((s) => Array.isArray(s.k)).flatMap((s) => [0.43, 0.82].map((k) => s.t + ((k - s.k[0]) / (s.k[1] - s.k[0])) * s.k[2])),
    charts: SC.charts.map((c) => c.t0),
  };
  render(0);
  window.SIM = {ready: true, duration: SC.duration, fps: 30, render, timeline, size: [W, H], meta: {ratio, cut, subs: subsMode, title: SC.title}};
  if (!window.__CAPTURE && !q.has('capture')) {
    // preview: play in real time, looped
    const t0 = performance.now();
    const loop = (now) => {
      render(((now - t0) / 1000) % SC.duration);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
