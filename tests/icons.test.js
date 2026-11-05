// The app icon (C1, Pierre 2026-11-06; docs/ARCHITECTURE.md "App icon"): the manifest's icons exist at the size they
// declare, the maskable and iOS icons are full bleed (opaque), every page names the same favicon, and only the SVG is in
// the offline shell (the PNGs are read by the system at install time).
// node --test tests/icons.test.js
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');

const root = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(root, f), 'utf8');

// Width, height and whether the PNG has an alpha channel (IHDR: colour types 4 and 6, or a tRNS chunk).
function png(f) {
  const b = fs.readFileSync(path.join(root, f));
  assert.strictEqual(b.toString('latin1', 1, 4), 'PNG', f + ' is a PNG');
  const chunks = [];
  for (let o = 8; o < b.length; o += 12 + b.readUInt32BE(o)) chunks.push(b.toString('latin1', o + 4, o + 8));
  const type = b[25];
  return {w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: type === 4 || type === 6 || chunks.includes('tRNS')};
}

test('manifest: an "any" SVG, "any" and maskable PNGs at 192 and 512, each the size it declares', () => {
  const icons = JSON.parse(read('manifest.webmanifest')).icons;
  for (const i of icons) {
    assert.ok(fs.existsSync(path.join(root, i.src)), i.src + ' exists');
    if (i.type === 'image/png') {
      const p = png(i.src),
        [w, h] = i.sizes.split('x').map(Number);
      assert.deepStrictEqual([p.w, p.h], [w, h], i.src);
      if (i.purpose === 'maskable') assert.ok(!p.alpha, i.src + ' is full bleed (no transparency for the mask to show)');
    } else assert.deepStrictEqual([i.type, i.sizes], ['image/svg+xml', 'any'], i.src);
  }
  const has = (purpose, sizes) => icons.some(i => i.purpose === purpose && i.sizes === sizes);
  for (const s of ['192x192', '512x512']) assert.ok(has('any', s) && has('maskable', s), s);
  assert.ok(has('any', 'any'));
});

test('pages: one favicon (icon.svg), the iOS icon is 180 px and opaque, the header logo is the icon', () => {
  for (const f of ['index.html', 'admin.html', 'privacy.html']) {
    const icons = [...read(f).matchAll(/<link rel="icon" href="([^"]+)"/g)].map(m => m[1]);
    assert.deepStrictEqual(icons, ['icon.svg'], f);
  }
  for (const f of ['index.html', 'admin.html']) {
    const t = read(f);
    assert.match(t, /<link rel="apple-touch-icon" href="apple-touch-icon\.png">/, f);
    assert.match(t, /<h1 class="brand">.*<img src="icon\.svg"/, f + ' header logo');
  }
  const p = png('apple-touch-icon.png');
  assert.deepStrictEqual([p.w, p.h, p.alpha], [180, 180, false], 'iOS fills transparency with black');
});

test('sw.js: the shell keeps icon.svg and the manifest, never the install-time PNGs', () => {
  const sw = read('sw.js'),
    shell = sw.slice(sw.indexOf('const SHELL'), sw.indexOf('];', sw.indexOf('const SHELL')));
  assert.match(shell, /'icon\.svg'/);
  assert.match(shell, /'manifest\.webmanifest'/);
  assert.ok(!/\.png/.test(shell), 'no PNG icon in SHELL');
});
