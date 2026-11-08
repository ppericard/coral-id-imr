// Photo rotation (Pierre, 2026-11-08): curation.json rot {f: 90 | 180 | 270} (fish.rot for the fish), degrees clockwise,
// set in the admin's crop editor, through the draft and Publish (rule A1), applied to the files by the photo workflow
// after the crop (tools/photos.py turn). The curation key (autosort.js rotNorm, rotStep, rotSet), its merge (core.js
// merge3), the composed transform (autosort.js photoAt, turnedSize: the crop cut from the original, then turned) against
// the workflow's own on a fixture image, and the editor's and previews' geometry (rotDelta, rotScale, rotCover).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');
const {ROTS, rotNorm, rotStep, rotSet, photoAt, turnedSize, rotDelta, rotScale, rotCover} = require('../autosort.js');
const {merge3} = require('../core.js');
const ROOT = path.join(__dirname, '..');
const py = code => execFileSync('python3', ['-c', `import sys, json; sys.path.insert(0, 'tools')\n${code}`], {cwd: ROOT, encoding: 'utf8'});
const pil = (() => {
  try {
    py('import PIL');
    return true;
  } catch {
    return false;
  }
})();

test('the curation key: 90, 180 or 270 degrees clockwise, none left out', () => {
  assert.deepStrictEqual(ROTS, [90, 180, 270]);
  assert.deepStrictEqual(
    [0, 90, 180, 270, 360, 450, -90, '90', 45, null, undefined, 'x', true].map(rotNorm),
    [0, 90, 180, 270, 0, 90, 270, 90, 0, 0, 0, 0, 0]
  );
  // Left and right in quarter turns, round the clock.
  assert.deepStrictEqual([rotStep(0, 90), rotStep(90, 90), rotStep(270, 90), rotStep(0, -90), rotStep(90, -90)], [90, 180, 0, 270, 0]);
  // Set and reset: a new map each time, a photo back upright leaves it (no 0 in the published file).
  const M = {a: 90};
  assert.deepStrictEqual(rotSet(M, 'b', 180), {a: 90, b: 180});
  assert.deepStrictEqual(rotSet(M, 'a', 0), {});
  assert.deepStrictEqual(rotSet(M, 'a', 360), {});
  assert.deepStrictEqual(rotSet(undefined, 'a', -90), {a: 270});
  assert.deepStrictEqual(M, {a: 90}, 'never in place');
});

test('merge: a rotation goes through the draft and Publish like a crop (merge3)', () => {
  // Pierre turned a and b in this tab; another publish turned c and reset d meanwhile: both kept.
  const base = {v: 1, genera: {}, rot: {d: 90}, crop: {a: [0, 0, 0.5, 1]}},
    mine = {v: 1, genera: {}, rot: {a: 90, b: 270, d: 90}, crop: {a: [0, 0, 0.5, 1]}},
    theirs = {v: 1, genera: {}, rot: {c: 180}, crop: {a: [0, 0, 0.5, 1]}},
    conf = [];
  assert.deepStrictEqual(merge3(base, mine, theirs, conf).rot, {a: 90, b: 270, c: 180});
  assert.deepStrictEqual(conf, []);
  // His reset of the last turned photo leaves an empty map (admin.js cropEditor, as a reset crop leaves DRAFT.crop {}):
  // merged key by key, the photo another device turned meanwhile is kept (review #793); the crop is untouched.
  const B = {genera: {}, rot: {a: 90}, crop: {a: [0, 0, 0.5, 1]}},
    T = {genera: {}, rot: {a: 90, c: 180}, crop: {a: [0, 0, 0.5, 1]}},
    out = merge3(B, {genera: {}, rot: {}, crop: {a: [0, 0, 0.5, 1]}}, T);
  assert.deepStrictEqual(out.rot, {c: 180});
  assert.deepStrictEqual(out.crop, {a: [0, 0, 0.5, 1]});
  assert.deepStrictEqual(merge3(B, {genera: {}, rot: {}}, {genera: {}, rot: {a: 90}}).rot || {}, {}, 'nothing left');
  // With the key taken out instead, the other device's turn of c would be lost: why the admin keeps the map.
  assert.ok(!('rot' in merge3(B, {genera: {}, crop: {a: [0, 0, 0.5, 1]}}, T)));
  // The same photo turned two ways: his draft wins, and the conflict is reported (the Publish toast).
  const c2 = [];
  assert.deepStrictEqual(merge3({genera: {}}, {genera: {}, rot: {a: 90}}, {genera: {}, rot: {a: 270}}, c2).rot, {a: 90});
  assert.deepStrictEqual(c2, [['rot', 'a']]);
  // The fish key under fish, the same way.
  assert.deepStrictEqual(merge3({fish: {}}, {fish: {rot: {f1: 90}}}, {fish: {crop: {f2: [0, 0, 1, 0.5]}}}).fish, {
    rot: {f1: 90},
    crop: {f2: [0, 0, 1, 0.5]}
  });
});

test('the composed transform: the crop cut from the original, then turned clockwise', () => {
  const c = [0.25, 0, 0.75, 0.5];
  // Upright: the crop alone.
  assert.deepStrictEqual(photoAt(0.25, 0, c, 0), [0, 0]);
  assert.deepStrictEqual(photoAt(0.75, 0.5, c, 0), [1, 1]);
  assert.strictEqual(photoAt(0.1, 0.1, c, 90), null, 'cut off by the crop');
  // A quarter right: the crop's top-left corner goes to the top-right, its top-right to the bottom-right.
  assert.deepStrictEqual(photoAt(0.25, 0, c, 90), [1, 0]);
  assert.deepStrictEqual(photoAt(0.75, 0, c, 90), [1, 1]);
  assert.deepStrictEqual(photoAt(0.25, 0, c, 180), [1, 1]);
  assert.deepStrictEqual(photoAt(0.25, 0, c, 270), [0, 1]);
  // Four quarters are none; a left turn is three right ones.
  assert.deepStrictEqual(photoAt(0.4, 0.2, c, 360), photoAt(0.4, 0.2, c, 0));
  assert.deepStrictEqual(photoAt(0.4, 0.2, c, -90), photoAt(0.4, 0.2, c, 270));
  // No crop: the whole photo turned.
  assert.deepStrictEqual(photoAt(0, 0, null, 90), [1, 0]);
  // Sizes: 400 x 300 cut to its left half is 200 x 300, a quarter turn makes it 300 x 200.
  assert.deepStrictEqual(turnedSize(400, 300, [0, 0, 0.5, 1], 0), [200, 300]);
  assert.deepStrictEqual(turnedSize(400, 300, [0, 0, 0.5, 1], 90), [300, 200]);
  assert.deepStrictEqual(turnedSize(400, 300, null, 180), [400, 300]);
  assert.deepStrictEqual(turnedSize(400, 300, null, 270), [300, 400]);
});

test('the crop editor and the previews: a drag in the turned photo, a turned preview kept in its box', () => {
  // A CSS rotate(90deg) sends the photo's own x axis down the screen: a drag down moves the frame along x.
  assert.deepStrictEqual(rotDelta(0, 10, 90), [10, -0]);
  assert.deepStrictEqual(rotDelta(10, 0, 90), [0, -10]);
  assert.deepStrictEqual(rotDelta(10, 5, 180), [-10, -5]);
  assert.deepStrictEqual(rotDelta(0, 10, 270), [-10, 0]);
  assert.deepStrictEqual(rotDelta(3, 4, 0), [3, 4]);
  // Turned back, the drag is the one on screen (rotDelta inverts the CSS rotation).
  const turn = ([x, y], r) => ({90: [-y, x], 180: [-x, -y], 270: [y, -x]})[r] || [x, y];
  ROTS.forEach(r =>
    assert.deepStrictEqual(
      turn(rotDelta(7, -2, r), r).map(v => v + 0),
      [7, -2],
      `rot ${r}`
    )
  );
  // A whole photo (contain: the lightbox, the swiper). Upright or half a turn: no scale.
  assert.strictEqual(rotScale(400, 300, 180, 4 / 3), 1);
  // A whole 4:3 photo in a 4:3 box (the lightbox) turned a quarter: 3/4 of its size, whole inside.
  assert.strictEqual(rotScale(400, 300, 90, 4 / 3), 0.75);
  // A 4:3 photo fitted in a tall box (the phone's swiper, 300 x 600): 400 wide once turned would not fit; it fills the width.
  const k = rotScale(300, 600, 270, 4 / 3);
  assert.ok(Math.abs(k * 225 - 300) < 1e-9, String(k));
  assert.strictEqual(rotScale(0, 0, 90, 1), 1, 'no box yet');
  // A tile's photo (cover) turned a quarter shows exactly the part of the photo the turned file will show in that tile
  // (Codex review #793: a portrait photo turned in a landscape tile was cut twice). The cover cut of an image of aspect
  // a in a box of aspect b, as fractions of the image kept along its width and height:
  const cut = (a, b) => (a > b ? [b / a, 1] : [1, a / b]);
  assert.strictEqual(rotCover(400, 300, 180), null);
  assert.strictEqual(rotCover(400, 300, 0), null);
  assert.deepStrictEqual(rotCover(400, 300, 90), {w: 300, h: 400, mv: -50, mh: 50}, 'the box swapped, the tile kept 400 x 300');
  for (const [bw, bh] of [
    [400, 300],
    [300, 300],
    [300, 400]
  ])
    for (const ia of [0.75, 1, 4 / 3, 1.5, 0.5])
      [90, 270].forEach(r => {
        const v = rotCover(bw, bh, r),
          shown = cut(ia, v.w / v.h), // the preview: the original cut to cover the swapped box, then turned
          [gx, gy] = cut(1 / ia, bw / bh); // the turned file cut to cover the tile; its x is the original's y
        assert.ok(Math.abs(v.w + 2 * v.mh - bw) < 1e-9 && Math.abs(v.h + 2 * v.mv - bh) < 1e-9, 'the tile keeps its size');
        assert.ok(
          Math.abs(shown[0] - gy) < 1e-9 && Math.abs(shown[1] - gx) < 1e-9,
          `${bw}x${bh} ia ${ia} rot ${r}: ${shown} vs ${[gy, gx]}`
        );
      });
});

test('tools/photos.py turn: the workflow cuts and turns a fixture image as photoAt maps it', {skip: !pil && 'Pillow missing'}, () => {
  // A 400 x 300 fixture, grey with four coloured corners (40 px squares). For each crop and rotation, the file's size is
  // turnedSize's, and each corner's colour is found in the file where photoAt says that corner lands.
  const C = {tl: [255, 0, 0], tr: [0, 255, 0], bl: [0, 0, 255], br: [255, 255, 0]},
    mid = {tl: [20 / 400, 20 / 300], tr: [380 / 400, 20 / 300], bl: [20 / 400, 280 / 300], br: [380 / 400, 280 / 300]},
    cases = [
      [null, 0],
      [null, 90],
      [null, 180],
      [null, 270],
      [[0, 0, 1, 1], 90],
      [[0, 0, 0.5, 1], 90],
      [[0, 0, 0.5, 1], 270],
      [[0.5, 0.5, 1, 1], 180]
    ],
    ask = cases.map(([c, r]) => ({c, r, pts: Object.fromEntries(Object.entries(mid).map(([k, [x, y]]) => [k, photoAt(x, y, c, r)]))}));
  const got = JSON.parse(
    py(`import photos
from PIL import Image, ImageDraw
im = Image.new('RGB', (400, 300), (128, 128, 128)); d = ImageDraw.Draw(im)
for (x, y), col in zip(((0, 0), (360, 0), (0, 260), (360, 260)), ${JSON.stringify(Object.values(C))}):
    d.rectangle((x, y, x + 39, y + 39), fill=tuple(col))
res = []
for a in json.loads(${JSON.stringify(JSON.stringify(ask))}):
    t = photos.turn(im, a['c'], a['r'])
    px = lambda u, v: list(t.getpixel((min(t.size[0] - 1, int(u * t.size[0])), min(t.size[1] - 1, int(v * t.size[1])))))
    res.append({'size': list(t.size), 'px': {k: px(*p) if p else None for k, p in a['pts'].items()}})
print(json.dumps(res))`)
  );
  ask.forEach((a, i) => {
    const w = `crop ${JSON.stringify(a.c)}, rot ${a.r}`;
    assert.deepStrictEqual(got[i].size, turnedSize(400, 300, a.c, a.r), w);
    Object.entries(a.pts).forEach(([k, p]) => p && assert.deepStrictEqual(got[i].px[k], C[k], `${w}: ${k}`));
  });
  // The crop of the left half keeps two corners, the bottom-right quarter one.
  assert.strictEqual(Object.values(ask[5].pts).filter(Boolean).length, 2);
  assert.strictEqual(Object.values(ask[7].pts).filter(Boolean).length, 1);
});

test(
  'tools/photos.py: a photo is made again when its crop or rotation changes, and records what it was made with',
  {skip: !pil && 'Pillow missing'},
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotate-'));
    const out = JSON.parse(
      py(`import photos, os
from PIL import Image
p = {'f': 'x', 'src': 'https://x/photos/1/original.jpg'}
r = {'rot_of': [photos.rot_of(v) for v in (None, 0, 90, '180', 270, 360, -90, 45, 'x')],
     'fresh': photos.stale(p), 'turned': photos.stale(p, None, 90), 'cropped': photos.stale(p, [0, 0, 0.5, 1])}
photos.mark(p, [0, 0, 0.5, 1], 90)
r['marked'] = dict(p)
r['same'] = photos.stale(p, [0, 0, 0.5, 1], 90)
r['reset'] = photos.stale(p, [0, 0, 0.5, 1], 0)
photos.mark(p, None, 0)
r['clean'] = dict(p)
# The four sizes of a 400 x 300 original cut to its left half and turned a quarter: 3:2, the 1600 px file 300 x 200 (never upscaled).
r['ar'] = photos.write(Image.new('RGB', (400, 300), (10, 20, 30)), 'x', ${JSON.stringify(dir)}, [0, 0, 0.5, 1], 90)
r['files'] = sorted(os.listdir(${JSON.stringify(dir)}))
r['big'] = list(Image.open(os.path.join(${JSON.stringify(dir)}, 'x.webp')).size)
print(json.dumps(r))`)
    );
    assert.deepStrictEqual(out.rot_of, [0, 0, 90, 180, 270, 0, 270, 0, 0]);
    assert.deepStrictEqual([out.fresh, out.turned, out.cropped], [false, true, true], 'an untouched photo is never made again');
    assert.deepStrictEqual(out.marked, {f: 'x', src: 'https://x/photos/1/original.jpg', cr: [0, 0, 0.5, 1], ro: 90});
    assert.deepStrictEqual([out.same, out.reset], [false, true]);
    assert.deepStrictEqual(out.clean, {f: 'x', src: 'https://x/photos/1/original.jpg'});
    assert.strictEqual(out.ar, 1.5);
    assert.deepStrictEqual(out.files, ['x-m.webp', 'x-s.webp', 'x-t.webp', 'x.webp']);
    assert.deepStrictEqual(out.big, [300, 200]);
    fs.rmSync(dir, {recursive: true, force: true});
  }
);

// The admin's previews (admin.js crSrc, admin-fish.js fishSrc) and its R2 fallback, run in a vm on a stub page.
const vm = require('vm'),
  block = require('./block.js'),
  CORE = require('../core.js');
const adminVm = (extra = '') => {
  const A = fs.readFileSync(path.join(ROOT, 'admin.js'), 'utf8'),
    AF = fs.readFileSync(path.join(ROOT, 'admin-fish.js'), 'utf8'),
    H = {},
    ctx = vm.createContext({...CORE, rotNorm, document: {addEventListener: (t, fn) => (H[t] = fn)}, navigator: {}});
  vm.runInContext(
    'let R2 = true, AWAY = false, DRAFT = {fish: {}}, SAVED = {}, IDX = photoIndex();\n' +
      'const photoIdx = () => IDX, photoLook = f => IDX.f.get(f), photoRetry = () => false;\n' +
      'class HTMLImageElement {}\n' +
      block(A, 'const same = (a, b) => ', '\n', {file: 'admin.js', through: true}) +
      block(A, 'const ver = p => ', '\n', {file: 'admin.js', through: true}) +
      block(A, 'const img = (p, s) =>', '\n// A draft rotation drawn on a preview', {file: 'admin.js'}) +
      block(A, '// Crops (curation.json "crop"', '\nconst qTag = p =>', {file: 'admin.js'}) +
      block(AF, 'const fishRot = f =>', '\n// Where a fish photo comes from', {file: 'admin-fish.js'}) +
      extra +
      '\nthis.T = {HTMLImageElement, fishSrc, crSrc, img, set: o => ({R2, AWAY, DRAFT, IDX} = {R2, AWAY, DRAFT, IDX, ...o}), state: () => ({R2, AWAY})};',
    ctx
  );
  return {...ctx.T, H, ctx};
};

test('the fish Candidates: a photo in play with no judgment shows its published crop (review #793)', () => {
  const T = adminVm(),
    o = 'https://inaturalist-open-data.s3.amazonaws.com/photos/7/original.jpg',
    // A sure candidate fishGameIn put in play from fish-game.json: no j, the pass's crop baked into its R2 file.
    p = {f: 'fish-s016-cand-7', sp: 't01', src: o, cr: [0.1, 0.2, 0.9, 0.8], ar: 1.33},
    vb = 'object-view-box:inset(20% 10% 20% 10%)';
  // Pierre has no crop of his own: its R2 file, as the game shows it (it showed the original uncropped).
  assert.strictEqual(T.fishSrc(p, 1), `src="${T.img(p, 1)}"`);
  assert.match(T.img(p, 1), /r2\.dev\/img\/fish-s016-cand-7-s\.webp\?c=0\.1_0\.2_0\.9_0\.8$/);
  // His own crop wins: the original with his crop drawn.
  T.set({DRAFT: {fish: {crop: {[p.f]: [0, 0, 0.5, 1]}}}});
  assert.strictEqual(T.fishSrc(p, 1), `src="${o.replace('/original.', '/medium.')}" style="object-view-box:inset(0% 50% 0% 0%)"`);
  // His rotation over the published crop: the original with that crop drawn, then turned.
  T.set({DRAFT: {fish: {rot: {[p.f]: 90}}}});
  assert.strictEqual(T.fishSrc(p, 1), `src="${o.replace('/original.', '/medium.')}" style="${vb}" data-rot="90"`);
  // A judged record keeps the pass's crop; a Check (blind) neither.
  T.set({DRAFT: {fish: {}}});
  const c = {f: 'fish-s001-cand-9', r: 1, src: o.replace('/7/', '/9/'), j: {c: [0.1, 0.2, 0.9, 0.8]}};
  assert.strictEqual(T.fishSrc(c, 1), `src="${c.src.replace('/original.', '/medium.')}" style="${vb}"`);
  assert.strictEqual(T.fishSrc(c, 1, true), `src="${c.src.replace('/original.', '/medium.')}"`);
  // R2 failed (AWAY): the original, its published crop drawn.
  T.set({AWAY: true});
  assert.ok(T.fishSrc(p, 1).endsWith(` style="${vb}"`), T.fishSrc(p, 1));
});

test('R2 failed: the published rotation is drawn on the original with its crop (admin.js photoRoOf, its error handler)', () => {
  const {photoIndex, photoCropOf, PHOTO_BASE} = CORE,
    iN = (n, s) => `https://inaturalist-open-data.s3.amazonaws.com/photos/${n}/${s}.jpg`,
    idx = photoIndex({
      p: [
        {f: 'a', src: iN(1, 'original'), cr: [0, 0, 0.5, 1], ro: 90},
        {f: 'b', src: iN(2, 'original'), ro: 270},
        {f: 'c', src: iN(3, 'original'), cr: [0, 0, 0.5, 1]},
        {f: 'd', r: 1, src: iN(4, 'original'), ro: 90},
        {f: 'e', src: iN(5, 'original'), ro: 45}
      ]
    });
  const R = adminVm('\nthis.photoRoOf = photoRoOf;');
  R.set({IDX: idx});
  assert.deepStrictEqual(
    [iN(1, 'large'), iN(2, 'medium') + '#r1', iN(3, 'large'), iN(4, 'large'), iN(5, 'large'), 'img/a-m.webp', null].map(u =>
      R.ctx.photoRoOf(u)
    ),
    [90, 270, 0, 0, 0, 0, 0]
  );
  assert.strictEqual(photoCropOf(iN(1, 'large'), idx), 'inset(0% 50% 0% 0%)', 'its crop, found the same way');
  // The admin's error handler: an R2 photo that fails comes from its original, its crop and rotation drawn (rotFit turns
  // it once it loads); a rotation already drawn (a draft one, crSrc) is left alone.
  const T = adminVm(),
    el = (src, rot) => {
      const A = {src},
        st = {};
      return Object.assign(Object.create(T.HTMLImageElement.prototype), {
        getAttribute: k => (k in A ? A[k] : null),
        setAttribute: (k, v) => (A[k] = v),
        style: {getPropertyValue: k => st[k] || '', setProperty: (k, v) => (st[k] = v)},
        dataset: rot ? {rot} : {},
        A,
        st
      });
    };
  T.set({IDX: idx});
  const i = el(`${PHOTO_BASE}img/a-m.webp?c=0_0_0.5_1`),
    ev = t => ({target: t, stopImmediatePropagation: () => (ev.stopped = (ev.stopped || 0) + 1)});
  T.H.error(ev(i));
  assert.deepStrictEqual([i.A.src, i.st['object-view-box'], i.dataset.rot], [iN(1, 'large'), 'inset(0% 50% 0% 0%)', 90]);
  assert.deepStrictEqual({...T.state()}, {R2: false, AWAY: true});
  const j = el(`${PHOTO_BASE}img/b-m.webp`, '180');
  T.H.error(ev(j));
  assert.deepStrictEqual([j.A.src, j.st['object-view-box'], j.dataset.rot], [iN(2, 'large'), undefined, '180']);
  const k = el(`${PHOTO_BASE}img/c-m.webp`);
  T.H.error(ev(k));
  assert.deepStrictEqual([k.st['object-view-box'], k.dataset.rot], ['inset(0% 50% 0% 0%)', undefined]);
});

// The coral workflow (tools/fetch_approved.py) and the fish one (tools/fish_game.py) both make their files with
// photos.write, and redo a photo by photos.stale: no other crop or turn of their own.
test('the photo workflows apply the crop and the rotation through tools/photos.py only', () => {
  const fa = fs.readFileSync(path.join(ROOT, 'tools/fetch_approved.py'), 'utf8'),
    fg = fs.readFileSync(path.join(ROOT, 'tools/fish_game.py'), 'utf8');
  [fa, fg].forEach((s, i) => {
    const w = ['fetch_approved.py', 'fish_game.py'][i];
    assert.match(s, /photos\.write\(/, w);
    assert.match(s, /photos\.stale\(/, w);
    assert.doesNotMatch(s, /\.crop\(\(|\.transpose\(|\.rotate\(/, `${w}: its own crop or turn`);
  });
  assert.match(fa, /cur\.get\('rot'\)/, 'the corals read curation.json rot');
  assert.match(fg, /F\.get\('rot'\)/, 'the fish read curation.json fish.rot');
});
