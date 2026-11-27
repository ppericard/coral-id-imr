// Which source files each test reads, and how (REE-284 audit). Read-only. Usage: node testmap.js <repo root>
const fs = require('fs'),
  path = require('path');
const ROOT = process.argv[2];
const T = path.join(ROOT, 'tests');
const srcs = fs
  .readdirSync(ROOT)
  .filter(f => f.endsWith('.js'))
  .concat(['tools/sync/Code.gs'])
  .concat(fs.readdirSync(path.join(ROOT, 'core')).map(f => 'core/' + f));
const tests = fs.readdirSync(T).filter(f => /\.(test|smoke|check)\.js$/.test(f));
const helpers = fs.readdirSync(T).filter(f => f.endsWith('.js') && !/\.(test|smoke|check)\.js$/.test(f));
const by = {}; // src -> {req:Set, text:Set}
const slow = new Set();
let blockFiles = 0,
  vmFiles = 0,
  reqOnlyFiles = 0;
const rows = [];
for (const t of [...tests, ...helpers]) {
  const s = fs.readFileSync(path.join(T, t), 'utf8');
  if (/^\/\/ @slow\b/m.test(s.slice(0, 1024))) slow.add(t);
  const usesBlock = /require\(['"]\.\/block(\.js)?['"]\)/.test(s);
  const usesVm = /require\(['"](node:)?vm['"]\)/.test(s);
  if (t.endsWith('.test.js')) {
    if (usesBlock) blockFiles++;
    if (usesVm) vmFiles++;
  }
  const read = [];
  for (const f of srcs) {
    const base = f.split('/').pop();
    const esc = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reqRe = new RegExp(`require\\(\\s*['"\`](\\.\\./|\\./\\.\\./)${esc}['"\`]`);
    const anyRe = new RegExp(`['"\`/]${esc}['"\`]`);
    const isReq = reqRe.test(s);
    const isAny = anyRe.test(s) || (f.includes('/') && new RegExp(`['"\`]${base.replace('.', '\\.')}['"\`]`).test(s) && s.includes(f.split('/')[0]));
    if (!isReq && !isAny) continue;
    const how = isReq && !(anyRe.test(s.replace(reqRe, ''))) ? 'require' : 'text';
    by[f] = by[f] || {require: new Set(), text: new Set()};
    by[f][how].add(t);
    read.push(`${f}:${how}`);
  }
  rows.push({t, read, usesBlock, usesVm});
}
console.log(`tests: ${tests.length} (test ${tests.filter(t => t.endsWith('.test.js')).length}, smoke ${tests.filter(t => t.endsWith('.smoke.js')).length}, check ${tests.filter(t => t.endsWith('.check.js')).length}); helpers ${helpers.length}; slow-tagged ${slow.size}`);
console.log(`unit test files using block(): ${blockFiles}; using vm: ${vmFiles}`);
console.log('\n| source | read by tests (require) | read as text (vm/block/regex) | examples (text) |');
for (const [f, v] of Object.entries(by).sort((a, b) => b[1].require.size + b[1].text.size - (a[1].require.size + a[1].text.size)))
  console.log(`| ${f} | ${v.require.size} | ${v.text.size} | ${[...v.text].slice(0, 6).join(' ')} |`);
// tests that read only core.js by require (pure engine tests)
const pure = rows.filter(r => r.t.endsWith('.test.js') && r.read.length && r.read.every(x => /:(require)$/.test(x)));
console.log(`\nunit test files that only require() modules (no source text): ${pure.length}`);
const noSrc = rows.filter(r => r.t.endsWith('.test.js') && !r.read.length);
console.log(`unit test files naming no root source (tools, docs, data, or helper-only): ${noSrc.length}`);
// smokes: which pages
for (const r of rows.filter(r => r.t.endsWith('.smoke.js'))) console.log(`smoke ${r.t}: ${r.read.join(' ')}`);
