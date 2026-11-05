// The Content-Security-Policy of index.html and admin.html allows inline scripts only by hash: editing an inline
// script without updating its hash would silently block it (e.g. the theme would stop applying before paint).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  crypto = require('crypto');

for (const page of ['index.html', 'admin.html'])
  test(`${page}: every inline script is allowed by the CSP`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
    assert.ok(csp, 'CSP meta present');
    const script = csp
      .split(';')
      .map(x => x.trim())
      .find(x => x.startsWith('script-src'));
    assert.ok(!/unsafe-inline|unsafe-eval/.test(script), 'no unsafe-inline/eval for scripts');
    for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const h = `'sha256-${crypto.createHash('sha256').update(m[1]).digest('base64')}'`;
      assert.ok(script.includes(h), `inline script not in the CSP; add ${h} to script-src in ${page}`);
    }
  });

// Every remote photo the admin shows (the fish candidates in fish-cand.json: iNaturalist and, since 2026-11-05, FishBase;
// the fish auto decisions panel draws them) comes from a host the admin's img-src allows (Codex review #562).
test('admin.html: img-src allows every host of the fish candidates', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8'),
    csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1],
    img = csp
      .split(';')
      .map(x => x.trim())
      .find(x => x.startsWith('img-src'))
      .split(/\s+/),
    cand = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fish-cand.json'), 'utf8')).cand,
    hosts = new Set(
      Object.values(cand)
        .flat()
        .map(p => new URL(p.src).origin)
    );
  hosts.forEach(h => assert.ok(img.includes(h), `${h} missing from admin.html img-src`));
});

// When R2 fails, a photo with an online original is read from it (core.js photoAway; Pierre, 2026-11-05: Photos out
// of the repo, step 1): every host of those originals (data.json, cand.json and fish-photos.json src: iNaturalist,
// FishBase) must be allowed by the app's img-src, or the fallback would be blocked.
test('index.html: img-src allows every host of the photos’ online originals', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'),
    csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1],
    img = csp
      .split(';')
      .map(x => x.trim())
      .find(x => x.startsWith('img-src'))
      .split(/\s+/),
    hosts = new Set(),
    walk = o => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) return o.forEach(walk);
      if (typeof o.f === 'string' && typeof o.src === 'string' && /^https:/.test(o.src)) hosts.add(new URL(o.src).origin);
      Object.values(o).forEach(walk);
    };
  for (const f of ['data.json', 'cand.json', 'fish-photos.json']) walk(JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')));
  assert.ok(hosts.size >= 2, 'online originals found');
  hosts.forEach(h => assert.ok(img.includes(h), `${h} missing from index.html img-src`));
});
