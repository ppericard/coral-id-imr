'use strict';
require('./slot.js').testGuard();
// The two compared photos after a wrong answer (quiz.js `.qstage.qvs`):
// - they are shown whole at every size: no rule of app.css fills their box (object-fit: cover, background-size: cover)
//   when it is not the box's shape, which cut a wide photo, a fish, to its middle on a phone (Pierre, 2026-11-20);
// - on the phone size class (rule U4, `app.js` MQ.phone) they are stacked, one above the other, each the full width and
//   half the height of the stage, which is what shows them biggest on a tall phone stage (Pierre, 2026-11-21); tablets and
//   desktop keep the grid quiz.js fitStage picks. No browser here: the stylesheet's own rules (the layout in a browser is
//   checked by tests/pages.smoke.js, part `noupscale`).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const ruleList = text => [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({sel: m[1].trim(), body: m[2]}));
// Every rule (media queries flattened) whose selector reaches the image of a .qvs photo, in source order.
const rules = ruleList(css).filter(r => r.sel.split(',').some(s => /\.qvs\b[^,]*\.qph\b[^,]*\bimg\b/.test(s)));
// The text inside every `@media <head> {...}` block of the stylesheet (braces balanced).
const mediaBlocks = head => {
  const out = [];
  for (let i = css.indexOf(head); i >= 0; i = css.indexOf(head, i + 1)) {
    let d = 0,
      j = css.indexOf('{', i);
    const from = j + 1;
    for (; j < css.length; j++) {
      if (css[j] === '{') d++;
      if (css[j] === '}' && --d === 0) break;
    }
    out.push(css.slice(from, j));
  }
  return out;
};
const gridOf = r => ({
  cols: (/grid-template-columns:\s*([^;]+);/.exec(r.body) || [])[1],
  rows: (/grid-template-rows:\s*([^;]+);/.exec(r.body) || [])[1]
});
const onStage = r => r.sel.split(',').some(s => /\.qstage\.qvs\s*$/.test(s.trim()));

test('the rules for the compared photos fit them whole, never cover', () => {
  assert.ok(rules.length > 0, 'a rule for .qvs .qph img');
  for (const r of rules) {
    assert.ok(!/object-fit:\s*cover/.test(r.body), `${r.sel}: object-fit cover`);
    assert.ok(!/background-size:\s*cover/.test(r.body), `${r.sel}: background-size cover`);
  }
  const last = rules.filter(r => /object-fit/.test(r.body)).pop();
  assert.match(last.body, /object-fit:\s*(scale-down|contain)/);
});

test('on a phone the two compared photos are stacked, one above the other, in two equal rows', () => {
  // The phone media query is the one of app.js MQ.phone (rule U4: the same values in CSS and JS).
  const mq = /phone:\s*'\(max-width:\s*([\d.]+)px\)'/.exec(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'));
  assert.ok(mq, 'app.js MQ.phone');
  const blocks = mediaBlocks(`@media (max-width: ${mq[1]}px)`);
  assert.ok(blocks.length > 0, `app.css has a @media (max-width: ${mq[1]}px) block`);
  const phone = blocks.flatMap(ruleList).filter(onStage),
    grids = phone.map(gridOf);
  const cols = grids.filter(g => g.cols).pop(),
    rows = grids.filter(g => g.rows).pop();
  assert.ok(cols && rows, 'a phone rule sets the grid of .q .qstage.qvs');
  // One column (a single track, never `1fr 1fr` or repeat(2, ...)), two equal rows, both !important (they win over the
  // inline grid quiz.js fitStage sets for the other sizes).
  assert.match(cols.cols, /^minmax\(0,\s*1fr\)\s*!important$/, 'one column');
  assert.match(rows.rows, /^repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important$/, 'two equal rows');
});

test("only the phone class forces the grid of the compared photos: tablets and desktop keep fitStage's", () => {
  const mq = /phone:\s*'\(max-width:\s*([\d.]+)px\)'/.exec(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'));
  const sets = r => gridOf(r).cols || gridOf(r).rows;
  const inPhone = mediaBlocks(`@media (max-width: ${mq[1]}px)`).flatMap(ruleList).filter(onStage).filter(sets);
  // A rule on the stage that sets its grid, outside every phone block, would force it on tablets and desktop too.
  const all = ruleList(css).filter(onStage).filter(sets);
  assert.ok(
    all.length > 0 && all.length === inPhone.length,
    `${all.length} rules set the grid of .qvs, ${inPhone.length} in the phone media query`
  );
});
