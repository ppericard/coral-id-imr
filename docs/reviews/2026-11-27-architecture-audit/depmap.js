// Cross-file dependency map of the classic scripts (REE-284 audit), with acorn + eslint-scope. Read-only.
// Usage, with acorn@8.14.0 and eslint-scope@8.2.0 installed in a temporary folder, never in the repository:
//   NODE_PATH=<that folder>/node_modules node depmap.js <repo root>
// The two pages' files are listed by hand below, in their load order at 7cbd5460. Limit: a file wrapped in a
// function that exposes names through window.X or root.X is not followed (its users are not counted).
const fs = require('fs'),
  path = require('path'),
  acorn = require('acorn'),
  escope = require('eslint-scope');
const ROOT = process.argv[2];
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const parse = src => acorn.parse(src, {ecmaVersion: 'latest', sourceType: 'script', locations: true, ranges: true, allowHashBang: true, allowReturnOutsideFunction: true});

function scan(f, src) {
  const ast = parse(src);
  const sm = escope.analyze(ast, {ecmaVersion: 2022, sourceType: 'script'});
  const g = sm.globalScope;
  const decl = new Map();
  for (const v of g.variables) {
    const d = v.defs[0];
    if (!d) continue;
    const kind = d.type === 'FunctionName' ? 'function' : d.type === 'ClassName' ? 'class' : d.parent && d.parent.kind ? d.parent.kind : d.type;
    decl.set(v.name, {kind, line: d.name.loc.start.line});
  }
  const through = new Map(); // name -> {reads, writes, firstLine, writeLines}
  for (const r of g.through) {
    const n = r.identifier.name;
    const e = through.get(n) || {reads: 0, writes: 0, line: r.identifier.loc.start.line, wl: []};
    if (r.isWrite()) {
      e.writes++;
      e.wl.push(r.identifier.loc.start.line);
    }
    if (r.isRead()) e.reads++;
    through.set(n, e);
  }
  return {decl, through, lines: src.split('\n').length};
}

function coreExports() {
  const s = rd('core/exports.js');
  const a = s.indexOf('const CORE = {'),
    body = s.slice(a, s.indexOf('};', a));
  return new Set(body.match(/[A-Za-z_$][\w$]*/g).filter(x => x !== 'const' && x !== 'CORE'));
}
const CORE = coreExports();

const PLAYER = ['app.js', 'zoom.js', 'gloss.js', 'idtips.js', 'install.js', 'sync.js', 'home-art.js', 'home.js', 'tour.js', 'model.js', 'tips.js', 'quiz.js', 'progress.js', 'live.js', 'learn.js', 'flag.js', 'proto/lab.js'];
const ADMIN = ['autosort.js', 'presence.js', 'points.js', 'taxtree.js', 'reports.js', 'analysis.js', 'admin-demo.js', 'admin-analyses.js', 'admin-draft.js', 'admin-coraltree.js', 'admin-nodephotos.js', 'admin-content.js', 'admin.js', 'admin-fish.js', 'admin-light.js', 'admin-covers.js', 'admin-journey.js', 'admin-visits.js', 'admin-heatmap.js', 'admin-taxa.js'];

const out = {};
function analyse(label, files) {
  const S = {};
  for (const f of files) S[f] = scan(f, rd(f));
  S['core.js'] = {decl: new Map([...CORE].map(x => [x, {kind: 'export'}])), through: new Map(), lines: rd('core.js').split('\n').length};
  const owner = new Map();
  for (const f of ['core.js', ...files]) for (const k of S[f].decl.keys()) if (!owner.has(k)) owner.set(k, f);
  const edges = {},
    writes = [];
  for (const f of files) {
    edges[f] = {};
    for (const [n, e] of S[f].through) {
      const o = owner.get(n);
      if (!o || o === f) continue;
      (edges[f][o] = edges[f][o] || []).push({n, line: e.line});
      if (e.writes) writes.push({f, n, o, kind: S[o].decl.get(n).kind, lines: e.wl.slice(0, 5)});
    }
  }
  console.log(`\n## ${label}: ${files.length + 1} files, ${owner.size} top-level names`);
  console.log('| file | lines | top-level names | of which let/var | uses (file:names) | used by (file:names) |');
  for (const f of ['core.js', ...files]) {
    const d = S[f].decl;
    const lets = [...d.values()].filter(v => v.kind === 'let' || v.kind === 'var').length;
    const uses = Object.entries(edges[f] || {})
      .sort((a, b) => b[1].length - a[1].length)
      .map(([o, a]) => `${o}:${a.length}`);
    const usedBy = files
      .filter(g => edges[g][f])
      .sort((a, b) => edges[b][f].length - edges[a][f].length)
      .map(g => `${g}:${edges[g][f].length}`);
    console.log(`| ${f} | ${S[f].lines} | ${d.size} | ${lets} | ${uses.join(' ')} | ${usedBy.join(' ')} |`);
  }
  console.log('\n### writes to another file\'s top-level binding');
  for (const w of writes) console.log(`- ${w.f} writes ${w.n} (${w.kind} in ${w.o}) at lines ${w.lines.join(',')}`);
  // unresolved names (not declared anywhere in the page): browser globals and typos; list the non-browser ones roughly
  out[label] = {edges, S, owner};
  return out[label];
}
const P = analyse('Player page', PLAYER);
const pairs = [
  ['model.js', 'app.js'],
  ['model.js', 'sync.js'],
  ['model.js', 'quiz.js'],
  ['model.js', 'progress.js'],
  ['quiz.js', 'app.js'],
  ['quiz.js', 'model.js'],
  ['quiz.js', 'sync.js'],
  ['quiz.js', 'progress.js'],
  ['sync.js', 'app.js'],
  ['sync.js', 'model.js'],
  ['sync.js', 'progress.js'],
  ['sync.js', 'quiz.js'],
  ['app.js', 'quiz.js'],
  ['app.js', 'sync.js'],
  ['app.js', 'model.js'],
  ['app.js', 'progress.js'],
  ['progress.js', 'model.js'],
  ['progress.js', 'sync.js']
];
console.log('\n### names per edge (first line in the user file)');
for (const [a, b] of pairs) {
  const L = (P.edges[a][b] || []).sort((x, y) => x.line - y.line);
  console.log(`- ${a} -> ${b} (${L.length}): ${L.map(x => `${x.n}@${x.line}`).join(' ')}`);
}
// cycles between files (strongly connected)
function sccs(edges, files) {
  const idx = {},
    low = {},
    on = new Set(),
    st = [],
    res = [];
  let i = 0;
  const vis = v => {
    idx[v] = low[v] = i++;
    st.push(v);
    on.add(v);
    for (const w of Object.keys(edges[v] || {})) {
      if (w === 'core.js') continue;
      if (idx[w] === undefined) {
        vis(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (on.has(w)) low[v] = Math.min(low[v], idx[w]);
    }
    if (low[v] === idx[v]) {
      const c = [];
      let w;
      do {
        w = st.pop();
        on.delete(w);
        c.push(w);
      } while (w !== v);
      res.push(c);
    }
  };
  for (const f of files) if (idx[f] === undefined) vis(f);
  return res.filter(c => c.length > 1);
}
console.log('\n### cycles (strongly connected sets of files, core.js aside)');
for (const c of sccs(P.edges, PLAYER)) console.log('- player:', c.join(', '));
const A = analyse('Admin page', ADMIN);
for (const c of sccs(A.edges, ADMIN)) console.log('- admin:', c.join(', '));

// The core: which exports does each consumer read
const gs = rd('tools/sync/Code.gs');
const b = gs.indexOf('// BEGIN core.js'),
  e = gs.indexOf('// END core.js');
const own = gs.slice(0, b) + gs.slice(e);
const gsUse = new Set((own.match(/CORE_\.([A-Za-z_$][\w$]*)/g) || []).map(x => x.slice(6)));
const useP = new Set(),
  useA = new Set();
for (const f of PLAYER) for (const n of P.S[f].through.keys()) if (CORE.has(n) && !P.S[f].decl.has(n)) useP.add(n);
for (const f of ADMIN) for (const n of A.S[f].through.keys()) if (CORE.has(n) && !A.S[f].decl.has(n)) useA.add(n);
const all = new Set([...useP, ...useA, ...gsUse]);
console.log(`\n## core.js exports: ${CORE.size}; read by the player page ${useP.size}, the admin ${useA.size}, Code.gs ${gsUse.size}; by at least one ${all.size}; by all three ${[...useP].filter(x => useA.has(x) && gsUse.has(x)).length}`);
console.log('by all three:', [...useP].filter(x => useA.has(x) && gsUse.has(x)).join(' '));
console.log('Code.gs only (not player):', [...gsUse].filter(x => !useP.has(x)).join(' '));
const none = [...CORE].filter(x => !all.has(x));
console.log(`read by none of them (${none.length}; core-internal or tests only):`, none.slice(0, 400).join(' '));
// Which core parts define the exports read by each consumer
const partOf = {};
for (const p of fs.readdirSync(path.join(ROOT, 'core'))) {
  if (p === 'exports.js') continue;
  const s = rd('core/' + p);
  for (const m of s.matchAll(/^  (?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) partOf[m[1]] = p;
  for (const m of s.matchAll(/^  (?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=.*?,\s*$/gm)) partOf[m[1]] = partOf[m[1]] || p;
}
const tally = set => {
  const t = {};
  for (const n of set) t[partOf[n] || '?'] = (t[partOf[n] || '?'] || 0) + 1;
  return Object.entries(t)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(' ');
};
console.log('\n### core parts read, by consumer');
console.log('player:', tally(useP));
console.log('admin:', tally(useA));
console.log('Code.gs:', tally(gsUse));
console.log('exports per part:', tally(CORE));
// own lines of Code.gs
console.log(`\nCode.gs: ${gs.split('\n').length} lines, ${own.split('\n').length} its own (outside the embedded core.js)`);
