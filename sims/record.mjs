#!/usr/bin/env node
// Render the record mode of a page frame by frame: steps window.SIM.render(t) in headless Chromium, screenshots every
// frame (canvas + HTML overlay) and pipes the JPEGs to ffmpeg (encode only; every graphic is HTML/CSS/WebGL).
//
//   node sims/record.mjs trident-z5-ddr5-record --ratio 9x16 --subs zh-en [--cut short] --out v.mp4 [--fps 30]
//        [--from 0 --to <duration>] [--stills 3,12,40 --out dir/prefix]  [--timeline out.json]
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {CHROMIUM, DIST, FFMPEG, playwright} from '../paths.mjs';

const {chromium} = playwright();
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : argv[i + 1];
};
const name = argv[0];
const html = name.endsWith('.html') ? path.resolve(name) : path.join(DIST, `${name}.html`);
const ratio = opt('ratio', '16x9');
const params = new URLSearchParams({record: '1', ratio, subs: opt('subs', ratio === '9x16' ? 'zh-en' : 'en'), capture: '1'});
if (opt('cut')) params.set('cut', opt('cut'));
if (opt('tune')) params.set('tune', opt('tune'));
const [W, H] = ratio === '9x16' ? [1080, 1920] : [1920, 1080];
const browser = await chromium.launch({
  executablePath: CHROMIUM || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const page = await browser.newPage({viewport: {width: W, height: H}, deviceScaleFactor: 1});
page.on('pageerror', (e) => console.error('[page error]', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
await page.addInitScript(() => (window.__CAPTURE = true));
await page.goto(pathToFileURL(html).href + '?' + params);
await page.waitForFunction(() => window.SIM && window.SIM.ready, null, {timeout: 180000});
const info = await page.evaluate(() => ({duration: window.SIM.duration, timeline: window.SIM.timeline, meta: window.SIM.meta}));
console.log(JSON.stringify(info.meta));
if (opt('timeline')) fs.writeFileSync(opt('timeline'), JSON.stringify(info.timeline, null, 1));
const draw = (t) => page.evaluate((x) => window.SIM.render(x), t);

const stills = opt('stills');
const out = path.resolve(opt('out', 'record.mp4'));
fs.mkdirSync(path.dirname(out), {recursive: true});
if (stills) {
  for (const t of stills.split(',').map(Number)) {
    await draw(t);
    const f = `${out}-${t.toFixed(1)}.png`;
    await page.screenshot({path: f});
    console.log(f);
  }
  await browser.close();
  process.exit(0);
}
const fps = Number(opt('fps', 30));
const from = Number(opt('from', 0));
const to = Number(opt('to', info.duration));
const frames = Math.round((to - from) * fps);
const ff = spawn(FFMPEG, ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', String(opt('crf', 18)), '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out],
  {stdio: ['pipe', 'inherit', 'inherit']});
const t0 = Date.now();
for (let i = 0; i < frames; i++) {
  // a stalled screenshot (the VM paused, a GC storm) gets the frame redrawn and retried instead of killing the run
  let buf;
  for (let a = 0; ; a++) {
    try {
      await draw(from + i / fps);
      buf = await page.screenshot({type: 'jpeg', quality: 94, timeout: 120000});
      break;
    } catch (e) {
      if (a >= 3) throw e;
      console.error(`frame ${i}: ${e.message.split('\n')[0]}, retrying`);
    }
  }
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % fps === 0) console.log(`${i}/${frames} frames ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`→ ${out} ${frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
