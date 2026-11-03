# Record mode: third-party code and assets

Everything on screen is HTML/CSS/WebGL rendered frame by frame in headless Chromium (sims/record.mjs); ffmpeg only
encodes the frames and muxes the score.

| What | Used for | License |
|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | the 3D module and board | MIT |
| [gl-transitions](https://github.com/gl-transitions/gl-transitions) — `CrossZoom` (rectalogic), `LinearBlur` (gre) | scene transitions, composited from two render targets | MIT |
| [GSAP](https://github.com/greensock/GSAP) 3.15 + SplitText | hook card, subtitles, chapter tags, end card (paused timeline, seeked per frame) | [GSAP Standard "no charge" License](https://gsap.com/standard-license) (free incl. commercial use; not OSI open source) |
| [Apache ECharts](https://github.com/apache/echarts) 6 | bandwidth and latency bar charts (animation off, values driven by t) | Apache-2.0 |
| teardown sfx (`sfx/`, from [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion)) | the score: procedural e-piano bed, clicks, air | MIT |
| Inter, JetBrains Mono (bundled), Noto Sans CJK SC (system) | type | SIL OFL 1.1 |

No Lottie files, stock footage, photos or recorded music are used.
