// The overlay: title and data rate top left, timings, the disassembly slider and the explainer card on the left;
// subchannel activity, PMIC rails, SPD temperature and the controls on the right; callouts with leaders in the middle.
// Fixed 1600 x 900 CSS layout; update(s) redraws every live part from the frame's state.
import {PROFILES, tck, ns, bandwidth, burstNs, requestsIn, busState, rails, tempC, utilisation, BL} from './kin.js';

export const C = {ink: '#16181b', mute: '#80858c', faint: '#c9ccd0', line: '#e1e3e6', panel: 'rgba(248,248,249,.94)', red: '#d6182b', blue: '#2f7de1', orange: '#f08a23'};
const CJK = `Inter,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC","Source Han Sans SC",system-ui,sans-serif`;
const CSS = `
#app{font-family:${CJK};color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.ui{position:absolute;inset:0;pointer-events:none}
.pn{position:absolute;background:${C.panel};border:1px solid ${C.line};box-shadow:0 1px 2px rgba(20,22,26,.04)}
.cp{font-size:11px;font-weight:700;letter-spacing:1px;white-space:nowrap}
.mu{color:${C.mute}}
.tb{position:absolute;height:22px;padding:0 6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;letter-spacing:.3px;border:1px solid ${C.line};background:#fff;color:${C.ink};white-space:nowrap}
.tb.on{background:${C.ink};color:#fff;border-color:${C.ink}}
.call{position:absolute;white-space:nowrap;background:rgba(255,255,255,.86);padding:3px 6px;border-left:2px solid ${C.red}}
.call b{display:block;font-size:12.5px;font-weight:700}
.call span{display:block;font-size:10px;font-weight:500;color:${C.mute};margin-top:1px}
.info h3{margin:0;font-size:17px;font-weight:800;letter-spacing:.2px}
.info h4{margin:3px 0 9px;font-size:10.5px;font-weight:600;color:${C.mute};letter-spacing:.6px}
.info p{margin:0 0 7px;font-size:12.6px;line-height:1.62;color:#2b2e33}
.info p b{color:${C.red};font-weight:700}
.est{color:#b07a12;font-size:10px;font-weight:600;border:1px solid #e9cf94;padding:0 3px;margin-left:3px;border-radius:2px}
.cur{position:absolute;left:0;top:0;z-index:50;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:1.5px solid ${C.red};opacity:0;z-index:49}
`;
const el = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h.trim();
  return d.firstElementChild;
};
export const EST = '<span class="est">估算</span>';
export const VIEWS = ['hero', 'front', 'top', 'fingers', 'rear'];
export const ISOS = ['all', 'spreader', 'bar', 'pad', 'pcb', 'dram', 'pmic', 'spd'];
export const CUTS = ['solid', 'xray', 'section'];
export const PROFS = ['xmp', 'jedec'];
export const INSTALLS = ['board', 'install', 'why', 'exit'];
const LABEL = {
  hero: '总览', front: '正面', top: '俯视', fingers: '金手指', rear: '背面',
  all: '全部', spreader: '散热马甲', bar: '灯条', pad: '导热垫', pcb: 'PCB', dram: 'DRAM 颗粒', pmic: 'PMIC', spd: 'SPD Hub',
  solid: '实体', xray: '透视', section: '剖面',
  xmp: 'XMP 6000', jedec: 'JEDEC 4800',
  close: '组装', open: '拆开', pause: '❚❚ 暂停',
  board: '看主板', install: '插到主板 A2+B2', why: '为什么插 A2+B2', exit: '退出安装',
};
const X0 = 35;
const LW = 262;
const RX = 1300;
const RW = 265;
export const SL = {x: X0 + 12, w: LW - 24, y: 448};

export function createConsole(app) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ui = el(`<div class="ui"></div>`);
  app.appendChild(ui);
  const add = (h) => {
    const n = el(h);
    ui.appendChild(n);
    return n;
  };
  const btn = {};

  // ------------------------------------------------------------ title and data rate
  add(`<div style="position:absolute;left:${X0}px;top:30px;width:43px;height:3px;background:${C.red}"></div>`);
  add(`<div style="position:absolute;left:${X0}px;top:42px;font-size:23px;font-weight:800;letter-spacing:-.2px;white-space:nowrap">芝奇幻光戟 <span style="color:${C.red}">·</span> Trident Z5 RGB</div>`);
  add(`<div style="position:absolute;left:${X0}px;top:74px;font-size:12.5px;font-weight:600;white-space:nowrap">DDR5 台式机内存拆解 &nbsp;<span class="mu" style="font-weight:500">F5-6000J3036F16GX2-TZ5RK</span></div>`);
  const mts = add(`<div style="position:absolute;left:${X0 - 2}px;top:96px;font-size:54px;font-weight:800;letter-spacing:-2.6px;color:${C.red};line-height:1"></div>`);
  const mtsU = add(`<div style="position:absolute;top:104px;font-size:11px;font-weight:700;line-height:1.45;white-space:nowrap">MT/s<br><span class="mu" style="font-weight:500">每秒百万次传输</span></div>`);
  const rateLine = add(`<div style="position:absolute;left:${X0}px;top:158px;font-size:11.5px;line-height:1.6;white-space:nowrap"></div>`);

  // ------------------------------------------------------------ timings
  add(`<div class="pn" style="left:${X0}px;top:208px;width:${LW}px;height:168px"></div>`);
  add(`<div class="cp" style="position:absolute;left:${X0 + 12}px;top:219px">时序</div>`);
  const profName = add(`<div class="cp mu" style="position:absolute;right:${1600 - X0 - LW + 12}px;top:219px;font-weight:600"></div>`);
  const timing = add(`<div style="position:absolute;left:${X0 + 12}px;top:240px;width:${LW - 24}px"></div>`);
  const tNote = add(`<div style="position:absolute;left:${X0 + 12}px;top:343px;width:${LW - 24}px;font-size:10.5px;line-height:1.45;color:${C.mute}"></div>`);

  // ------------------------------------------------------------ disassembly
  add(`<div class="pn" style="left:${X0}px;top:386px;width:${LW}px;height:80px"></div>`);
  const eName = add(`<div class="cp" style="position:absolute;left:${X0 + 12}px;top:397px">拆解进度</div>`);
  const eVal = add(`<div class="cp" style="position:absolute;right:${1600 - X0 - LW + 12}px;top:397px;color:${C.red}"></div>`);
  add(`<div style="position:absolute;left:${SL.x}px;top:${SL.y}px;width:${SL.w}px;height:2px;background:#e1e3e6"></div>`);
  const eFill = add(`<div style="position:absolute;left:${SL.x}px;top:${SL.y}px;height:2px;background:${C.red}"></div>`);
  const eKnob = add(`<div style="position:absolute;top:${SL.y - 5}px;width:10px;height:12px;margin-left:-5px;background:${C.red}"></div>`);
  btn.close = add(`<div class="tb" style="left:${X0 + 12}px;top:416px;width:70px">组装</div>`);
  btn.open = add(`<div class="tb" style="left:${X0 + 86}px;top:416px;width:70px">拆开</div>`);
  btn.pause = add(`<div class="tb" style="left:${X0 + 160}px;top:416px;width:90px">❚❚ 暂停</div>`);

  // ------------------------------------------------------------ explainer card
  add(`<div class="pn" style="left:${X0}px;top:476px;width:${LW}px;height:409px"></div>`);
  const info = add(`<div class="info" style="position:absolute;left:${X0 + 14}px;top:489px;width:${LW - 28}px;height:390px;overflow:hidden"></div>`);

  // ------------------------------------------------------------ subchannels
  add(`<div class="pn" style="left:${RX}px;top:36px;width:${RW}px;height:206px"></div>`);
  add(`<div class="cp" style="position:absolute;left:${RX + 11}px;top:47px">双子通道 · 总线活动</div>`);
  const subT = add(`<div class="cp mu" style="position:absolute;right:${1600 - RX - RW + 11}px;top:47px;font-weight:600"></div>`);
  const subSvg = add(`<svg style="position:absolute;left:${RX + 8}px;top:64px" width="${RW - 16}" height="132"></svg>`);
  const subTxt = add(`<div style="position:absolute;left:${RX + 11}px;top:198px;width:${RW - 22}px;font-size:10.8px;line-height:1.5"></div>`);

  // ------------------------------------------------------------ PMIC rails
  add(`<div class="pn" style="left:${RX}px;top:250px;width:${RW}px;height:186px"></div>`);
  add(`<div class="cp" style="position:absolute;left:${RX + 11}px;top:261px">PMIC 电压轨 · 5 V 进</div>`);
  add(`<div class="cp mu" style="position:absolute;right:${1600 - RX - RW + 11}px;top:261px;font-weight:600">Richtek</div>`);
  const railBox = add(`<div style="position:absolute;left:${RX + 11}px;top:281px;width:${RW - 22}px"></div>`);
  const railNote = add(`<div style="position:absolute;left:${RX + 11}px;top:412px;width:${RW - 22}px;font-size:10.3px;color:${C.mute}"></div>`);

  // ------------------------------------------------------------ temperature
  add(`<div class="pn" style="left:${RX}px;top:444px;width:${RW}px;height:84px"></div>`);
  add(`<div class="cp" style="position:absolute;left:${RX + 11}px;top:455px">SPD Hub 温度传感器</div>`);
  const tBig = add(`<div style="position:absolute;left:${RX + 10}px;top:471px;font-size:32px;font-weight:800;letter-spacing:-1.2px;line-height:1"></div>`);
  const tTxt = add(`<div style="position:absolute;left:${RX + 120}px;top:474px;width:${RW - 130}px;font-size:10.3px;line-height:1.45;color:${C.mute}"></div>`);
  add(`<div style="position:absolute;left:${RX + 11}px;top:512px;width:${RW - 22}px;height:5px;background:#e6e7e9"></div>`);
  const tFill = add(`<div style="position:absolute;left:${RX + 11}px;top:512px;height:5px;background:${C.red}"></div>`);

  // ------------------------------------------------------------ controls
  add(`<div class="pn" style="left:${RX}px;top:536px;width:${RW}px;height:349px"></div>`);
  let gy = 546;
  const group = (title, keys) => {
    add(`<div class="cp mu" style="position:absolute;left:${RX + 10}px;top:${gy}px;font-weight:600">${title}</div>`);
    let x = RX + 10;
    let y = gy + 17;
    for (const k of keys) {
      const w = Math.round([...LABEL[k]].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 11.5 : 6.8), 0) + 14);
      if (x + w > RX + RW - 8) {
        x = RX + 10;
        y += 26;
      }
      btn[k] = add(`<div class="tb" style="left:${x}px;top:${y}px;width:${w}px">${LABEL[k]}</div>`);
      x += w + 4;
    }
    gy = y + 34;
  };
  group('视角', VIEWS);
  group('部件 · 点一下单独看', ISOS);
  group('剖视', CUTS);
  group('内存配置（SPD 里存的两套参数）', PROFS);
  group('安装 · 技嘉 X870E AORUS PRO ICE（冰雕）', INSTALLS);
  add(`<div style="position:absolute;left:${RX + 10}px;top:${gy - 2}px;width:${RW - 20}px;font-size:10.3px;line-height:1.5;color:${C.mute}">总线慢放约 2 亿倍：真实 1 秒 ≈ 画面里 6 纳秒。<br>拖动旋转 · 滚轮缩放 · H 隐藏面板</div>`);

  // ------------------------------------------------------------ legend, callouts, pointer
  add(`<div class="cp" style="position:absolute;left:0;right:0;top:868px;text-align:center;font-weight:600;font-size:11px">
    ${[['子通道 A 数据', C.blue], ['子通道 B 数据', C.red], ['供电 5 V → 1.x V', C.orange]].map(([n, c]) => `<span style="margin:0 10px"><i style="display:inline-block;width:14px;height:3px;background:${c};vertical-align:middle;margin-right:6px"></i>${n}</span>`).join('')}</div>`);
  const callSvg = add(`<svg style="position:absolute;inset:0;overflow:visible" width="1600" height="900"></svg>`);
  const callG = add(`<div style="position:absolute;inset:0"></div>`);
  const ring = add(`<div class="ring"></div>`);
  const cur = add(`<div class="cur"><svg width="22" height="22" viewBox="0 0 34 34"><path d="M4 3 L30 13.5 L17.5 17.5 L13.5 30 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></div>`);
  const centre = (n) => [parseFloat(n.style.left) + parseFloat(n.style.width) / 2, parseFloat(n.style.top) + 11];
  const spots = Object.fromEntries(Object.entries(btn).map(([k, n]) => [k, centre(n)]));
  const pool = [];

  const pointer = (c) => {
    cur.style.display = c.x < 0 ? 'none' : 'block';
    cur.style.transform = `translate(${(c.x - 3).toFixed(2)}px, ${(c.y - 2).toFixed(2)}px) scale(${c.press ? 0.88 : 1})`;
    ring.style.left = `${c.ringX}px`;
    ring.style.top = `${c.ringY}px`;
    ring.style.opacity = String(c.ring * 0.85);
    ring.style.transform = `scale(${(0.35 + 0.9 * (1 - c.ring)).toFixed(3)})`;
  };

  let lastInfo = '';
  let frameN = 0;
  return {
    root: ui,
    btn,
    spots,
    knob: (k) => [SL.x + k * SL.w, SL.y + 1],
    update(s) {
      frameN++;
      const p = PROFILES[s.profile];
      const heavy = !s.lite || frameN % 2 === 0;
      // buttons
      for (const k of VIEWS) btn[k].classList.toggle('on', s.view === k);
      for (const k of ISOS) btn[k].classList.toggle('on', s.iso === k);
      for (const k of CUTS) btn[k].classList.toggle('on', s.cut === k);
      for (const k of PROFS) btn[k].classList.toggle('on', s.profile === k);
      btn.pause.innerHTML = s.paused ? '▶ 播放' : '❚❚ 暂停';
      btn.pause.classList.toggle('on', s.paused);
      btn.open.classList.toggle('on', s.eTarget > 0.5);
      btn.close.classList.toggle('on', s.eTarget <= 0.5);
      // data rate
      mts.textContent = p.mts;
      mtsU.style.left = `${X0 + mts.getBoundingClientRect().width / (s.scale || 1) + 8}px`;
      rateLine.innerHTML = `I/O 时钟 <b>${(p.mts / 2).toFixed(0)} MHz</b>（双倍数据率） · tCK <b>${tck(p).toFixed(3)} ns</b><br>带宽 <b style="color:${C.red}">${bandwidth(p).toFixed(1)} GB/s</b> / 条 &nbsp;=&nbsp; 2 × 32 bit × ${p.mts} MT/s`;
      profName.innerHTML = `${p.name} · ${p.vdd.toFixed(2)} V`;
      if (heavy) {
        const rows = [['CL', p.cl, '读命令→出数据'], ['tRCD', p.trcd, '开行→可读'], ['tRP', p.trp, '关行'], ['tRAS', p.tras, '行最短开启']];
        timing.innerHTML = rows
          .map(([n, c, d]) => {
            const v = ns(p, c);
            return `<div style="display:flex;align-items:center;height:24px;font-size:11.5px"><b style="width:40px">${n}</b><span style="width:26px;text-align:right;font-weight:700">${c}</span><span class="mu" style="width:78px;margin-left:6px;font-size:10px;white-space:nowrap">${d}</span><i style="display:block;height:5px;width:${(v / 42) * 44}px;background:${n === 'CL' ? C.red : C.faint};margin-right:6px"></i><span style="font-weight:700">${v.toFixed(1)}<span class="mu" style="font-weight:500"> ns</span></span></div>`;
          })
          .join('');
        tNote.innerHTML = `首字延迟 = CL × tCK = ${p.cl} × ${tck(p).toFixed(3)} = <b style="color:${C.ink}">${ns(p, p.cl).toFixed(1)} ns</b>${p.est ? ' · JEDEC 档时序' + EST : ''}`;
      }
      // disassembly, or the installation in install mode: the same slider drives the mode's one input
      const inst = s.mode === 'install';
      const sv = inst ? s.k : s.e;
      eName.textContent = inst ? '安装进度' : '拆解进度';
      eVal.textContent = `${Math.round(sv * 100)}%`;
      eKnob.style.left = `${(SL.x + sv * SL.w).toFixed(1)}px`;
      eFill.style.width = `${(sv * SL.w).toFixed(1)}px`;
      btn.install.classList.toggle('on', inst && s.view === 'install');
      btn.board.classList.toggle('on', inst && s.view === 'board');
      btn.why.classList.toggle('on', inst && s.view === 'boardtop');
      // explainer
      if (s.info !== lastInfo) {
        lastInfo = s.info;
        info.innerHTML = s.info;
      }

      // subchannel waveform: the last 64 ns, now at the right edge
      if (heavy) {
        const W = RW - 16;
        const win = 64;
        const t1 = s.tns;
        const t0 = t1 - win;
        const X = (t) => 26 + ((t - t0) / win) * (W - 30);
        let h = '';
        const lane = (sub, y0, col) => {
          h += `<text x="0" y="${y0 + 13}" font-size="11" font-weight="700" fill="${col}">${sub}</text>`;
          h += `<text x="12" y="${y0 + 4}" font-size="7.5" fill="${C.mute}">CMD</text><text x="12" y="${y0 + 30}" font-size="7.5" fill="${C.mute}">DQ</text>`;
          h += `<line x1="26" x2="${W - 4}" y1="${y0 + 8}" y2="${y0 + 8}" stroke="${C.line}"/><line x1="26" x2="${W - 4}" y1="${y0 + 34}" y2="${y0 + 34}" stroke="${C.line}"/>`;
          for (const r of requestsIn(sub, t0, t1, p)) {
            for (const [t, lab] of [[r.t0, 'ACT'], [r.rd, r.write ? 'WR' : 'RD']]) {
              if (t < t0 || t > t1) continue;
              h += `<rect x="${X(t).toFixed(1)}" y="${y0 + 2}" width="3" height="12" fill="${C.ink}"/><text x="${(X(t) + 4).toFixed(1)}" y="${y0 + 12}" font-size="7.5" fill="${C.ink}">${lab}</text>`;
            }
            const a = Math.max(t0, r.d0);
            const b = Math.min(t1, r.d1);
            if (b > a) {
              h += `<rect x="${X(a).toFixed(1)}" y="${y0 + 22}" width="${(X(b) - X(a)).toFixed(1)}" height="16" fill="${col}" opacity=".9"/>`;
              for (let i = 1; i < BL; i++) {
                const tt = r.d0 + (i / BL) * (r.d1 - r.d0);
                if (tt > a && tt < b) h += `<line x1="${X(tt).toFixed(1)}" x2="${X(tt).toFixed(1)}" y1="${y0 + 22}" y2="${y0 + 38}" stroke="#fff" stroke-width=".6" opacity=".7"/>`;
              }
            }
            // CL bracket from the READ to the first beat
            if (r.rd > t0 && r.d0 < t1) h += `<line x1="${X(r.rd).toFixed(1)}" x2="${X(r.d0).toFixed(1)}" y1="${y0 + 18}" y2="${y0 + 18}" stroke="${C.faint}" stroke-dasharray="2 2"/>`;
          }
        };
        lane('A', 4, C.blue);
        lane('B', 60, C.red);
        h += `<line x1="${W - 4}" x2="${W - 4}" y1="0" y2="104" stroke="${C.red}" stroke-width="1"/><text x="${W - 6}" y="116" font-size="8" text-anchor="end" fill="${C.mute}">现在</text><text x="26" y="116" font-size="8" fill="${C.mute}">−64 ns</text>`;
        h += `<text x="${(W + 22) / 2}" y="128" font-size="8" text-anchor="middle" fill="${C.mute}">虚线 = CL 等待 · 色块 = 一次 BL16 突发（16 拍）</text>`;
        subSvg.innerHTML = h;
        subT.textContent = `${s.tns.toFixed(1)} ns`;
        const say = (sub) => {
          const b = busState(sub, s.tns, p);
          if (b.mode === 'data') return `${b.r.write ? '写入' : '读出'} 第 <b>${b.beat + 1}</b>/16 拍`;
          if (b.mode === 'act') return `激活 BG${b.r.bg} 的一行`;
          if (b.mode === 'cas') return `等待 CL（${p.cl} 周期）`;
          return '空闲';
        };
        subTxt.innerHTML = `<b style="color:${C.blue}">A</b> ${say('A')} &nbsp;·&nbsp; <b style="color:${C.red}">B</b> ${say('B')}<br><span class="mu">每拍 32 bit，16 拍 = 64 字节 = 一条缓存行</span>`;

        // rails
        const u = utilisation(p);
        const rs = rails(p, u, s.tns);
        railBox.innerHTML = rs
          .map((r) => `<div style="display:flex;align-items:center;height:21px;font-size:11px"><b style="width:86px;white-space:nowrap">${r.name}</b><span class="mu" style="width:58px;font-size:9.8px">${r.from}</span><i style="display:block;width:${((r.v / r.max) * 52).toFixed(1)}px;height:5px;background:${r.key === 'VIN' ? C.orange : r.key === 'SWA' || r.key === 'SWB' ? C.red : C.faint};margin-right:6px"></i><span style="font-weight:700">${r.v.toFixed(2)} V</span></div>`)
          .join('');
        railNote.innerHTML = `VDD 电流约 ${rs[0].iVdd.toFixed(1)} A ${EST} · OC PMIC 可超 1.435 V`;
        // temperature
        const T = tempC(p, u);
        tBig.innerHTML = `${T.toFixed(1)}<span style="font-size:14px;font-weight:600"> °C</span>`;
        tTxt.innerHTML = `负载 / 电压示意模型 ${EST}<br>传感器精度 ±0.5 °C`;
        tFill.style.width = `${((T / 85) * (RW - 22)).toFixed(1)}px`;
      }

      // callouts
      callSvg.innerHTML = '';
      let svg = '';
      (s.callouts || []).forEach((c, i) => {
        let n = pool[i];
        if (!n) {
          n = el(`<div class="call"><b></b><span></span></div>`);
          callG.appendChild(n);
          pool[i] = n;
        }
        n.style.display = '';
        n.firstChild.textContent = c.title;
        n.lastChild.textContent = c.sub || '';
        const lx = c.dx < 0 ? Math.max(c.x + c.dx, 320 + 200) : Math.min(c.x + c.dx, 1285 - 200);
        const ly = Math.min(Math.max(c.y + c.dy, 70), 845);
        n.style.left = `${c.dx < 0 ? lx - 180 : lx}px`;
        n.style.width = '180px';
        n.style.textAlign = c.dx < 0 ? 'right' : 'left';
        n.style.borderLeft = c.dx < 0 ? 'none' : `2px solid ${C.red}`;
        n.style.borderRight = c.dx < 0 ? `2px solid ${C.red}` : 'none';
        n.style.top = `${ly - 14}px`;
        n.style.width = 'auto';
        if (c.dx < 0) {
          n.style.left = '';
          n.style.right = `${1600 - lx}px`;
        } else n.style.right = '';
        n.style.opacity = c.o ?? 1;
        svg += `<g opacity="${c.o ?? 1}"><circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" fill="${C.red}"/><polyline points="${c.x.toFixed(1)},${c.y.toFixed(1)} ${(lx - Math.sign(c.dx) * 8).toFixed(1)},${ly.toFixed(1)} ${lx.toFixed(1)},${ly.toFixed(1)}" fill="none" stroke="${C.ink}" stroke-width=".9"/></g>`;
      });
      for (let i = (s.callouts || []).length; i < pool.length; i++) pool[i].style.display = 'none';
      callSvg.innerHTML = svg;
      pointer(s.cursor);
    },
  };
}
