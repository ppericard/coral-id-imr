require('./slot.js').testGuard();
// The measured block of every game photo (tools/photo_measure.py, data/measured.json; Pierre, 2026-11-19, Q434): the
// measures on made-up images whose values are known, the fish's box in the cropped file's frame, and an incremental run
// on a fixture (a stub game file and lossless images in a temporary folder: never R2). Needs python3 with numpy and
// Pillow (tools/requirements.txt, installed by checks.yml); skipped without them.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const py = code =>
  JSON.parse(
    execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 << 20
    })
  );
const ok = (() => {
  try {
    py('import numpy, PIL; print(1)');
    return true;
  } catch {
    return false;
  }
})();

test(
  'the measures on made-up images: contrast, spread, brightness, saturation, warm share, sharpness',
  {skip: !ok && 'no numpy/Pillow'},
  () => {
    const r = py(`import numpy as np, photo_measure as M
grey = np.full((120, 160, 3), 0.5, np.float32)
bw = np.zeros((120, 160, 3), np.float32); bw[:, 80:] = 1
red = np.zeros((120, 160, 3), np.float32); red[..., 0] = 0.9
blue = np.zeros((120, 160, 3), np.float32); blue[..., 2] = 0.9
yellow = np.zeros((120, 160, 3), np.float32); yellow[..., 0] = 0.9; yellow[..., 1] = 0.8
half = blue.copy(); half[:, :40] = red[:, :40]
rng = np.random.default_rng(1)
noise = np.repeat(rng.random((120, 160, 1), dtype=np.float32), 3, axis=2)
soft = noise.copy()
for _ in range(4): soft = (soft + np.roll(soft, 1, 0) + np.roll(soft, 1, 1) + np.roll(soft, -1, 0) + np.roll(soft, -1, 1)) / 5
print(json.dumps({k: M.block(v) for k, v in dict(grey=grey, bw=bw, red=red, blue=blue, yellow=yellow, half=half, noise=noise, soft=soft).items()}))`);
    assert.deepStrictEqual([r.grey.c, r.grey.sp, r.grey.l, r.grey.sa, r.grey.ss, r.grey.sh], [0, 0, 0.5, 0, 0, 0]);
    assert.ok(!('wa' in r.grey), 'no colour to read: no warm share');
    assert.deepStrictEqual([r.bw.c, r.bw.sp, r.bw.l], [0.5, 1, 0.5]);
    assert.deepStrictEqual([r.red.sa, r.red.ss, r.red.wa], [1, 1, 1]);
    assert.strictEqual(r.yellow.wa, 1, 'yellow is warm');
    assert.strictEqual(r.blue.wa, 0, 'blue is not');
    assert.strictEqual(r.half.wa, 0.25, 'a quarter of the saturated pixels are red');
    assert.ok(r.noise.sh > 10 * r.soft.sh, `sharp ${r.noise.sh} against blurred ${r.soft.sh}`);
    assert.ok(r.noise.pk > r.soft.pk, 'the sharpest part, contrast apart, too');
  }
);

test(
  'the fish box is read in the measured file, which is cut by the crop; a turned photo or a cut box has none',
  {skip: !ok && 'no numpy/Pillow'},
  () => {
    const r = py(`import photo_measure as M
print(json.dumps([M.box_in([0.2, 0.2, 0.6, 0.6], {}), M.box_in([0.3, 0.3, 0.5, 0.5], {'cr': [0.2, 0.2, 0.6, 0.6]}),
  M.box_in([0.2, 0.2, 0.6, 0.6], {'ro': 90}), M.box_in([0.1, 0.1, 0.5, 0.5], {'cr': [0.4, 0.4, 1, 1]})]))`);
    assert.deepStrictEqual(r[0], [0.2, 0.2, 0.6, 0.6]);
    r[1].forEach((v, i) => assert.ok(Math.abs(v - [0.25, 0.25, 0.75, 0.75][i]) < 1e-9, JSON.stringify(r[1])));
    assert.strictEqual(r[2], null);
    assert.strictEqual(r[3], null);
  }
);

test(
  'a run measures each game photo once, at 960 px, the box apart, and again when its crop changes',
  {skip: !ok && 'no numpy/Pillow'},
  () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'measure-')),
      img = path.join(tmp, 'img'),
      out = path.join(tmp, 'measured.json');
    fs.mkdirSync(img);
    const game = cr => ({
      v: 1,
      photos: {
        t01: [
          {f: 'fish-s001-cand-1', src: 'x', sp: 's001', jt: 'p1g0sl15', e: 5, bb: [0.25, 0.25, 0.75, 0.75], ...(cr ? {cr} : {})},
          {f: 'fish-s001-cand-2', src: 'x', sp: 's001', jt: 'p1d2mm13', e: 3},
          {f: 'fish-s001-cand-3', src: 'x', sp: 's001', r: 1}
        ]
      }
    });
    fs.writeFileSync(path.join(tmp, 'fish-game.json'), JSON.stringify(game()));
    try {
      // a grey frame with a red square where the box is; the second photo is small (480 px) and blue
      py(`import numpy as np
from PIL import Image
a = np.full((600, 800, 3), 128, np.uint8); a[150:450, 200:600] = (220, 30, 30)
Image.fromarray(a).save(${JSON.stringify(path.join(img, 'fish-s001-cand-1-m.webp'))}, lossless=True)
b = np.zeros((360, 480, 3), np.uint8); b[..., 2] = 200
Image.fromarray(b).save(${JSON.stringify(path.join(img, 'fish-s001-cand-2-m.webp'))}, lossless=True)
print(1)`);
      const run = (...more) =>
        execFileSync('python3', ['tools/photo_measure.py', '--root', tmp, '--dir', img, '--out', out, '--subject', 'fish', ...more], {
          cwd: ROOT,
          encoding: 'utf8'
        });
      assert.match(run('--minutes', '0'), /budget, 2 left/, 'a spent time budget measures nothing more');
      assert.ok(!fs.existsSync(out));
      assert.match(run(), /2 game photos, 2 to measure/, 'a photo not downloaded yet (r) waits');
      let M = JSON.parse(fs.readFileSync(path.join(out), 'utf8'));
      assert.strictEqual(M.mv, 1);
      const a = M.ms['fish-s001-cand-1'],
        b = M.ms['fish-s001-cand-2'];
      assert.strictEqual(a.px, 800);
      assert.strictEqual(b.px, 480, 'the file long side, measured resampled to 960');
      assert.strictEqual(a.b.wa, 1, 'the box holds the red fish only');
      assert.ok(a.b.c < 0.02 && a.c > 0.05, 'the box is flat, the whole frame is not');
      assert.ok(a.wa === 1 && b.wa === 0);
      assert.ok(a.h && !b.h, 'a tag only where a crop or a box decides the pixels');
      assert.match(run(), /0 to measure/, 'measured once');
      fs.writeFileSync(path.join(tmp, 'fish-game.json'), JSON.stringify(game([0, 0, 1, 1])));
      assert.match(run(), /1 to measure/, 'a new crop: measured again');
      M = JSON.parse(fs.readFileSync(path.join(out), 'utf8'));
      assert.deepStrictEqual(Object.keys(M.ms).sort(), ['fish-s001-cand-1', 'fish-s001-cand-2']);
      const text = fs.readFileSync(out, 'utf8');
      assert.strictEqual(text.trim().split('\n').length, 4, 'one photo per line');
    } finally {
      fs.rmSync(tmp, {recursive: true, force: true});
    }
  }
);
