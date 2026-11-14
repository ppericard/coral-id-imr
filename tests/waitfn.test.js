// page.waitForFunction never awaits a Promise its predicate returns: a Promise is truthy, so the wait ends at once,
// whatever it resolves to. A smoke's "no version waiting" check in net.smoke.js test 9 (getRegistration().then(...))
// guarded nothing that way until 2026-11-14 (a hang on a merge train). A check that needs an async read polls
// page.evaluate in a loop instead. This test fails on a waitForFunction whose predicate is async or
// returns a .then(...) chain, in tests/ and tools/.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path');
const ROOT = path.join(__dirname, '..');

// The first argument of each waitForFunction( call in src (up to its first top-level comma or its closing parenthesis),
// with the line it starts on. Strings and template literals are skipped whole, so a comma or parenthesis in one is no
// boundary.
const predicates = src => {
  const out = [];
  for (let i = src.indexOf('waitForFunction('); i >= 0; i = src.indexOf('waitForFunction(', i + 1)) {
    const start = i + 'waitForFunction('.length;
    let depth = 0,
      j = start;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === '"' || c === "'" || c === '`') {
        for (j++; j < src.length && src[j] !== c; j++) if (src[j] === '\\') j++;
      } else if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) {
        if (!depth) break;
        depth--;
      } else if (c === ',' && !depth) break;
    }
    out.push({line: src.slice(0, i).split('\n').length, text: src.slice(start, j)});
  }
  return out;
};
const returnsPromise = text => /^\s*async\b/.test(text) || /\.then\(/.test(text) || /\bawait\b/.test(text);

test('the scan finds a predicate that returns a Promise, and passes a plain one', () => {
  const src = [
    'await q.waitForFunction(() => navigator.serviceWorker.getRegistration().then(g => !!g && !g.waiting), null, {timeout: 30000});',
    'await p.waitForFunction(async () => (await fetch("x")).ok);',
    "await p.waitForFunction(() => window.APP_READY && /Loading, (1)/.test('a, b'), null, {timeout: 20000});",
    'await p.waitForFunction(w => !!document.querySelector(".a") === w, want, {timeout: 10000});'
  ].join('\n');
  assert.deepStrictEqual(
    predicates(src).map(p => [p.line, returnsPromise(p.text)]),
    [
      [1, true],
      [2, true],
      [3, false],
      [4, false]
    ]
  );
});

test('no waitForFunction predicate returns a Promise (tests/, tools/)', () => {
  const bad = [];
  for (const dir of ['tests', 'tools'])
    for (const f of fs.readdirSync(path.join(ROOT, dir))) {
      if (!f.endsWith('.js') || f === 'waitfn.test.js') continue;
      const src = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
      for (const p of predicates(src)) if (returnsPromise(p.text)) bad.push(`${dir}/${f}:${p.line}: ${p.text.trim().slice(0, 80)}`);
    }
  assert.deepStrictEqual(bad, [], 'poll page.evaluate in a loop instead:\n' + bad.join('\n'));
});
