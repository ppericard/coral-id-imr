'use strict';
require('./slot.js').testGuard();
// The two compared photos after a wrong answer (quiz.js `.qstage.qvs`) are shown whole at every size: no rule of app.css
// fills their box (object-fit: cover, background-size: cover) when it is not the box's shape, which cut a wide photo, a
// fish, to its middle on a phone (Pierre, 2026-11-20). No browser: the stylesheet's own rules.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
// Every rule (media queries flattened) whose selector reaches the image of a .qvs photo, in source order.
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(m => ({sel: m[1].trim(), body: m[2]}))
  .filter(r => r.sel.split(',').some(s => /\.qvs\b[^,]*\.qph\b[^,]*\bimg\b/.test(s)));

test('the rules for the compared photos fit them whole, never cover', () => {
  assert.ok(rules.length > 0, 'a rule for .qvs .qph img');
  for (const r of rules) {
    assert.ok(!/object-fit:\s*cover/.test(r.body), `${r.sel}: object-fit cover`);
    assert.ok(!/background-size:\s*cover/.test(r.body), `${r.sel}: background-size cover`);
  }
  const last = rules.filter(r => /object-fit/.test(r.body)).pop();
  assert.match(last.body, /object-fit:\s*(scale-down|contain)/);
});
