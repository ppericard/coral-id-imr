// For each core part: the test files that name one of its exports (REE-284 audit). Read-only.
// Usage: node corepart_tests.js <repo root>
const fs = require('fs'),
  path = require('path');
const ROOT = process.argv[2];
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ex = rd('core/exports.js');
const a = ex.indexOf('const CORE = {');
const CORE = new Set(ex.slice(a, ex.indexOf('};', a)).match(/[A-Za-z_$][\w$]*/g).filter(x => x !== 'const' && x !== 'CORE'));
const partOf = {};
for (const p of fs.readdirSync(path.join(ROOT, 'core'))) {
  if (p === 'exports.js') continue;
  const s = rd('core/' + p);
  for (const m of s.matchAll(/^  (?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) partOf[m[1]] = partOf[m[1]] || p;
  // multi-declarations: "  const A = ..., \n    B = ..." are missed; counted under '?'
}
const tests = fs.readdirSync(path.join(ROOT, 'tests')).filter(f => f.endsWith('.test.js'));
const coreTests = tests.filter(t => /core\.js/.test(rd('tests/' + t)));
const per = {};
let multi = [];
for (const t of coreTests) {
  const s = rd('tests/' + t);
  const ids = new Set(s.match(/[A-Za-z_$][\w$]*/g));
  const parts = new Set();
  for (const n of ids) if (CORE.has(n)) parts.add(partOf[n] || '?');
  for (const p of parts) (per[p] = per[p] || []).push(t);
  multi.push(parts.size);
}
console.log(`test files naming core.js: ${coreTests.length}; parts named per file: median ${multi.sort((x, y) => x - y)[Math.floor(multi.length / 2)]}, max ${multi[multi.length - 1]}`);
for (const [p, L] of Object.entries(per).sort((x, y) => y[1].length - x[1].length)) console.log(`- ${p}: ${L.length}`);
// how many root sources each unit test reads
const srcs = fs.readdirSync(ROOT).filter(f => f.endsWith('.js'));
const counts = tests.map(t => {
  const s = rd('tests/' + t);
  return srcs.filter(f => new RegExp(`['"\`/]${f.replace('.', '\\.')}['"\`]`).test(s)).length;
});
const hist = {};
for (const c of counts) hist[c] = (hist[c] || 0) + 1;
console.log('unit test files by number of root .js sources named:', JSON.stringify(hist));
