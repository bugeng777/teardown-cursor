# teardown-cursor

**Cursor Agent Skill 移植版 / A Cursor Agent Skill port of [elvarofficial/teardown](https://github.com/elvarofficial/teardown)**

> 本项目是 [elvarofficial/teardown](https://github.com/elvarofficial/teardown)（MIT 协议）的 Cursor 移植版，保留了原项目的全部代码、示例、提交历史和版权声明。原项目基于 [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion)（MIT）。
>
> This repository is a port of [elvarofficial/teardown](https://github.com/elvarofficial/teardown) (MIT) for Cursor. All original code, examples, commit history and copyright notices are kept. The original is built on [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion) (MIT).

---

## 中文说明

把任何机器做成一个可以拆开看的 3D 模拟器。你问"这东西怎么工作"，Cursor 的 Agent 会生成一个离线可打开的 HTML 页面：机器在中间运转，四周的仪表盘读的是真实参数，按钮能把正在工作的部件剖开，没人操作时页面会自己巡游演示；同一套代码还能逐帧录成 60 fps 视频，并配上同步的程序化音效。

### 在 Cursor 中安装

方式一（推荐，使用 [skills CLI](https://www.npmjs.com/package/skills)，装到全局 `~/.agents/skills/teardown`，Cursor 会自动加载）：

```
npx skills add bugeng777/teardown-cursor -g -a cursor
```

方式二（手动克隆到 Cursor 的全局技能目录，文件夹名必须是 `teardown`，与 SKILL.md 中的 `name` 一致）：

```
git clone https://github.com/bugeng777/teardown-cursor ~/.cursor/skills/teardown
```

只想在某个项目里用：克隆到该项目的 `.cursor/skills/teardown`。

然后在安装目录里执行一次：

```
npm install && npx playwright install chromium
```

需要 Node.js 20+；导出视频需要 `ffmpeg`，音效需要 Python 3。

### 使用

在 Cursor Agent 对话里直接说，Agent 会自动选用该技能；也可以输入 `/teardown` 手动调用：

> 给我做一个可以拆开的四冲程摩托车发动机模拟器。

> 机械表是怎么走时的？做成模拟器给我看。

### 录制模式（做短视频用）

`trident-z5-ddr5.html?record=1&ratio=9x16&subs=zh-en`（竖屏、中英双字幕）或 `?record=1&ratio=16x9&subs=en`（横屏、英文字幕）。
这个模式会隐藏所有按钮和面板，按固定脚本运镜，字幕放在平台安全区内，开头 10 秒先给出钩子问题和答案。
画面全部是 HTML / CSS / WebGL 生成：转场用 gl-transitions，文字动画用 GSAP，图表用 ECharts。可以逐帧导出：

```
node sims/build.mjs trident-z5-ddr5 trident-z5-ddr5-record
node sims/record.mjs trident-z5-ddr5-record --ratio 9x16 --subs zh-en --out short.mp4 --timeline short.json
python run_sfx.py sims/trident-z5-ddr5-record/score.py --timeline short.json --out short.wav
ffmpeg -i short.mp4 -i short.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest out.mp4
```

脚本在 `sims/trident-z5-ddr5/record-script.js`，第三方许可见 `sims/trident-z5-ddr5-record/CREDITS.md`。

### 相比原项目改了什么

- `README.md`：改为中英双语，安装说明改为 Cursor（`-a cursor` / `~/.cursor/skills/`）。
- `SKILL.md`：补充 Cursor 下 `SKILL_DIR` 的常见位置，在致谢中注明移植来源。技能指令本身未改动。
- `sfx/synth.py`：原项目把 ffmpeg 写死成作者本机的 Windows 路径（`C:\Users\user_\.claude\bin\ffmpeg.exe`），改为读取 `FFMPEG` 环境变量、默认 `ffmpeg`，与 `paths.mjs` 和 SKILL.md 的说明一致。
- `package.json`：包名与描述。
- `LICENSE`：保留原 MIT 全文和原版权行，追加移植修改的版权行。

---

## English

Turns any machine into a 3D simulator you can take apart. Ask how something works and the Cursor agent builds one offline HTML page: the machine runs in the middle, every panel reads the real numbers, a button opens the part doing the work, and when nobody touches it the page tours itself. The same code records a 60 fps film with a synced procedural score.

![Mellis HB-7 robotic bee simulator](docs/bee.gif)

| Telson SC-8 robotic scorpion | Pelagos OC-8 robotic octopus |
|---|---|
| ![Telson SC-8 robotic scorpion](docs/scorpion.gif) | ![Pelagos OC-8 robotic octopus](docs/octopus.gif) |

### Install in Cursor

```
npx skills add bugeng777/teardown-cursor -g -a cursor
```

or clone it straight into Cursor's skill folder (the folder must be named `teardown` to match the skill name):

```
git clone https://github.com/bugeng777/teardown-cursor ~/.cursor/skills/teardown
```

For one project only, clone into `<project>/.cursor/skills/teardown`. Then, once, in the installed folder:

```
npm install && npx playwright install chromium
```

Node.js 20 or newer. `ffmpeg` for video, Python 3 for sound.

### Use

Ask the Cursor agent in plain words (it picks the skill up automatically, or type `/teardown`):

> Build me a simulator of a 4-stroke motorcycle engine I can take apart.

> Make a teardown of a hydraulic excavator arm and record a 20-second video of it.

Or open one of the 3 examples:

```
node sims/build.mjs v8-live          # teardown-out/dist/v8-live.html
node sims/build.mjs cessna-live
node sims/build.mjs strandbeest-live
```

### Record mode (for short videos)

`trident-z5-ddr5.html?record=1&ratio=9x16|16x9&subs=zh-en|en` hides every control and plays a fixed camera script, with
subtitles burned in inside the platform safe areas and a hook question answered in the first 10 s. Every frame is
HTML/CSS/WebGL: gl-transitions for the cuts, GSAP for the type, ECharts for the charts. `render(t)` is pure, so
`node sims/record.mjs trident-z5-ddr5-record --ratio 9x16 --out x.mp4` steps it frame by frame; ffmpeg only encodes.
See `sims/trident-z5-ddr5-record/CREDITS.md`.

### What changed from upstream

- `README.md`: bilingual, Cursor install instructions.
- `SKILL.md`: Cursor locations for `SKILL_DIR`, port credit. The skill's instructions are otherwise unchanged.
- `sfx/synth.py`: ffmpeg was hard-coded to the upstream author's Windows path; it now reads `FFMPEG` (default `ffmpeg`), as `paths.mjs` and SKILL.md already document.
- `package.json`: name and description.
- `LICENSE`: original MIT text and copyright lines kept, one line added for the port.

### What is inside

| | |
|---|---|
| `SKILL.md` | What the agent reads: how a machine is built, the rules that make it look right, the review loop. |
| `sims/kit/` | Runtime, stage, shader warm-up. |
| `sims/v8-*`, `sims/cessna-*`, `sims/strandbeest-*` | 3 complete machines. `-shared` is the machine, `-live` the page you drive, `-film` the recorded tour. |
| `sims/build.mjs` | Bundles a machine into one HTML file, three.js and fonts inlined. |
| `sims/capture.mjs` | Renders the film frame by frame to a 60 fps mp4, or to review sheets of stills. |
| `sfx/`, `run_sfx.py` | Procedural sound on the film's timeline, mastered to −14 LUFS. |

## Credits / 致谢

- Original skill / 原项目: [elvarofficial/teardown](https://github.com/elvarofficial/teardown) (MIT, © 2026 elvarofficial).
- Built on / 基于: [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion) (MIT, © 2026 whaleyxbt): runtime, frame capture, sound engine, review rules.
- Recorded samples are CC0 from Freesound, prepared by [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics) (MIT); sources in `sfx/samples/SOURCES.md`.

MIT licence — see [LICENSE](LICENSE).
