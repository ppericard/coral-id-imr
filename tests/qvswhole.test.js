'use strict';
require('./slot.js').testGuard();
// The two compared photos after a wrong answer (quiz.js `.qstage.qvs`):
// - they are shown whole at every size: no rule of app.css fills their box (object-fit: cover, background-size: cover)
//   when it is not the box's shape, which cut a wide photo, a fish, to its middle on a phone (Pierre, 2026-11-20);
// - stacked (one above the other) or side by side is picked by quiz.js fitStage at every size, whichever shows both
//   photos larger in the room left above the feedback sheet: stacked on a normal phone, side by side when a tall sheet
//   leaves a small stage (Pierre, 2026-11-21: «il faut que ça soit dynamique»). So no rule of app.css may force that grid
//   at any size class. No browser here: the stylesheet's and the script's own text (the layout in a browser is checked by
//   tests/pages.smoke.js, part `noupscale`).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const quiz = fs.readFileSync(path.join(__dirname, '..', 'quiz.js'), 'utf8');
const ruleList = text => [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({sel: m[1].trim(), body: m[2]}));
// Every rule (media queries flattened) whose selector reaches the image of a .qvs photo, in source order.
const rules = ruleList(css).filter(r => r.sel.split(',').some(s => /\.qvs\b[^,]*\.qph\b[^,]*\bimg\b/.test(s)));

test('the rules for the compared photos fit them whole, never cover', () => {
  assert.ok(rules.length > 0, 'a rule for .qvs .qph img');
  for (const r of rules) {
    assert.ok(!/object-fit:\s*cover/.test(r.body), `${r.sel}: object-fit cover`);
    assert.ok(!/background-size:\s*cover/.test(r.body), `${r.sel}: background-size cover`);
  }
  const last = rules.filter(r => /object-fit/.test(r.body)).pop();
  assert.match(last.body, /object-fit:\s*(scale-down|contain)/);
});

test('no rule of app.css forces the grid of the compared photos: fitStage picks it at every size', () => {
  for (const r of ruleList(css))
    if (r.sel.split(',').some(s => /\.qstage\.qvs\s*$/.test(s.trim())))
      assert.ok(!/grid-template-(columns|rows)/.test(r.body), `${r.sel}: sets the grid of .qvs`);
});

test("fitStage scores the compared photos by their shapes at every size class, with the stage's real gap", () => {
  const f = quiz.slice(quiz.indexOf('function fitStage'), quiz.indexOf("addEventListener('resize', fitStage)"));
  assert.match(f, /vs = st\.classList\.contains\('qvs'\)/);
  assert.match(f, /isStacked\(\) && !vs/, 'the 4:3 phone guess is for the one-photo stages only');
  assert.match(f, /rs\.reduce\(/, 'the area of both photos by their known shapes');
  assert.match(f, /getComputedStyle\(st\)\.columnGap/, 'the real gap');
});
