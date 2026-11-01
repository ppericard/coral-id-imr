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
