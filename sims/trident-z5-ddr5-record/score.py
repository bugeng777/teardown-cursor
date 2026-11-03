"""Score for the record-mode films: a quiet e-piano bed (Am9 / Fmaj7 / Cmaj7 / G6, 88 bpm) under the subtitles, a soft
air on every scene transition, a chime when the hook's answer lands, a pop for each label, the latch click when each
module bottoms out, and a riser into the end card. Every time comes from the timeline record.mjs writes.

    python run_sfx.py sims/trident-z5-ddr5-record/score.py --timeline <x-timeline.json> --out <x.wav>
"""

from sfx.score_kit import airy, bed, chords, hz
from sfx.synth import chime, click, pop

TARGET_LUFS = -18.0  # under narration-level subtitles: music stays in the back
SEED = 7
CHORDS = chords("Am9:A2 E3 G3 B3 C4/A1", "Fmaj7:F2 C3 E3 A3/F1", "Cmaj7:C3 E3 G3 B3/C2", "G6:G2 D3 E3 B3/G1")


def score(mix, tl):
    dur = tl["duration"]
    left, right, low, drums = bed(dur, 88, CHORDS, (), kicks=(0, 2.5), snares=(), hats=8, swing=0.0, keys_vel=0.6, keys_lp=3200)
    mix.put_stereo(0, left, right, 0.10)
    mix.put(0, low, 0.10)
    mix.put(0, drums, 0.03)
    for t in tl["transitions"]:
        mix.put(max(0, t - 0.35), airy(1.1, 500, 2600, 0.7), 0.05)
    h = tl["hook"]
    mix.put(h[1], chime([hz("A4"), hz("C5"), hz("E5")], 1.8, 0.6), 0.07)
    mix.put(h[2], pop(hz("E5"), hz("A5"), 0.14), 0.035)
    for i, t in enumerate(sorted(set(tl["labels"]))):
        mix.put(t, pop(hz("C5") * (1 + 0.04 * (i % 4)), hz("G5"), 0.12), 0.022)
    for t in tl["charts"]:
        mix.put(t + 0.35, airy(0.9, 900, 3000, 0.5), 0.03)
    for t in tl["clicks"]:
        mix.put(t, click(2200, 0.03), 0.09)
        mix.put(t + 0.035, click(1500, 0.025), 0.05)
    mix.put(tl["end"] + 0.6, chime([hz("C5"), hz("E5"), hz("G5")], 2.2, 0.8), 0.06)
