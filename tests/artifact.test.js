'use strict';
// The published site (repo hygiene audit, 2026-11-08): pages.yml stages it with git archive, which leaves out every path
// .gitattributes marks export-ignore: the docs, tests, tools, the judging package and the repository's own config. Nothing
// the site serves may need them (the sync script reads raw.githubusercontent.com, never the site).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
const OUT = ['docs', 'tests', 'tools', 'judging', '.github', '.claude'];
// What git archive keeps of these tracked files, with this checkout's .gitattributes (as the deploy's archive of main).
const archived = files => {
  const tar = execFileSync('tar', ['-t'], {
    input: execFileSync('git', ['archive', '--worktree-attributes', 'HEAD', '--', ...files], {cwd: ROOT, maxBuffer: 1 << 28})
  });
  return tar
    .toString()
    .split('\n')
    .filter(f => f && !f.endsWith('/'));
};

test('the deploy stages the site with git archive (so export-ignore applies)', () => {
  assert.match(fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'pages.yml'), 'utf8'), /git archive HEAD \| tar -x/);
});

test('docs, tests, tools, judging and the repository config stay out of the site; the site files stay in', () => {
  // One tracked file from each folder left out, and the site's own files (no photo: a sparse checkout has none, rule W22).
  const tracked = execFileSync('git', ['ls-files', '--', ...OUT], {cwd: ROOT, encoding: 'utf8'})
      .split('\n')
      .filter(Boolean),
    one = OUT.map(d => tracked.find(f => f.startsWith(d + '/')));
  assert.ok(one.every(Boolean), 'a folder left out has no tracked file: ' + OUT.filter((d, i) => !one[i]).join(', '));
  assert.deepStrictEqual(archived(one), [], 'export-ignore missing in .gitattributes for these');
  const site = [
    'index.html',
    'admin.html',
    'privacy.html',
    'sw.js',
    'app.js',
    'data.json',
    'curation.json',
    'proto/lab.js',
    '.nojekyll',
    'manifest.webmanifest'
  ];
  assert.deepStrictEqual(archived(site).sort(), [...site].sort(), 'a file the site serves is left out of the deploy');
});

test('nothing the site loads lives in a folder left out of it', () => {
  const under = u => OUT.some(d => u.replace(/^\.\//, '').startsWith(d + '/'));
  const bad = [];
  // The service worker's shell.
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'),
    shell = /const SHELL = \[([\s\S]*?)\n\];/.exec(sw)[1];
  for (const m of shell.matchAll(/'([^']+)'/g)) if (under(m[1])) bad.push('sw.js SHELL: ' + m[1]);
  // The pages' own src and href (scripts, styles, icons, the manifest).
  for (const f of [
    'index.html',
    'admin.html',
    'privacy.html',
    ...fs
      .readdirSync(path.join(ROOT, 'proto'))
      .filter(x => x.endsWith('.html'))
      .map(x => 'proto/' + x)
  ])
    for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/\b(?:src|href)="([^"#:]+)"/g))
      if (under(m[1])) bad.push(f + ': ' + m[1]);
  // The files the app, the admin and the Lab fetch by name.
  const js = fs
    .readdirSync(ROOT)
    .filter(x => x.endsWith('.js'))
    .concat(
      fs
        .readdirSync(path.join(ROOT, 'proto'))
        .filter(x => x.endsWith('.js'))
        .map(x => 'proto/' + x)
    );
  for (const f of js)
    for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/\b(?:fetch|getR|json|get|side)\(\s*['`]([^'`]+)['`]/g))
      if (under(m[1])) bad.push(f + ': ' + m[1]);
  assert.deepStrictEqual(bad, [], 'the site loads files that the deploy leaves out (.gitattributes export-ignore)');
});
