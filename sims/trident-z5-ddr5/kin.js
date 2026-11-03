// Trident Z5 RGB DDR5 · the model. Real dimensions in millimetres, real timings in nanoseconds. No three.js here.
// Two inputs pose everything: the disassembly progress e (0 assembled → 1 fully apart) and the simulated bus time
// tns (nanoseconds). Every panel, chart, pulse and callout reads from these functions, so nothing can disagree.

// ------------------------------------------------------------ dimensions (mm). Sources in SOURCES below.
export const PCB = {w: 133.35, h: 31.25, t: 1.27 /* 估算 */};
export const MODULE_H = 44; // G.SKILL FAQ: Trident Z5 RGB 44 mm
export const PIN = {pitch: 0.85, perSide: 144, first: 3.35, notchX: 68.1, notchToPin75: 1.85, notchW: 1.5, notchD: 3.85, h: 3.6 /* 估算 */};
export const DDR4_NOTCH_X = 72.25;
// pin n on the front (1..144) → x from the left edge
export const pinX = (n) => (n <= 75 ? PIN.first + (n - 1) * PIN.pitch : PIN.notchX + PIN.notchToPin75 + (n - 76) * PIN.pitch);
export const SPREADER = {t: 1.9, y0: 6.5, lightY0: 33, lightH: 9.5, gap: 8.2 /* overall thickness 估算 */};
export const PAD_T = 0.5; // igor'sLAB: ~0.5 mm

// component placement on the front face (x from left edge, y from the contact edge), sizes 估算 unless stated
export const DRAM_SIZE = [9.0, 11.0, 1.0];
export const DRAM_X = [14, 28, 42, 56, 77.4, 91.4, 105.4, 119.4];
export const DRAM_Y = 16.5;
export const PMIC_POS = [66.7, 25.2];
export const PMIC_SIZE = [4, 3, 0.75]; // RTQ5132 WQFN-28L 3×4 mm (Richtek datasheet)
export const SPD_POS = [62.2, 9.6];
export const SPD_SIZE = [2, 3, 0.75];
export const RGBC_POS = [70.6, 28.4];
export const LEDS = [10, 26, 42, 58, 75, 91, 107, 123]; // 8 per side, 估算

// ------------------------------------------------------------ profiles
export const PROFILES = {
  xmp: {name: 'XMP 3.0 · 6000', mts: 6000, cl: 30, trcd: 36, trp: 36, tras: 96, vdd: 1.35, vddq: 1.35, vpp: 1.8},
  jedec: {name: 'JEDEC · 4800', mts: 4800, cl: 40, trcd: 40, trp: 40, tras: 77, vdd: 1.1, vddq: 1.1, vpp: 1.8, est: true},
};
export const tck = (p) => 2000 / p.mts; // ns per clock (two transfers per clock)
export const ns = (p, cycles) => cycles * tck(p);
export const bandwidth = (p) => (p.mts * 8) / 1000; // GB/s per 64-bit DIMM
export const BL = 16;
export const burstNs = (p) => (BL / p.mts) * 1000; // 16 transfers
export const CAPACITY = {chips: 8, gbit: 16, width: 8, ranks: 1};

// ------------------------------------------------------------ the bus: two independent 32-bit subchannels
// A deterministic request stream per subchannel: ACT, then READ after tRCD, data after CL for BL16, PRE.
const h01 = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const PERIOD = {A: 31, B: 37};
const OFFSET = {A: 0, B: 13};
export function requestAt(sub, k, p) {
  const t0 = OFFSET[sub] + k * PERIOD[sub] + h01(k * 7.3 + (sub === 'A' ? 1 : 2)) * 9;
  const rd = t0 + ns(p, p.trcd);
  const d0 = rd + ns(p, p.cl);
  const d1 = d0 + burstNs(p);
  const chip = Math.floor(h01(k * 3.1 + (sub === 'A' ? 5 : 9)) * 4);
  const bg = Math.floor(h01(k * 1.7 + (sub === 'A' ? 3 : 4)) * 8);
  return {sub, k, t0, rd, d0, d1, chip, bg, write: h01(k * 5.9 + (sub === 'A' ? 2 : 6)) < 0.3};
}
export function requestsIn(sub, a, b, p) {
  const out = [];
  const k0 = Math.max(0, Math.floor((a - 60) / PERIOD[sub]) - 1);
  for (let k = k0; ; k++) {
    const r = requestAt(sub, k, p);
    if (r.t0 > b) break;
    if (r.d1 >= a) out.push(r);
  }
  return out;
}
// what a subchannel is doing at time t: 'data' (beat index), 'wait', 'idle'
export function busState(sub, t, p) {
  for (const r of requestsIn(sub, t - 1, t + 1, p)) {
    if (t >= r.d0 && t < r.d1) return {mode: 'data', beat: Math.floor(((t - r.d0) / (r.d1 - r.d0)) * BL), r};
    if (t >= r.t0 && t < r.d0) return {mode: t < r.rd ? 'act' : 'cas', r};
  }
  return {mode: 'idle'};
}
// fraction of time the data pins carry a burst (both subchannels together)
export const utilisation = (p) => burstNs(p) / PERIOD.A / 2 + burstNs(p) / PERIOD.B / 2;

// ------------------------------------------------------------ power: what the PMIC makes from 5 V (估算 currents)
export function rails(p, util, tns) {
  const rip = (f, a) => a * Math.sin(tns * f);
  const iVdd = 0.9 + 2.2 * util * (p.mts / 6000) * (p.vdd / 1.1); // A, 估算
  return [
    {key: 'VIN', name: 'VIN_BULK', from: '主板输入', v: 5.0 + rip(0.7, 0.01), max: 5.5, i: null},
    {key: 'SWA', name: 'SWA → VDD', from: 'DRAM 核心', v: p.vdd + rip(1.3, 0.004), max: 1.5},
    {key: 'SWB', name: 'SWB → VDDQ', from: 'DRAM I/O', v: p.vddq + rip(1.7, 0.004), max: 1.5},
    {key: 'SWC', name: 'SWC → VPP', from: '字线升压', v: p.vpp + rip(0.9, 0.004), max: 2.0},
    {key: 'L18', name: 'LDO 1.8 V', from: 'SPD Hub 等', v: 1.8, max: 2.0},
    {key: 'L10', name: 'LDO 1.0 V', from: 'Hub I/O', v: 1.0, max: 2.0},
  ].map((r) => ({...r, iVdd}));
}
// SPD hub thermal sensor reading (°C) — an illustrative first-order model, 估算
export const tempC = (p, util) => 31 + 26 * util * (p.mts / 6000) * (p.vdd / 1.1) ** 2;

// ------------------------------------------------------------ disassembly: offsets of each layer for progress e
const ss = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
// an exploded stack read upward: PCB at the base, the pad, the two halves, the light bar on top
export function explode(e) {
  const k1 = ss(0.0, 0.5, e); // heatspreader halves off, outward then up
  const k2 = ss(0.25, 0.75, e); // light bar lifts out of the halves
  const k3 = ss(0.5, 1.0, e); // thermal pad peels off the chips
  const out = ss(0, 0.6, k1);
  return {
    front: [0, 50 * ss(0.3, 1, k1), 26 * out],
    back: [0, 50 * ss(0.3, 1, k1), -26 * out],
    light: [0, 50 * ss(0.3, 1, k1) * (1 - k2) + 66 * k2, 0],
    // the pad rides with the front half until it peels, then settles between PCB and halves
    pad: [0, 50 * ss(0.3, 1, k1) * (1 - k3) + 34 * k3, 26 * out * (1 - k3) + 8 * k3],
    k1, k2, k3,
  };
}

export const SOURCES = [
  'G.SKILL 规格页 F5-6000J3036F16GX2-TZ5RK（6000 MT/s CL30-36-36-96 1.35V，XMP 3.0，SPD 默认 4800 / 1.10V）',
  'G.SKILL FAQ：Trident Z5 RGB 模组高度 44 mm；型号命名规则（J=U-DIMM，3036=CL30/tRCD36，F=1.35V，TZ5R=Trident Z5 RGB，K=黑色）',
  "igor'sLAB Trident Z5 RGB 6400 CL32 / 6800 CL34 拆解：10 层 PCB（Hsien Jinn 5GS1001D）、Richtek OC PMIC、Renesas SPD Hub、马甲单片 <2 mm、导热垫约 0.5 mm、PMIC 无导热垫",
  'Tom’s Hardware / TechPowerUp 评测：SK hynix H5CG48MEBD（M-die）/ H5CG48AGBD（A-die）16Gb x8、单面 8 颗单 Rank、LED 正反面都有',
  'AESTECHNO 引脚图：288 针、0.85 mm 间距、133.35 × 31.25 mm、DDR5 缺口 68.10 mm / DDR4 72.25 mm',
  'Richtek RTQ5132 数据手册：VIN_Bulk 4.25–5.5 V，SWA/SWB/SWC 三路降压，1.8 V 与 1.0 V 两路 LDO',
  'Renesas SPD5118 / JEDEC JESD300-5：1024 字节、I3C 12.5 MHz、温度传感器 0.5 °C',
  'Micron《DDR5 SDRAM: New Features》白皮书：两个 32 bit 子通道、BL16 = 64 字节、片上 ECC 128+8 bit、32 bank / 8 bank group',
];

// ------------------------------------------------------------ installation: the kit into A2 and B2 of a real board
// GIGABYTE X870E AORUS PRO ICE（技嘉 X870E 冰雕，ATX 30.5 × 24.4 cm）. Board coordinates: bx from the rear-I/O edge,
// by from the top edge, in mm. Outline, slot order and the recommended A2/B2 come from the user's manual (Rev. 1004,
// §1-1 layout, §2-4 memory); the positions are measured off that layout drawing, which is drawn to the 244 × 305 outline
// (估算 ±2 mm). Socket length 142 mm max / width 6.5 mm max are Amphenol's DDR5 socket spec; socket height 估算.
export const ICE = {
  W: 244, H: 305,
  pitch: 8.9, // DIMM centre to centre, measured off the layout (估算)
  dimmBx0: 182.4, // DDR5_A1 centre line (A1 A2 B1 B2 from the CPU toward the 24-pin)
  dimmBy: 93.5, // slot length centre (估算)
  cpu: [121, 85], // AM5 socket centre (估算)
};
ICE.zc = ICE.dimmBx0 + 1.5 * ICE.pitch; // between A2 and B1: the scene origin
// board (bx, by) → scene (x, z) in mm: x runs down the slot (toward the board's bottom edge), z away from the 24-pin
// side toward the CPU, so the module's notch (+1.4 mm of centre) meets the key on the bottom half, as on the board
export const toScene = (bx, by) => [by - ICE.dimmBy, ICE.zc - bx];
export const BOARD = {sockL: 142, sockW: 6.5, sockH: 8 /* 估算 */, pitch: ICE.pitch, seat: -7 /* module bottom when seated, 估算 */, cpuS: 40 /* AM5 package 40 × 40 mm */};
export const SLOTS = ['A1', 'A2', 'B1', 'B2']; // from the CPU outward
export const slotZ = (name) => toScene(ICE.dimmBx0 + SLOTS.indexOf(name) * ICE.pitch, 0)[1];
export const BOARD_SOURCES = [
  '技嘉 X870E AORUS PRO ICE 用户手册 Rev.1004（§1-1 主板布局图、§2-2 规格、§2-4 内存安装：1 条插 DDR5_A2，2 条插 DDR5_A2 + DDR5_B2；A 通道 A1/A2，B 通道 B1/B2；插错槽 DRAM 状态灯会亮）',
  '技嘉官网 X870E AORUS PRO ICE 规格页：AM5、16+2+2 相、4 × DDR5 最高 256 GB / 8200 MT/s(OC)、4 × M.2（3 × PCIe 5.0）、PCIe 5.0 x16 UD Slot X、EZ-Latch Plus / Click、24 pin + 2 × 8 pin',
  'ZOL 中关村在线：别名「冰雕 X870E AORUS PRO ICE」，ATX 30.5 × 24.4 cm',
  'ALKtech 开箱：全白银配色、一体式 I/O 挡板带 AORUS RGB 灯、Memory UD Slot 不锈钢护盾、四个 M.2 全覆盖散热片',
];
const sst = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export const INSTALL_PHASES = [
  {k: 0, key: 'installLatch'},
  {k: 0.09, key: 'installAlign'},
  {k: 0.29, key: 'installPress'},
  {k: 0.46, key: 'installB2'},
  {k: 0.9, key: 'installDone'},
];
export const installPhase = (k) => INSTALL_PHASES.filter((p) => p.k <= k + 1e-9).pop().key;
export function installPose(k) {
  const H = 12; // hover height above the seat while aligning (mm)
  const mod = (t0, t1, t2, t3, z) => {
    // t0..t1 descend from high with a sideways offset, t1..t2 align (offset → 0), t2..t3 press straight down
    const d = sst(t0, t1, k);
    const a = sst(t1, t2, k);
    const p = sst(t2, t3, k);
    const y = 120 + (H - 120) * d - (H - BOARD.seat) * p;
    const x = 12 * (1 - a);
    return [x, y, z];
  };
  return {
    m1: mod(0.08, 0.2, 0.28, 0.42, slotZ('A2')),
    m2: mod(0.47, 0.58, 0.66, 0.81, slotZ('B2')),
    // latches: 1 = open. Both open first; each clicks shut as its module bottoms out
    latch: {A1: 0, B1: 0, A2: sst(0, 0.07, k) * (1 - sst(0.405, 0.43, k)), B2: sst(0, 0.07, k) * (1 - sst(0.795, 0.82, k))},
    press1: k > 0.28 && k < 0.425,
    press2: k > 0.66 && k < 0.815,
    align: k > 0.14 && k < 0.3 ? 'A2' : k > 0.53 && k < 0.68 ? 'B2' : null,
    click: [Math.max(0, 1 - Math.abs(k - 0.43) / 0.02), Math.max(0, 1 - Math.abs(k - 0.82) / 0.02)],
  };
}
