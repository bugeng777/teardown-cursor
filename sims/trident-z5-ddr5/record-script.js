// Record mode scripts: two fixed cuts of the same machine, every beat in seconds. Each shot sets the scene (the same
// views, isolates and install progress the live page uses); subtitles carry the narration in Chinese and English;
// labels are projected from the model's own anchors. Every claim here is taken from tour.js / kin.js (same sources);
// anything the page marks 估算 is marked est. here too.
//
// Rule for every video (Hill): the first >= 10 s lead with the key point, asked as an unusual question; the title is
// that question. Mainland cuts burn zh + en subtitles, YouTube cuts burn English only.

const L = (t0, t1, a, zh, en, dx, dy, o = {}) => ({t0, t1, a, zh, en, dx, dy, board: 1, ...o});
const M = (t0, t1, a, zh, en, dx, dy, o = {}) => ({t0, t1, a, zh, en, dx, dy, board: 0, ...o});
const S = (t0, t1, zh, en) => ({t0, t1, zh, en});

const HOOK = {
  q: {zh: '两根内存\n插 1、3 还是 2、4？', en: 'Two sticks, four slots:\n1 & 3, or 2 & 4?'},
  a: {zh: '答案：2、4 槽 = A2 + B2', en: 'Answer: 2 & 4 = A2 + B2'},
  src: {zh: '技嘉 X870E AORUS PRO ICE 说明书 §2-4', en: 'GIGABYTE X870E AORUS PRO ICE manual, §2-4'},
};
const END = {
  zh: '自己转 3D 模型', en: 'Spin the 3D model yourself', url: 'hardware-pitfalls.pages.dev',
};

// portrait boardtop: turned a quarter so the slots run across the frame, CPU above them
const BT9 = {az: 90, d: 0.75, sy: -230};

// ---------------------------------------------------------------- short: vertical, Douyin / Bilibili, ~59 s
export const SHORT = {
  duration: 59,
  title: {zh: '两根内存插 1、3 槽和插 2、4 槽，到底差在哪？', en: 'Slots 1 & 3 vs 2 & 4: what actually changes?'},
  hook: {t0: 0, t1: 10, a1: 3.6, a2: 6.8, ...HOOK},
  end: {t0: 55, t1: 59, ...END},
  shots: [
    {t: 0, mode: 'install', view: 'boardtop', k: 1, cam9: {...BT9, sy: -100}},
    {t: 10, mode: 'install', view: 'boardtop', k: 0, kit: false, cam9: BT9, blend: 1.2, tr: 'LinearBlur', trDur: 0.8},
    {t: 20, mode: 'install', view: 'install', k: [0, 1, 16], cam9: {d: 1.05, sy: -120}, tr: 'CrossZoom', trDur: 1.0},
    {t: 36, mode: 'install', view: 'boardtop', k: 1, cam9: BT9, tr: 'LinearBlur', trDur: 0.8},
    {t: 49, mode: 'install', view: 'boardtop', k: 1, cam9: {...BT9, d: 0.8, sy: -330}},
    {t: 55, mode: 'teardown', view: 'hero', e: 0, tr: 'CrossZoom', trDur: 1.0},
  ],
  subs: [
    S(0.2, 3.6, '两根内存，插 1、3 槽和插 2、4 槽，到底差在哪？', 'Two sticks of RAM: slots 1 & 3, or 2 & 4. What changes?'),
    S(3.6, 6.8, '先说答案：插 2、4 槽，也就是 A2 + B2。', 'The answer first: slots 2 & 4, i.e. A2 + B2.'),
    S(6.8, 10.0, '技嘉 X870E 冰雕的说明书：两条就插 A2 + B2。', "GIGABYTE's X870E AORUS PRO ICE manual: two sticks go in A2 + B2."),
    S(10.0, 14.0, '从 CPU 往外数，4 个槽依次是 A1、A2、B1、B2。', 'Counting out from the CPU: A1, A2, B1, B2.'),
    S(14.0, 17.2, 'A1、A2 是 A 通道，B1、B2 是 B 通道。', 'A1 + A2 are channel A; B1 + B2 are channel B.'),
    S(17.2, 20.0, '插 1、3 槽（A1 + B1）其实也是双通道。那为什么偏偏是 2、4？', 'So 1 & 3 (A1 + B1) is dual-channel too. Why 2 & 4, then?'),
    S(20.0, 21.8, '先装上：两端卡扣都掰开。', 'First, install: open the latches at both ends.'),
    S(21.8, 24.6, '缺口对准插槽里的防呆键，方向反了插不进去。', "Line the notch up with the slot's key. Backwards, it won't go in."),
    S(24.6, 27.4, '两端均匀按到底，“咔”一声，两头卡扣都合上。', 'Press both ends evenly until it clicks and both latches close.'),
    S(27.4, 34.4, '第二条同样的步骤，插到 B2。', 'The second stick goes into B2 the same way.'),
    S(34.4, 36.0, '装好：A、B 通道各一条。', 'Done: one stick per channel.'),
    S(36.0, 40.0, '原因（通行解释，说明书没写）：每个通道的走线是“菊花链”。', 'Why (a common explanation, not in the manual): each channel is a daisy chain.'),
    S(40.0, 43.5, 'CPU → 1 号槽 → 2 号槽，2 号槽在走线末端。', 'CPU → slot 1 → slot 2, and slot 2 is the end of the line.'),
    S(43.5, 49.0, '插 A1 的话，通往空 A2 的那段线就成了“断头线”，信号反射，高频更容易不稳。', 'Fill A1, and the trace to the empty A2 becomes a dead-end stub. Reflections make high speeds less stable.'),
    S(49.0, 52.5, '插 1、2 槽更糟：两条都挤在 A 通道，变成单通道。', 'Slots 1 & 2 are worse: both on channel A means single-channel.'),
    S(52.5, 55.0, '6000 MT/s 时理论带宽：双通道约 96 GB/s，单通道只有一半。', 'At 6000 MT/s: ~96 GB/s peak dual-channel, half that single.'),
    S(55.0, 58.8, '装好别忘了进 BIOS 开 XMP，才会从 4800 跑到 6000。', 'Then enable XMP in BIOS, or it stays at 4800 MT/s.'),
  ],
  labels: [
    L(0.6, 10, 'A2', 'A2 ✓', 'A2 ✓', 70, -80, {hot: 1}),
    L(0.6, 10, 'B2', 'B2 ✓', 'B2 ✓', 70, 70, {hot: 1}),
    L(10.8, 20, 'cpu', 'CPU', 'CPU', -170, -40),
    L(11.4, 20, 'A1b', 'A1', 'A1', -70, -80),
    L(11.8, 20, 'A2', 'A2', 'A2', 70, -80, {hot: 1}),
    L(12.2, 20, 'B1b', 'B1', 'B1', -70, 80),
    L(12.6, 20, 'B2', 'B2', 'B2', 70, 80, {hot: 1}),
    L(21.8, 24.6, 'keyA2', '防呆键', 'Key', 120, -160),
    L(37.0, 49, 'traceA', 'A 通道走线 · 示意', 'Channel A trace · illustrative', -60, -170, {est: 1}),
    L(37.4, 49, 'traceB', 'B 通道走线 · 示意', 'Channel B trace · illustrative', 60, -290, {est: 1}),
    L(40.5, 49, 'A2', '末端', 'end', 70, -80, {hot: 1}),
    L(40.5, 49, 'B2', '末端', 'end', 70, 80, {hot: 1}),
  ],
  charts: [{kind: 'bw', t0: 49.3, t1: 55}],
  chapters: [],
};

// ---------------------------------------------------------------- long: horizontal, YouTube, ~125 s
export const LONG = {
  duration: 125,
  title: {zh: '两根内存插 1、3 槽和插 2、4 槽，到底差在哪？', en: 'Slots 1 & 3 or 2 & 4? Why your RAM goes in A2 + B2 (DDR5 teardown)'},
  hook: {t0: 0, t1: 11, a1: 3.8, a2: 7.2, ...HOOK},
  end: {t0: 121, t1: 125, ...END},
  shots: [
    {t: 0, mode: 'install', view: 'boardtop', k: 1, cam16: {sx: 300, d: 0.95}},
    {t: 11, mode: 'teardown', view: 'hero', e: 0, tr: 'CrossZoom', trDur: 1.0},
    {t: 19, mode: 'teardown', view: 'hero', e: 1},
    {t: 25, mode: 'teardown', iso: 'dram', view: 'chips', e: 1},
    {t: 38, mode: 'teardown', iso: 'pmic', view: 'pmic', e: 1, flow: 'power'},
    {t: 49, mode: 'teardown', iso: 'spd', view: 'spd', e: 1},
    {t: 57, mode: 'teardown', iso: 'pcb', view: 'fingers', e: 1},
    {t: 65, mode: 'install', view: 'board', k: 0, kit: false, tr: 'CrossZoom', trDur: 1.0},
    {t: 69, mode: 'install', view: 'boardtop', k: 0, kit: false},
    {t: 73, mode: 'install', view: 'install', k: [0, 1, 17], tr: 'LinearBlur', trDur: 0.8},
    {t: 90, mode: 'install', view: 'boardtop', k: 1, tr: 'LinearBlur', trDur: 0.8},
    {t: 108, mode: 'install', view: 'boardtop', k: 1},
    {t: 117, mode: 'teardown', view: 'hero', e: 0, cam16: {sy: 110}, tr: 'CrossZoom', trDur: 1.0},
  ],
  subs: [
    S(0.2, 3.8, '两根内存、4 个槽：插 1、3 还是 2、4？有区别吗？', 'Two sticks of RAM, four slots: 1 & 3, or 2 & 4? Does it matter?'),
    S(3.8, 7.2, '先说答案：2、4 槽，也就是 A2 + B2。', 'Short answer: 2 & 4, i.e. A2 + B2.'),
    S(7.2, 11.0, '技嘉 X870E 冰雕说明书就是这么写的。下面讲原因，顺便拆开内存条。', "That's what GIGABYTE's X870E AORUS PRO ICE manual says. Here's why, and what's inside the stick."),
    S(11.0, 15.0, '芝奇幻光戟 Trident Z5 RGB DDR5，示例套条 F5-6000J3036F16GX2-TZ5RK，2 × 16 GB。', 'The stick: G.SKILL Trident Z5 RGB DDR5. Example kit F5-6000J3036F16GX2-TZ5RK, 2 × 16 GB.'),
    S(15.0, 19.0, 'XMP：6000 MT/s、CL30-36-36-96、1.35 V；不开 XMP 按 4800 MT/s、1.10 V 启动。', 'XMP: 6000 MT/s, CL30-36-36-96, 1.35 V. Without XMP it boots at 4800 MT/s, 1.10 V.'),
    S(19.0, 22.5, '从外往里拆：', 'Taking it apart, outside in:'),
    S(22.5, 25.0, '灯条 → 铝马甲 → 导热垫 → 颗粒 → 10 层 PCB。', 'light bar → aluminium spreaders → thermal pad → chips → 10-layer PCB.'),
    S(25.0, 29.0, '8 颗 SK hynix 颗粒，每颗 16 Gb：8 × 2 GB = 16 GB，单 Rank。', '8 SK hynix chips, 16 Gb each: 8 × 2 GB = 16 GB, single rank.'),
    S(29.0, 33.5, 'DDR5 把一条内存拆成两个独立的 32 bit 子通道：左 4 颗是 A，右 4 颗是 B。', 'DDR5 splits each stick into two independent 32-bit subchannels: 4 chips for A, 4 for B.'),
    S(33.5, 38.0, '每次突发 BL16：16 拍 × 32 bit = 64 字节，正好一条 CPU 缓存行。', 'Each burst is BL16: 16 beats × 32 bits = 64 bytes, one CPU cache line.'),
    S(38.0, 42.0, 'DDR5 新变化：主板只给 5 V，由条子上的 PMIC 自己降压。', 'New in DDR5: the board only supplies 5 V. A PMIC on the stick does the regulating.'),
    S(42.0, 45.5, 'Richtek PMIC：VDD/VDDQ 在 JEDEC 是 1.1 V，XMP 是 1.35 V；VPP 1.8 V。', 'Richtek PMIC: VDD/VDDQ 1.1 V at JEDEC, 1.35 V with XMP; VPP 1.8 V.'),
    S(45.5, 49.0, '它是可调压的 OC PMIC，XMP 才能把电压加上去。', "It's an overclocking PMIC; that's what lets XMP raise the voltage."),
    S(49.0, 53.0, 'SPD5118 Hub：1024 字节，存着 JEDEC 默认参数和 XMP 3.0 档。', 'SPD5118 hub: 1024 bytes holding the JEDEC defaults and the XMP 3.0 profile.'),
    S(53.0, 57.0, '还内置 ±0.5 °C 的温度传感器。主板开机先读它。', 'Plus a ±0.5 °C temperature sensor. The board reads all of it at boot.'),
    S(57.0, 61.0, '288 针金手指，间距 0.85 mm；防呆缺口距一端 68.10 mm。', '288 gold fingers at 0.85 mm pitch. The key notch sits 68.10 mm from the end.'),
    S(61.0, 65.0, 'DDR4 的缺口在 72.25 mm，所以 DDR4 和 DDR5 插不错。', "DDR4's notch is at 72.25 mm, so DDR4 and DDR5 can't be swapped."),
    S(65.0, 69.0, '主板：技嘉 X870E AORUS PRO ICE，布局按官方说明书还原（±2 mm）。', 'The board: GIGABYTE X870E AORUS PRO ICE, layout traced from the official manual (±2 mm).'),
    S(69.0, 73.0, '4 个 DDR5 槽，从 CPU 往外数：A1、A2、B1、B2。', 'Four DDR5 slots, counted out from the CPU: A1, A2, B1, B2.'),
    S(73.0, 74.9, '安装：先断电，两端卡扣都掰开。', 'Install: power off, open the latches at both ends.'),
    S(74.9, 78.6, '缺口对准插槽里的防呆键。方向反了插不进去，别硬按。', "Line the notch up with the slot's key. Wrong way round it won't go in, so don't force it."),
    S(78.6, 81.5, '两端竖直均匀按到底，“咔”一声，两头卡扣都合上。', 'Press both ends straight down until it clicks and both latches close.'),
    S(81.5, 88.0, '第二条同样的步骤，插到 B2。', 'The second stick goes into B2, the same way.'),
    S(88.0, 90.0, 'A、B 通道各一条：双通道。', 'One stick per channel: dual-channel.'),
    S(90.0, 94.0, '为什么不插 A1 + B1？它其实也是双通道。', "Why not A1 + B1? That's dual-channel too."),
    S(94.0, 99.0, '通行解释（说明书没写）：每个通道是菊花链，CPU → 1 号槽 → 末端的 2 号槽。', 'The common explanation (not in the manual): each channel is a daisy chain, CPU → slot 1 → slot 2 at the end.'),
    S(99.0, 104.0, '插在 1 号槽，通往空 2 号槽的那段线就成了断头线，信号反射，高频更容易不稳。', 'A stick in slot 1 leaves a dead-end stub to the empty slot 2. Reflections there make high speeds less stable.'),
    S(104.0, 108.0, '金色走线是示意，真实走线在 PCB 内层。', 'The gold traces are illustrative; the real ones run on inner layers.'),
    S(108.0, 112.5, '那插 1、2 槽呢？两条都在 A 通道：单通道。', 'And slots 1 & 2? Both on channel A: single-channel.'),
    S(112.5, 117.0, '6000 MT/s 时理论峰值约 48 GB/s，而不是约 96 GB/s。', "At 6000 MT/s that's ~48 GB/s peak instead of ~96 GB/s."),
    S(117.0, 121.0, '最后一步：进 BIOS 打开 XMP，否则一直跑 4800 MT/s。', 'Last step: enable XMP in BIOS, or it stays at 4800 MT/s.'),
  ],
  labels: [
    L(0.6, 11, 'A2', 'A2 ✓', 'A2 ✓', -150, -110, {hot: 1}),
    L(0.6, 11, 'B2', 'B2 ✓', 'B2 ✓', 140, -110, {hot: 1}),
    M(20.5, 25, 'bar', '扩散灯条', 'Light bar', 170, -40),
    M(20.8, 25, 'front', '铝马甲', 'Aluminium spreader', -230, -40),
    M(21.1, 25, 'pad', '导热垫 ≈ 0.5 mm', 'Thermal pad ≈ 0.5 mm', -260, 40),
    M(21.4, 25, 'dramA', '8 颗 DRAM', '8 DRAM chips', -200, 150),
    M(21.7, 25, 'pmic', 'PMIC', 'PMIC', 200, 170),
    M(29.3, 38, 'dramA', '子通道 A · 4 × 8 bit', 'Subchannel A · 4 × 8 bit', -150, -150),
    M(29.6, 38, 'dramB', '子通道 B · 4 × 8 bit', 'Subchannel B · 4 × 8 bit', 150, -150),
    M(39.0, 49, 'pmic', 'Richtek PMIC · 5 V 输入', 'Richtek PMIC · 5 V in', 180, -160),
    M(50.0, 57, 'spd', 'SPD5118 Hub + 温度传感器', 'SPD5118 hub + temp sensor', -200, 150),
    M(58.0, 65, 'notch', '缺口 68.10 mm', 'Notch at 68.10 mm', 150, -140),
    M(58.3, 65, 'fingers', '0.85 mm 间距', '0.85 mm pitch', -190, -140),
    L(65.8, 69, 'cpu', 'AM5 插槽', 'AM5 socket', -160, -120),
    L(66.1, 69, 'B2', '4 × DDR5', '4 × DDR5', 150, -90),
    L(66.4, 69, 'pcie', 'PCIe 5.0 x16', 'PCIe 5.0 x16', -200, 60),
    L(69.6, 73, 'cpu', 'CPU', 'CPU', -170, -130),
    L(70.0, 73, 'A1', 'A1', 'A1', -130, -190),
    L(70.4, 73, 'A2', 'A2', 'A2', -50, -250, {hot: 1}),
    L(70.8, 73, 'B1', 'B1', 'B1', 40, -190),
    L(71.2, 73, 'B2', 'B2', 'B2', 130, -250, {hot: 1}),
    L(74.9, 78.6, 'keyA2', '防呆键', 'Slot key', 150, -130),
    L(91.0, 108, 'traceA', 'A 通道走线 · 示意', 'Channel A trace · illustrative', -80, -150, {est: 1}),
    L(91.4, 108, 'traceB', 'B 通道走线 · 示意', 'Channel B trace · illustrative', -80, 150, {est: 1}),
    L(95.0, 108, 'A2', '末端', 'end of line', -80, -110, {hot: 1}),
    L(95.0, 108, 'B2', '末端', 'end of line', 80, -110, {hot: 1}),
  ],
  charts: [{kind: 'lat', t0: 15.2, t1: 19}, {kind: 'bw', t0: 108.4, t1: 117}],
  chapters: [
    {t: 11, zh: '01 · 内存条', en: '01 · The stick'},
    {t: 65, zh: '02 · 安装', en: '02 · Install'},
    {t: 90, zh: '03 · 为什么 A2 + B2', en: '03 · Why A2 + B2'},
  ],
};
