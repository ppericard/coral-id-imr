'use strict';
require('./slot.js').testGuard();
// tools/answers_check.py: every answer reaches its doc, checked on made-up ledgers in a temporary folder, offline.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');
const TOOL = path.join(__dirname, '..', 'tools', 'answers_check.py');
const roots = [];
test.after(() => roots.forEach(r => fs.rmSync(r, {recursive: true, force: true})));

// Writes the made-up files, runs the check with its own KNOWN; returns {status, out}.
const check = (files, known = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'answers-'));
  roots.push(root);
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, f)), {recursive: true});
    fs.writeFileSync(path.join(root, f), text);
  }
  const r = spawnSync('python3', ['-B', TOOL, '--check', '--root', root, '--known', JSON.stringify(known)], {
    encoding: 'utf8',
    timeout: 5000
  });
  return {status: r.status, out: r.stdout + r.stderr};
};
const ledger = (...entries) =>
  '# Ledger\n\n## 2026-11-18\n\n- **10:00, Q800.** Old, before the check.\n\n## 2026-11-19\n\n' + entries.join('\n') + '\n';

test('an entry from 2026-11-19 names where it is applied, or "no doc change"', () => {
  const ok = check({
    'docs/ANSWERS.md': ledger(
      '- **05:13, Q901.** Merge it. Applied: #1130.',
      '- **05:20.** A wording,',
      '  wrapped. Applied: rule W19.',
      '- **05:30, Q902.** The names stay: no doc change.',
      '- **05:40, Q903 applied.** #1171 merged.'
    )
  });
  assert.strictEqual(ok.status, 0, ok.out);
  assert.match(ok.out, /0 failing/);
  const bad = check({'docs/ANSWERS.md': ledger('- **06:00, Q904.** OK, with no place.')});
  assert.strictEqual(bad.status, 1, bad.out);
  assert.match(bad.out, /docs\/ANSWERS\.md:\d+ 2026-11-19 06:00, Q904\. OK, with no place\.…: names no "Applied/);
});

test('a later "Applied in #N" entry naming its question closes an entry; KNOWN holds the rest and only shrinks', () => {
  const files = {
    'docs/ANSWERS.md': ledger('- **06:00, Q904.** OK.', '- **06:10.** Not numbered.', '- **Applied in #1190:** Q904 (rule W14).')
  };
  const r = check(files, {'2026-11-19 06:10. Not numbered': 'why'});
  assert.strictEqual(r.status, 0, r.out);
  assert.match(r.out, /^known +docs\/ANSWERS\.md:\d+ 2026-11-19 06:10\. Not numbered\.…: why$/m);
  const stale = check(files, {'2026-11-19 06:10. Not numbered': 'why', '2026-11-19 07:00, Q999': 'gone'});
  assert.strictEqual(stale.status, 1, stale.out);
  assert.match(stale.out, /KNOWN "2026-11-19 07:00, Q999": no open ledger entry matches it any more: delete it/);
  // An unnumbered entry is closed by its time and first three words, case and punctuation ignored, as the message says.
  const open = check({'docs/ANSWERS.md': ledger('- **06:10, rule S1’s wording.** "ok".')});
  assert.match(open.out, /naming its Q, or its time and first words "06:10 rule s1's wording"/);
  const closed = check({
    'docs/ANSWERS.md': ledger('- **06:10, rule S1’s wording.** "ok".', "- **Applied in #1190:** 06:10, Rule S1's wording: rule S1.")
  });
  assert.strictEqual(closed.status, 0, closed.out);
  // Another time, or the words alone, close nothing; a word is matched whole.
  for (const c of ["06:11, rule S1's wording", "rule S1's wording", "06:10, rule S1's wordings"])
    assert.strictEqual(
      check({'docs/ANSWERS.md': ledger('- **06:10, rule S1’s wording.** "ok".', '- **Applied in #1190:** ' + c + '.')}).status,
      1,
      c
    );
});

test('an "Applied in #N" entry closes only the entries before it: a later follow-up of the same question stays open', () => {
  const first = ['- **06:00, Q904.** OK.', '- **Applied in #1190:** Q904 (rule W14).'];
  const followUp = '- **07:00, Q904.** A follow-up, with no place.';
  const bad = check({'docs/ANSWERS.md': ledger(...first, followUp)});
  assert.strictEqual(bad.status, 1, bad.out);
  assert.match(bad.out, /docs\/ANSWERS\.md:\d+ 2026-11-19 07:00, Q904\. A follow-up, with no place\.…: names no "Applied/);
  assert.doesNotMatch(bad.out, /06:00, Q904/);
  // The same for an unnumbered entry and a closer naming its time and first words.
  const open = check({
    'docs/ANSWERS.md': ledger("- **Applied in #1190:** 06:10, rule S1's wording.", '- **06:10, rule S1’s wording.** "ok".')
  });
  assert.strictEqual(open.status, 1, open.out);
  // A later closer closes the follow-up too.
  const closed = check({'docs/ANSWERS.md': ledger(...first, followUp, '- **Applied in #1191:** Q904, the follow-up (rule W15).')});
  assert.strictEqual(closed.status, 0, closed.out);
});

test('every "#…" after "Applied" is a PR number', () => {
  for (const tail of ['Applied: #N.', 'Applied: this PR.', 'Applied: #12a.', 'Applied: the rule (#N).'])
    assert.strictEqual(check({'docs/ANSWERS.md': ledger('- **06:00, Q904.** OK. ' + tail)}).status, 1, tail);
  const r = check({'docs/ANSWERS.md': ledger("- **06:00, Q904.** OK. Applied: #1130's Decisions, [a row](ROADMAP.md#fish).")});
  assert.strictEqual(r.status, 0, r.out);
});

test('a ROADMAP or reviews status waiting on an answered question fails; a study line and STATUS are shown only', () => {
  const answers = ledger('- **06:00, Q904.** OK. Applied: #1.', '- **06:10, Q905.** Not answered: no context. Applied: no doc change.');
  const roadmap = s => '| Item | Source | Status |\n|---|---|---|\n| **Thing** | Q904 decided | ' + s + ' |\n';
  const fail = check({'docs/ANSWERS.md': answers, 'docs/ROADMAP.md': roadmap('Waiting on Pierre (Q904)')});
  assert.strictEqual(fail.status, 1, fail.out);
  assert.match(fail.out, /docs\/ROADMAP\.md:3: its status "Waiting on Pierre \(Q904\)" waits on Q904 \(docs\/ANSWERS\.md:\d+\), answered/);
  // Q905 is not answered; Q904 in a "built" clause or far from the phrase, and a status with no waiting phrase, pass.
  for (const s of ['Waiting on Pierre (Q905)', 'Next (Q904)', 'built (#642, Q904); (b) for Pierre'])
    assert.strictEqual(check({'docs/ANSWERS.md': answers, 'docs/ROADMAP.md': roadmap(s)}).status, 0, s);
  const shown = check({
    'docs/ANSWERS.md': answers,
    'docs/reviews/2026-11-18-study.md': '# Study\n\n- Q904 waits for Pierre.\n',
    'docs/STATUS.md': '## Questions for Pierre\n\n- **Q904** still listed.\n- **Q905** open.\n\n## Next\n'
  });
  assert.strictEqual(shown.status, 0, shown.out);
  assert.match(shown.out, /^look +docs\/reviews\/2026-11-18-study\.md:3: .*Q904/m);
  assert.match(shown.out, /^look +docs\/STATUS\.md:3: Q904 is listed open/m);
  assert.ok(!/Q905 is listed/.test(shown.out), shown.out);
});
