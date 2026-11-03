// What the page says and where it looks: camera views, what each isolate shows, the callouts, the Chinese
// explainer text, and the auto tour's SCRIPT (a pure function of tour time).
import {EST} from './console.js';
import {PIN, DDR4_NOTCH_X, PROFILES, ns, bandwidth, slotZ} from './kin.js';

const sm = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
// views: functions of u (seconds since the view came on) and e (disassembly progress)
export const VIEW_FN = {
  hero: (u, e) => ({tx: 0.0, ty: 0.2 + 0.36 * e, tz: 0, az: 28 + 6 * Math.sin(u * 0.12), el: 15 + 4 * e, d: 2.65 + 1.35 * e, sx: 0, sy: 0}),
  front: (u, e) => ({tx: 0, ty: 0.2 + 0.36 * e, tz: 0, az: 2 * Math.sin(u * 0.2), el: 5, d: 2.55 + 1.3 * e, sx: 0, sy: 0}),
  top: (u, e) => ({tx: 0, ty: 0.3 + 0.3 * e, tz: 0, az: 22 + 4 * Math.sin(u * 0.15), el: 56, d: 2.6 + 0.5 * e, sx: 0, sy: 0}),
  fingers: (u) => ({tx: 0.01, ty: 0.05, tz: 0, az: 16 + 4 * Math.sin(u * 0.2), el: 14, d: 0.75, sx: 0, sy: 0}),
  rear: (u, e) => ({tx: 0, ty: 0.2 + 0.36 * e, tz: 0, az: 205 + 4 * Math.sin(u * 0.12), el: 15, d: 2.65 + 1.35 * e, sx: 0, sy: 0}),
  // part views used by the isolates
  chips: (u) => ({tx: 0, ty: 0.16, tz: 0, az: 8 + 5 * Math.sin(u * 0.15), el: 14, d: 1.6, sx: 0, sy: 0}),
  pmic: (u) => ({tx: 0.0, ty: 0.19, tz: 0, az: 10 + 4 * Math.sin(u * 0.2), el: 12, d: 0.8, sx: 0, sy: 0}),
  spd: (u) => ({tx: -0.035, ty: 0.12, tz: 0, az: 12 + 4 * Math.sin(u * 0.2), el: 10, d: 0.68, sx: 0, sy: 0}),
  bar: (u) => ({tx: 0, ty: 0.68, tz: 0, az: 24 + 5 * Math.sin(u * 0.15), el: 26, d: 2.5, sx: 0, sy: 0}),
  pad: (u) => ({tx: 0, ty: 0.36, tz: 0.04, az: 26 + 4 * Math.sin(u * 0.15), el: 16, d: 2.3, sx: 0, sy: 0}),
  spreader: (u) => ({tx: 0, ty: 0.55, tz: 0, az: 34 + 6 * Math.sin(u * 0.12), el: 14, d: 3.2, sx: 0, sy: 0}),
  pcbv: (u) => ({tx: 0, ty: 0.16, tz: 0, az: 6 + 4 * Math.sin(u * 0.15), el: 8, d: 2.2, sx: 0, sy: 0}),
  // installation: wide on the board, pushing in on each slot while its module aligns (k = install progress)
  install: (u, e, k = 0) => {
    const bump = (c) => Math.min(1, Math.max(0, 1.6 - Math.abs(k - c) / 0.075));
    const a1 = bump(0.22);
    const b1 = bump(0.61);
    const f = sm(Math.min(1, a1 + b1));
    const zf = (a1 > b1 ? slotZ('A2') : slotZ('B2')) * 0.01;
    // wide: from the board's lower right (24-pin side), CPU and I/O shroud behind the slots
    const base = {tx: 0.12, ty: 0.08, tz: 0.22, az: 136 + 4 * Math.sin(u * 0.15), el: 34, d: 4.0};
    // close: on the notch and the socket key of the slot being filled
    const near = {tx: 0.03, ty: 0.02, tz: zf, az: 162, el: 50, d: 2.3};
    const o = {sx: 0, sy: 0};
    for (const key in base) o[key] = base[key] + (near[key] - base[key]) * f;
    return o;
  },
  // top-down, board upright (I/O on the left): CPU, the traces, the four slots
  boardtop: (u) => ({tx: -0.04, ty: 0, tz: 0.36, az: 90 + 2 * Math.sin(u * 0.2), el: 68, d: 4.3, sx: 0, sy: 0}),
  // the whole board
  board: (u) => ({tx: 0.62, ty: 0, tz: 0.72, az: 90 + 2 * Math.sin(u * 0.2), el: 62, d: 7.2, sx: 0, sy: 0}),
  section: (u) => ({tx: -0.24, ty: 0.22, tz: 0, az: -62 + 4 * Math.sin(u * 0.2), el: 16, d: 1.3, sx: 0, sy: 0}),
};

// isolate → visibility of each part, the disassembly it needs, the view it asks for
const F = 0.07;
export const ISO = {
  all: {vis: {}, e: 0, view: null},
  spreader: {vis: {pcb: F, dram: F, pmic: F, spd: F, light: F, bar: F, pad: F}, e: 1, view: 'spreader'},
  bar: {vis: {front: 0.05, back: 0.05, pad: 0.05, pcb: 0.3, dram: 0.2, pmic: 0.2, spd: 0.2}, e: 1, view: 'bar'},
  pad: {vis: {front: 0.05, back: 0.05, bar: F, light: F, pcb: 0.3, dram: 0.55, pmic: 0.2, spd: 0.2}, e: 1, view: 'pad'},
  pcb: {vis: {front: 0, back: 0, bar: 0, pad: 0, dram: 0.35, pmic: 0.35, spd: 0.35, light: 0.35}, e: 1, view: 'pcbv'},
  dram: {vis: {front: 0, back: 0, bar: 0.04, pad: 0, pcb: 0.5, pmic: 0.25, spd: 0.25, light: 0.25}, e: 1, view: 'chips'},
  pmic: {vis: {front: 0, back: 0, bar: 0.04, pad: 0, pcb: 0.55, dram: 0.3, spd: 0.3, light: 0.25}, e: 1, view: 'pmic', flow: 'power'},
  spd: {vis: {front: 0, back: 0, bar: 0.04, pad: 0, pcb: 0.55, dram: 0.3, pmic: 0.3, light: 0.25}, e: 1, view: 'spd'},
};

// callouts: anchor key, title, sub, label offset (px)
export const CALLOUTS = {
  assembled: [
    {a: 'front', t: '铝合金散热马甲', s: '前后两片 · 中间拉丝黑条', dx: -150, dy: -90},
    {a: 'bar', t: 'RGB 扩散灯条', s: '顶部一整条导光', dx: 120, dy: -80},
    {a: 'fingers', t: '288 针金手指', s: '每面 144 针 · 0.85 mm', dx: -120, dy: 70},
    {a: 'notch', t: 'DDR5 防呆缺口', s: '距左端 68.10 mm', dx: 110, dy: 80},
  ],
  exploded: [
    {a: 'bar', t: '扩散灯条', s: '', dx: 140, dy: -30},
    {a: 'front', t: '前散热片', s: '', dx: -170, dy: -40},
    {a: 'pad', t: '导热垫', s: '', dx: -190, dy: 10},
    {a: 'dramA', t: '8 颗 DRAM', s: '', dx: -150, dy: 120},
    {a: 'pmic', t: 'PMIC 电源管理', s: '', dx: 150, dy: 140},
  ],
  spreader: [
    {a: 'front', t: '前半片（铝）', s: '最厚处 < 2 mm', dx: -170, dy: -60},
    {a: 'back', t: '后半片（铝）', s: '和前半片对扣', dx: 140, dy: -70},
  ],
  bar: [
    {a: 'bar', t: '半透明扩散灯条', s: '把点光源摊成光带', dx: 130, dy: -60},
    {a: 'leds', t: 'RGB LED', s: '正反面都有', dx: 130, dy: 70},
    {a: 'rgbc', t: '灯控芯片', s: '6K5850UA0', dx: -160, dy: 80},
  ],
  pad: [{a: 'pad', t: '导热垫 ≈ 0.5 mm', s: '只盖 8 颗 DRAM', dx: -170, dy: -70}],
  pcb: [
    {a: 'pcb', t: '10 层 PCB', s: 'Hsien Jinn 5GS1001D', dx: 60, dy: -90},
    {a: 'notch', t: '防呆缺口 68.10 mm', s: 'DDR4 在 72.25 mm', dx: 90, dy: 80},
    {a: 'fingers', t: '金手指 0.85 mm 间距', s: '正面 1–144 · 背面 145–288', dx: -140, dy: 80},
  ],
  fingers: [
    {a: 'notch', t: '防呆缺口', s: '1.5 mm 宽 · 3.85 mm 深', dx: 110, dy: -110},
    {a: 'fingers', t: '第 75 / 76 针之间', s: 'DDR4 在第 77 / 78 针之间', dx: -150, dy: -110},
  ],
  dram: [
    {a: 'dramA', t: '子通道 A', s: '4 颗 × 8 bit = 32 bit', dx: -110, dy: -110},
    {a: 'dramB', t: '子通道 B', s: '4 颗 × 8 bit = 32 bit', dx: 110, dy: -110},
  ],
  pmic: [{a: 'pmic', t: 'Richtek PMIC', s: '5 V → 1.35 V / 1.8 V / 1.0 V', dx: 120, dy: -120}],
  spd: [{a: 'spd', t: 'SPD5118 Hub + 温度传感器', s: '1024 字节 · I3C', dx: -130, dy: 110}],
  installBoard: [
    {a: 'cpu', t: 'AM5 插槽', s: 'Ryzen 9000 / 8000 / 7000', dx: -120, dy: -110, board: 1},
    {a: 'vrm', t: '一体式 I/O 挡板 + 供电散热片', s: '16+2+2 相 · AORUS RGB 灯', dx: -150, dy: 70, board: 1},
    {a: 'eps', t: 'CPU 供电 2 × 8 pin', s: '12V_2X4_1 / _2', dx: -40, dy: -70, board: 1},
    {a: 'B2', t: '4 × DDR5 插槽', s: 'DDR5_A1 A2 B1 B2 · 最高 256 GB', dx: 120, dy: -60, board: 1},
    {a: 'atx', t: '24 pin 主供电', s: '', dx: 110, dy: 20, board: 1},
    {a: 'led', t: '状态灯 CPU/DRAM/VGA/BOOT', s: '插错槽 DRAM 灯会亮', dx: 120, dy: -110, board: 1},
    {a: 'pcie', t: 'PCIe 5.0 x16', s: 'UD Slot X 金属装甲', dx: -150, dy: 40, board: 1},
    {a: 'm2', t: 'M.2 散热片', s: '4 × M.2 · 3 条 PCIe 5.0', dx: 60, dy: 110, board: 1},
  ],
  install: [
    {a: 'cpu', t: 'CPU', s: '内存控制器在这里', dx: -130, dy: -80, board: 1},
    {a: 'A1b', t: 'DDR5_A1', s: '离 CPU 最近 · 本次空着', dx: -230, dy: 40, board: 1},
    {a: 'A2b', t: 'DDR5_A2 ← 第 1 条', s: '从 CPU 数第 2 槽', dx: -210, dy: 95, board: 1},
    {a: 'B1b', t: 'DDR5_B1', s: '本次空着', dx: -190, dy: 150, board: 1},
    {a: 'B2b', t: 'DDR5_B2 ← 第 2 条', s: '从 CPU 数第 4 槽', dx: 90, dy: 90, board: 1},
    {a: 'latchA2', t: '两端都有卡扣', s: '技嘉说明书图示', dx: 110, dy: -70, board: 1},
  ],
  installAlignA2: [
    {a: 'keyA2', t: '插槽里的防呆键', s: '对准内存 68.10 mm 处的缺口', dx: 130, dy: 70, board: 1},
  ],
  installAlignB2: [
    {a: 'keyB2', t: '插槽里的防呆键', s: '缺口对不上就插不进去', dx: 130, dy: 70, board: 1},
  ],
  boardtop: [
    {a: 'traceA', t: 'A 通道走线（示意）', s: 'CPU → A1 → A2（末端）', dx: -60, dy: -90, board: 1},
    {a: 'traceB', t: 'B 通道走线（示意）', s: 'CPU → B1 → B2（末端）', dx: -60, dy: 90, board: 1},
    {a: 'A2', t: 'A2', s: '', dx: -40, dy: -50, board: 1},
    {a: 'B2', t: 'B2', s: '', dx: 40, dy: -50, board: 1},
  ],
  section: [
    {a: 'front', t: '散热片 → 导热垫 → 颗粒 → PCB', s: '热量走的路线', dx: 130, dy: -90},
  ],
};

const P = (s) => `<p>${s}</p>`;
const x = PROFILES.xmp;
const j = PROFILES.jedec;
const STEP = (n, title, sub, body) => `<h3>${n} · ${title}</h3><h4>${sub}</h4>` + body;
export const INFO = {
  installBoard: `<h3>技嘉 X870E AORUS PRO ICE</h3><h4>「冰雕」· ATX 30.5 × 24.4 cm · X870E</h4>` +
    P(`AM5 插槽；<b>16+2+2 相</b>供电藏在银白散热片和一体式 I/O 挡板下；顶边 <b>2 × 8 pin</b>、右边 <b>24 pin</b> 供电。`) +
    P(`4 条 DDR5 插槽从 CPU 往外是 <b>A1、A2、B1、B2</b>，最高 256 GB / 8200 MT/s(OC)。下面是 PCIe 5.0 x16 和 4 个 M.2（3 个 PCIe 5.0）。`) +
    P(`位置按官方说明书布局图量出（±2 mm），高度和外形细节 ${EST}。`),
  installLatch: STEP('安装第 1 步', '打开卡扣', '技嘉 X870E AORUS PRO ICE · DDR5_A1 A2 B1 B2', P(`先关机、拔掉电源线，摸一下机箱金属外壳释放静电。`) +
    P(`从 CPU 往外数，插槽依次是 <b>DDR5_A1、A2、B1、B2</b>。技嘉说明书 §2-4：1 条插 A2；两条一套插 <b>A2 + B2</b>（第 2、第 4 槽）；4 条全插。`) +
    P(`这块板的内存插槽<b>两端都有卡扣</b>（说明书的布局图和安装图两头都画了卡扣）。把 A2、B2 两头的卡扣都往外掰开。`)),
  installAlign: STEP('安装第 2 步', '对准防呆缺口', '缺口和插槽里的凸键必须对上', P(`内存金手指上的缺口不在正中间：距一端 <b>68.10 mm</b>，偏离中心约 1.4 mm。插槽里对应位置有一个凸起的键（画面里闪红的那一小块）。`) +
    P(`方向反了是插不进去的，<b>不要硬按</b>。先目测缺口和凸键对齐，再把内存竖直放进槽里。`) +
    P(`DDR4 的缺口在 72.25 mm，所以 DDR4 内存插不进 DDR5 插槽，反过来也一样。`)),
  installPress: STEP('安装第 3 步', '竖直按到底', '两端均匀用力 · 听到“咔”', P(`两只手的拇指分别按住内存两端（红色箭头），<b>竖直、均匀</b>地往下压，不要一头高一头低。`) +
    P(`按到底时两头的卡扣会自己弹回、扣住内存两侧的缺口，并发出“<b>咔</b>”的一声。插好后金手指应该完全没入插槽、看不到。`) +
    P(`<b>两头卡扣都合上</b>才算到位；只合上一头，说明另一头还没压到底。`)),
  installB2: STEP('安装第 4 步', '第二条插 B2', '同样的步骤，另一个通道', P(`第二条按同样的步骤插到 <b>DDR5_B2</b>：开卡扣 → 对准缺口 → 两端均匀按到底 → 咔。`) +
    P(`这套 2×16GB 是出厂配对测试过的（G.SKILL 规格页写明不要混用套条），技嘉说明书也建议用同容量、同品牌、同频率、同颗粒的内存。`) +
    P(`开机后第一次可能训练内存时间较长，黑屏一会儿是正常的；之后进 BIOS 打开 XMP 才会跑到 6000。`)),
  installDone: STEP('装好了', 'A2 + B2 · 双通道', '点「为什么插 A2+B2」看原因', P(`两条都已插到底、卡扣扣好。A 通道和 B 通道各一条，组成<b>双通道</b>。`) +
    P(`说明书提示：插错槽的话，开机自检时右上角的 <b>DRAM 状态灯</b>会亮。`) +
    P(`下一步：开机进 BIOS 打开 XMP（这块板规格写明支持 XMP 和 AMD EXPO 档），频率从默认 4800 升到 6000 MT/s（官方支持列表里有 6000(OC)）。`)),
  installWhy: `<h3>为什么插 A2 + B2</h3><h4>技嘉说明书推荐 · 双通道 + 走线末端</h4>` +
    P(`<b>说明书 §2-4</b>：2 条插 DDR5_A2 + B2，单条先插 A2。A 通道 = A1、A2，B 通道 = B1、B2。`) +
    P(`<b>双通道</b>：A、B 各一条同时工作，6000 MT/s 时约 2 × 48 = <b>96 GB/s</b>；插 A1+A2 只用一个通道。`) +
    P(`<b>走线末端</b>（通行解释，说明书没写）：菊花链从 CPU 先过 1 号槽再到 <b>2 号槽（末端）</b>。插 A1 会让后面那段线成“断头线”，信号反射，高频不稳。`) +
    P(`金色走线是示意，真实走线在内层 ${EST}。`),
  intro: `<h3>芝奇幻光戟 Trident Z5 RGB</h3><h4>DDR5 台式机内存 · 288 针 UDIMM</h4>` +
    P(`示例型号 <b>F5-6000J3036F16GX2-TZ5RK</b>：两条 16 GB，XMP 3.0 档 <b>6000 MT/s、CL30-36-36-96、1.35 V</b>；不开 XMP 时按 SPD 默认 4800 MT/s、1.10 V 启动。`) +
    P(`外面是两片铝合金马甲加顶部 RGB 灯条，整条高 <b>44 mm</b>，PCB 本身是 JEDEC 标准的 133.35 × 31.25 mm。`) +
    P(`点右下角的按钮可以拆开、单独看每个部件；不动它，页面会自己讲一遍。`),
  explode: `<h3>拆开：从外到里</h3><h4>拆解进度是驱动整个模型的那个输入</h4>` +
    P(`真拆时要先用热风把马甲上的导热胶烤软（igor'sLAB 用电吹风烤了几分钟），再把两片铝片掰开。`) +
    P(`从外到里依次是：<b>灯条 → 两片铝马甲 → 导热垫 → 8 颗 DRAM、PMIC、SPD Hub → 10 层 PCB</b>。`) +
    P(`左边的滑块就是拆解进度，拖动它，所有部件按同一个数一起动。`),
  spreader: `<h3>散热马甲</h3><h4>两片铝合金 · 标志性的“翼”形顶边</h4>` +
    P(`前后两片铝合金对扣，中间是拉丝黑色铝条，顶边向外翻出像翅膀。单片最厚处<b>不到 2 mm</b>。`) +
    P(`它靠导热垫贴住内存颗粒，把几颗芯片的热摊到整块铝片上再散到空气里。DDR5 单条功耗只有几瓦，主要是给超频留余量。`) +
    P(`G.SKILL 所有 Trident Z5 系列用同一套模具，高度一样（官方 44 mm）。`),
  bar: `<h3>RGB 灯条</h3><h4>扩散导光条 + LED + 灯控芯片</h4>` +
    P(`顶部那条半透明塑料是<b>扩散条</b>，夹在两片马甲之间。光源是 PCB 顶边的一排 RGB LED，TechPowerUp 拆解发现<b>正反面各有一半</b>，所以光带更均匀。`) +
    P(`LED 数量这里画的是每面 8 颗 ${EST}。灯效由板上的灯控芯片（丝印 6K5850UA0）驱动，可以用 G.SKILL Trident Z Lighting Control，或主板的 Aura Sync、Mystic Light、RGB Fusion 等软件调。`),
  pad: `<h3>导热垫</h3><h4>约 0.5 mm · 带胶 · 只盖住 DRAM</h4>` +
    P(`导热垫把 8 颗 DRAM 和铝马甲之间的空隙填满，热阻比空气小得多。igor'sLAB 量到约 <b>0.5 mm</b> 厚，新批次里还夹了一层纤维。`) +
    P(`有个争议点：拆解的几款 Trident Z5 RGB 里，<b>PMIC 没有贴导热垫</b>，热量只能经 PCB 和颗粒间接散掉；评测测下来温度依然正常。部分 Neo 批次则把 PMIC 也盖上了。`),
  pcb: `<h3>PCB · 288 针 UDIMM</h3><h4>133.35 × 31.25 mm · 10 层板</h4>` +
    P(`igor'sLAB 用砂纸磨开确认是 <b>10 层</b>板（台湾 Hsien Jinn 生产，板号 5GS1001D），比常见的 8 层板走线更从容，有利于跑高频。`) +
    P(`两面各 144 个金手指，间距 <b>0.85 mm</b>，和 DDR4 一样是 288 针，但针脚定义完全不同。板厚这里按 1.27 mm 画 ${EST}。`) +
    P(`单面单 Rank：所有芯片都在正面，背面只有 LED 和少量元件。`),
  notch: `<h3>防呆缺口</h3><h4>DDR4 和 DDR5 插不错的原因</h4>` +
    P(`DDR5 缺口中心距左端 <b>${PIN.notchX.toFixed(2)} mm</b>，在第 75、76 针之间；DDR4 在 <b>${DDR4_NOTCH_X.toFixed(2)} mm</b>，第 77、78 针之间。差了 <b>${(DDR4_NOTCH_X - PIN.notchX).toFixed(2)} mm</b>。`) +
    P(`两代都是 288 针、长度一样，但 DDR5 主板给内存的是 5 V，内存自己再降压；插错了可能烧东西，所以缺口位置故意错开。`) +
    P(`边缘中间的触点比两端略低一点（阶梯边），插槽弹片会依次接触，插拔更省力。`),
  dram: `<h3>DRAM 颗粒 · 8 × 16 Gb</h3><h4>SK hynix · x8 · 单 Rank</h4>` +
    P(`评测拆出的是 SK hynix <b>H5CG48MEBD（M-die）</b>或 <b>H5CG48AGBD（A-die）</b>，每颗 16 Gb = 2 GB，8 颗正好 16 GB。批次不同颗粒可能不同。`) +
    P(`DDR5 把一条 64 bit 总线拆成<b>两个独立的 32 bit 子通道</b>：左 4 颗是 A，右 4 颗是 B，各自收命令、各自传数据（看右上角）。每次突发 <b>BL16</b> = 16 拍 × 32 bit = 64 字节，正好一条 CPU 缓存行。`) +
    P(`每颗有 32 个 bank，分成 8 个 bank group。颗粒内部有<b>片上 ECC</b>：每 128 bit 数据配 8 bit 校验，能纠正单比特错误——它保护的是芯片内部，不等于服务器的 ECC 内存。`),
  pmic: `<h3>PMIC 电源管理芯片</h3><h4>DDR5 把稳压从主板搬到了内存条上</h4>` +
    P(`DDR4 的电压由主板直接给；DDR5 主板只送 <b>5 V（VIN_BULK）</b>，由条子上的 PMIC 自己降压，供电离颗粒更近、更干净。`) +
    P(`芝奇用 Richtek 的 PMIC（同系列 RTQ5132 是 3 × 4 mm 封装）：三路降压 <b>SWA / SWB</b> 给 VDD / VDDQ（JEDEC 1.1 V，XMP 1.35 V），<b>SWC</b> 给 VPP 1.8 V，另有 1.8 V、1.0 V 两路 LDO 给 SPD Hub 等。`) +
    P(`这是可调压的 <b>OC PMIC</b>，能给到 1.435 V 以上，所以才能超频。橙色亮点就是电流的走向。`),
  spd: `<h3>SPD Hub · SPD5118</h3><h4>内存的“身份证” + 温度计 + 总线枢纽</h4>` +
    P(`里面是 <b>1024 字节</b> EEPROM（16 块 × 64 字节），存着厂商、颗粒、JEDEC 默认参数，以及 <b>XMP 3.0</b> 超频档。主板开机先读它，才知道该怎么跑。`) +
    P(`内置<b>温度传感器</b>，精度 ±0.5 °C，读数就是右边的温度（这里的温度变化是示意模型 ${EST}）。`) +
    P(`它用 I3C（最高 12.5 MHz）或 I²C 和主板通信，还把条子上的 PMIC 等设备隔在自己身后，所以叫 Hub。评测读出厂商是 Renesas。`),
  profile: `<h3>XMP 6000 vs JEDEC 4800</h3><h4>同一套硬件，SPD 里存了两套参数</h4>` +
    P(`<b>XMP 6000</b>：tCK ${(2000 / x.mts).toFixed(3)} ns，CL${x.cl} = <b>${ns(x, x.cl).toFixed(1)} ns</b>，带宽 ${bandwidth(x).toFixed(1)} GB/s，VDD ${x.vdd} V。`) +
    P(`<b>JEDEC 4800</b>：tCK ${(2000 / j.mts).toFixed(3)} ns，CL${j.cl} ≈ <b>${ns(j, j.cl).toFixed(1)} ns</b>，带宽 ${bandwidth(j).toFixed(1)} GB/s，VDD ${j.vdd} V。默认档的具体时序（40-40-40-77）按评测读数和 JEDEC 4800B 档推断 ${EST}。`) +
    P(`周期数看着差不多，但频率高了，每个周期更短，所以真实延迟反而更低。开 XMP 本质上是一种超频，要在 BIOS 里手动打开。`),
  section: `<h3>剖面：热量怎么走</h3><h4>切开第 3 颗颗粒那一列</h4>` +
    P(`从外往里：<b>铝马甲（< 2 mm）→ 导热垫（≈ 0.5 mm）→ DRAM 颗粒 → PCB</b>，背面那片马甲只贴着 PCB 背面。`) +
    P(`颗粒的热经导热垫传给前片，铝片面积大，散热靠它；PCB 的铜层也会把一部分热带走。顶上是灯条，夹在两片马甲之间。`) +
    P(`颗粒尺寸、整条厚度等是按照片估的 ${EST}。`),
};

// the tour: each step clicks a button (key) and sets the state; the state at tour time t folds every step ≤ t
export const SCRIPT = [
  {t: 0, set: {view: 'hero', iso: 'all', e: 0, cut: 'solid', profile: 'xmp', info: 'intro'}},
  {t: 6, key: 'open', set: {e: 1, info: 'explode'}},
  {t: 12, key: 'spreader', set: {iso: 'spreader', info: 'spreader'}},
  {t: 18.5, key: 'bar', set: {iso: 'bar', info: 'bar'}},
  {t: 25, key: 'pad', set: {iso: 'pad', info: 'pad'}},
  {t: 31, key: 'pcb', set: {iso: 'pcb', info: 'pcb'}},
  {t: 36.5, key: 'fingers', set: {view: 'fingers', info: 'notch'}},
  {t: 43, key: 'dram', set: {iso: 'dram', info: 'dram'}},
  {t: 51, key: 'pmic', set: {iso: 'pmic', info: 'pmic'}},
  {t: 58, key: 'spd', set: {iso: 'spd', info: 'spd'}},
  {t: 64.5, key: 'jedec', set: {iso: 'dram', profile: 'jedec', info: 'profile'}},
  {t: 70, key: 'xmp', set: {profile: 'xmp'}},
  {t: 75, key: 'close', set: {e: 0, iso: 'all', view: 'hero', info: 'intro'}},
  {t: 80, key: 'section', set: {cut: 'section', view: 'section', info: 'section'}},
  {t: 87, key: 'solid', set: {cut: 'solid', view: 'hero', info: 'intro'}},
  {t: 91, key: 'board', set: {mode: 'install', view: 'board', kStart: 1e9, info: 'installBoard'}},
  {t: 98, key: 'install', set: {view: 'install', kStart: 98, info: 'install'}},
  {t: 117, key: 'why', set: {view: 'boardtop', info: 'installWhy'}},
  {t: 128, key: 'exit', set: {mode: 'teardown', view: 'hero', info: 'intro'}},
];
export const DURATION = 132;
export const K_DUR = 17; // seconds for the whole installation sequence

export function tourState(t) {
  const s = {mode: 'teardown', kStart: 0};
  let at = 0;
  for (const st of SCRIPT) {
    if (st.t > t) break;
    Object.assign(s, st.set);
    if (st.set.iso && !st.set.view) s.view = ISO[st.set.iso].view || 'hero';
    if (st.set.view || st.set.iso) at = st.t;
  }
  s.viewAt = at;
  s.k = s.mode === 'install' ? Math.min(1, Math.max(0, (t - s.kStart) / K_DUR)) : 0;
  return s;
}

export function tourCursor(t, spots) {
  const keyed = SCRIPT.filter((s) => s.key);
  let prev = [800, 470];
  for (const s of keyed) {
    const to = spots[s.key];
    if (t < s.t - 1.1) return {x: prev[0], y: prev[1], press: false, ring: 0, ringX: 0, ringY: 0};
    if (t < s.t + 0.6) {
      const k = sm((t - (s.t - 1.1)) / 0.95);
      const x = prev[0] + (to[0] - prev[0]) * k;
      const y = prev[1] + (to[1] - prev[1]) * k - Math.sin(Math.PI * k) * 30;
      const rk = t >= s.t ? Math.max(0, 1 - (t - s.t) / 0.55) : 0;
      return {x, y, press: t > s.t - 0.15 && t < s.t + 0.12, ring: rk, ringX: to[0], ringY: to[1]};
    }
    prev = to;
  }
  return {x: prev[0], y: prev[1], press: false, ring: 0, ringX: 0, ringY: 0};
}
