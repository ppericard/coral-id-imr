require('./slot.js').testGuard();
// CodeQL's advanced setup (.github/workflows/codeql.yml; Pierre, 2026-11-26 and 2026-11-27, REE-121 (c)): the analyses
// GitHub's default setup ran, on every pull request to main, push to main, weekly and by hand, except a proven docs or
// data change (tools/codeql_scope.py), which the "CodeQL scope" job reports and the Analyze jobs show as skipped, never
// as a success. EXEMPT is checked against the repository's own files; the decision runs on throwaway repositories.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  SCRIPT = path.join(ROOT, 'tools', 'codeql_scope.py'),
  yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'codeql.yml'), 'utf8'),
  // GitHub's default setup as read on 2026-11-27 (GET code-scanning/default-setup and its runs): these languages,
  // build mode none, the default query suite, categories /language:<language>.
  LANGUAGES = ['actions', 'javascript-typescript', 'python'],
  // What an exempt path may be: Markdown, JSON data, WebP photos, the licence. Never code, never a whole directory.
  SAFE_EXT = ['.md', '.json', '.webp'];

const py = (code, input) =>
  JSON.parse(execFileSync('python3', ['-B', '-c', code], {cwd: path.join(ROOT, 'tools'), input, encoding: 'utf8'}));

// The lines of one job, from "  <id>:" to the next job.
function jobBlock(src, id) {
  const jobs = src.slice(src.indexOf('\njobs:\n')),
    i = jobs.indexOf(`\n  ${id}:\n`);
  assert.ok(i >= 0, `codeql.yml: no job ${id}`);
  const rest = jobs.slice(i + 1),
    next = /\n {2}[\w-]+:\n/.exec(rest);
  return next ? rest.slice(0, next.index + 1) : rest;
}

test('codeql.yml: the default setup analyses, on PRs and pushes to main, weekly and by hand; no path filter', () => {
  assert.match(
    yml,
    /\non:\n {2}push:\n {4}branches: \[main\]\n {2}pull_request:\n {4}branches: \[main\]\n {2}schedule:\n(?: {4}#.*\n)* {4}- cron: '43 13 \* \* 4'\n {2}workflow_dispatch:\n/
  );
  // A top-level path filter would leave no check at all, or a pending one; the scope job decides and reports instead.
  assert.doesNotMatch(yml, /\n\s+paths(-ignore)?:/);
  assert.match(yml, /\npermissions:\n {2}contents: read\n(?![ ]{2})/);
  // Only a PR's superseded run is cancelled; main, the weekly and a manual run each have a group of their own.
  assert.match(
    yml,
    /\nconcurrency:\n {2}group: codeql-\$\{\{ github\.event_name == 'pull_request' && format\('pr-\{0\}', github\.event\.pull_request\.number\) \|\| github\.run_id \}\}\n {2}cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}\n/
  );
  const analyze = jobBlock(yml, 'analyze');
  assert.match(analyze, /\n {4}name: Analyze \(\$\{\{ matrix\.language \}\}\)\n {4}needs: scope\n/);
  // Skipped on an explicit false only: a failed or silent scope job leaves the analysis to run.
  assert.deepStrictEqual(analyze.match(/\n {4}if: .*/g), ["\n    if: ${{ !cancelled() && needs.scope.outputs.analyze != 'false' }}"]);
  const langs = /\n {8}language: \[([^\]]*)\]\n/.exec(analyze);
  assert.ok(langs, 'codeql.yml: the analyze matrix lists its languages');
  assert.deepStrictEqual(
    langs[1].split(',').map(s => s.trim()),
    LANGUAGES
  );
  assert.match(analyze, /\n {6}fail-fast: false\n/);
  assert.match(
    analyze,
    /uses: github\/codeql-action\/init@v\d+\n {8}with:\n {10}languages: \$\{\{ matrix\.language \}\}\n {10}build-mode: none\n/
  );
  assert.match(analyze, /uses: github\/codeql-action\/analyze@v\d+\n {8}with:\n {10}category: \/language:\$\{\{ matrix\.language \}\}\n$/);
  // The default query suite, results always uploaded, a failure never hidden.
  assert.doesNotMatch(yml, /queries:|config-file:|upload:|continue-on-error/);
  // Only the analysis may write security events.
  assert.deepStrictEqual(yml.match(/security-events: write/g), ['security-events: write']);
  assert.match(analyze, /\n {4}permissions:\n(?: {6}[\w-]+: read\n)* {6}security-events: write\n/);
});

test('codeql.yml: the scope job runs tools/codeql_scope.py and passes its answer on', () => {
  const scope = jobBlock(yml, 'scope');
  assert.match(scope, /\n {4}name: CodeQL scope\n/);
  assert.doesNotMatch(scope, /\n {4}(if|needs):/, 'the scope job runs on every run');
  assert.match(scope, /\n {6}analyze: \$\{\{ steps\.scope\.outputs\.analyze \}\}\n/);
  assert.match(scope, /\n {10}fetch-depth: 2\n/, "a PR's merge commit with both parents");
  assert.match(scope, /\n {10}sparse-checkout: \|\n {12}tools\/codeql_scope\.py\n {12}tools\/smoke_scope\.py\n/);
  assert.match(
    scope,
    /\n {10}BEFORE: \$\{\{ github\.event\.before \}\}\n {10}PR_HEAD: \$\{\{ github\.event\.pull_request\.head\.sha \}\}\n/
  );
  assert.match(scope, /\n {8}id: scope\n(?: {8}env:\n(?: {10}.*\n)*)? {8}run: python3 tools\/codeql_scope\.py\n/);
});

test('tools/codeql_scope.py EXEMPT: explicit docs and data, each matching real files, none of them code or config', () => {
  const files = execFileSync('git', ['ls-files', '-z'], {cwd: ROOT, encoding: 'utf8'}).split('\0').filter(Boolean);
  assert.ok(files.length > 1000, 'git ls-files listed the repository');
  const got = py(
    'import json, sys, codeql_scope as s\n' +
      'files = json.load(sys.stdin)\n' +
      'print(json.dumps({"exempt": list(s.EXEMPT), "matched": {p: [f for f in files if r.match(f)] for p, r in zip(s.EXEMPT, s.EXEMPT_RX)},' +
      ' "never": [f for f in files if s.NEVER.search(f)]}))',
    JSON.stringify(files)
  );
  const never = new Set(got.never);
  assert.ok(never.has('.github/workflows/checks.yml') && never.has('tools/smoke_scope.py') && never.has('app.js'));
  for (const p of got.exempt) {
    // A path, or a path whose wildcards end in a fixed, safe extension: never `docs/**`, never `**.md`.
    const wild = /\*/.test(p);
    assert.ok(!wild || SAFE_EXT.some(e => p.endsWith('*' + e)), `${p}: a wildcard must end in one of ${SAFE_EXT}`);
    assert.ok(!/^\*\*/.test(p), `${p}: not anywhere in the repository`);
    assert.ok(got.matched[p].length > 0, `${p} matches no file of the repository: drop it`);
    for (const f of got.matched[p]) {
      assert.ok(!never.has(f), `${f} (${p}): code, a workflow or a configuration file CodeQL reads`);
      assert.ok(f === 'LICENSE' || SAFE_EXT.includes(path.extname(f)), `${f} (${p}): not docs or data`);
      assert.ok(!f.startsWith('.github/') || f === '.github/pull_request_template.md', `${f}: under .github/`);
    }
  }
  // The docs directory holds studies with code: Markdown only is exempt there.
  assert.ok(files.some(f => /^docs\/.*\.py$/.test(f)) && !got.matched['docs/**.md'].some(f => !f.endsWith('.md')));
});

test('tools/codeql_scope.py: one path, then a change, exempt or analysed', () => {
  const cases = {
    'README.md': true,
    'AGENTS.md': true,
    'docs/rules/ship.md': true,
    'docs/reviews/a/b.md': true,
    '.github/pull_request_template.md': true,
    LICENSE: true,
    'judging/fish/a.json': true,
    'judging/FISH.md': true,
    'data/cand.json': true,
    'img/a-m.webp': true,
    'data.json': true,
    'curation.json': true,
    'tools/fish_refill.json': true,
    'docs/reviews/2026-11-24-ci-compute-cost/codeql.py': false,
    'docs/reviews/step3/rewrite.sh': false,
    'docs/reviews/a/depmap.js': false,
    'docs/reviews/a.csv': false,
    '.github/workflows/codeql.yml': false,
    '.github/dependabot.yml': false,
    '.github/actions/x/action.yml': false,
    'app.js': false,
    'index.html': false,
    'sw.js': false,
    'tools/codeql_scope.py': false,
    'tools/Code.gs': false,
    'tools/stack.json': false,
    'tools/requirements.txt': false,
    'tools/README.md': false,
    'tests/docs.test.js': false,
    '.prettierrc.json': false,
    '.claude/settings.json': false,
    'manifest.webmanifest': false,
    'fish.json': false,
    'judging/out/.gitkeep': false,
    'judging/x/package.json': false,
    'judging/x/tsconfig.json': false,
    'data/x/a.json': false,
    'img/a.svg': false,
    'img/x/a.webp': false,
    'docs/a.md/b.py': false,
    'LICENSE.txt': false,
    'docsx/a.md': false
  };
  const got = py(
    'import json, sys, codeql_scope as s; print(json.dumps({p: s.is_exempt(p) for p in json.load(sys.stdin)}))',
    JSON.stringify(Object.keys(cases))
  );
  assert.deepStrictEqual(got, cases);
  assert.deepStrictEqual(
    py(
      'import json, codeql_scope as s; print(json.dumps([s.classify([]), s.classify(["docs/a.md", "data.json"]), s.classify(["docs/a.md", "app.js"]), s.classify([".github/workflows/codeql.yml"])]))'
    ),
    [
      [true, []],
      [false, []],
      [true, ['app.js']],
      [true, ['.github/workflows/codeql.yml']]
    ]
  );
});

// The script as the job runs it, on a throwaway repository: GITHUB_OUTPUT, the notice and the summary.
test('tools/codeql_scope.py on real commits: a push to main, a PR merge, the weekly run', t => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'codeql-')),
    w = path.join(d, 'w');
  t.after(() => fs.rmSync(d, {recursive: true, force: true}));
  const git = (cwd, ...a) =>
    execFileSync('git', ['-C', cwd, '-c', 'user.name=T', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...a], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  const put = (f, text) => {
    fs.mkdirSync(path.dirname(path.join(w, f)), {recursive: true});
    fs.writeFileSync(path.join(w, f), text);
  };
  const commit = msg => {
    git(w, 'add', '-A');
    git(w, 'commit', '-q', '-m', msg);
    return git(w, 'rev-parse', 'HEAD');
  };
  const run = (cwd, env) => {
    const out = path.join(d, 'out'),
      sum = path.join(d, 'sum');
    fs.writeFileSync(out, '');
    fs.writeFileSync(sum, '');
    const stdout = execFileSync('python3', ['-B', SCRIPT], {
      cwd,
      encoding: 'utf8',
      env: {...process.env, BEFORE: '', PR_HEAD: '', GITHUB_REF: 'refs/heads/main', ...env, GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: sum}
    });
    const o = fs.readFileSync(out, 'utf8');
    assert.match(o, /^analyze=(true|false)\n$/);
    assert.match(fs.readFileSync(sum, 'utf8'), /^CodeQL: .+\n$/);
    const analyze = o === 'analyze=true\n';
    assert.strictEqual(/::notice title=CodeQL not run::/.test(stdout), !analyze, 'a notice exactly when not analysed');
    return analyze;
  };
  git(d, 'init', '-q', '-b', 'main', w);
  put('README.md', '# r\n');
  put('app.js', 'x = 1;\n');
  put('docs/a.md', 'a\n');
  put('data.json', '{}\n');
  put('tools/x.py', 'x = 1\n');
  const c0 = commit('c0');
  put('docs/a.md', 'b\n');
  put('data.json', '{"a": 1}\n');
  const docs = commit('docs and data');
  const push = (before, sha) => run(w, {GITHUB_EVENT_NAME: 'push', BEFORE: before, GITHUB_SHA: sha});
  assert.strictEqual(push(c0, docs), false, 'docs and data only: not analysed');
  put('README.md', '# s\n');
  put('app.js', 'x = 2;\n');
  const mixed = commit('mixed');
  assert.strictEqual(push(docs, mixed), true, 'docs and code: analysed');
  assert.strictEqual(push(c0, mixed), true, 'several commits in one push: the whole change');
  git(w, 'mv', 'tools/x.py', 'docs/x.md');
  const renamed = commit('rename');
  assert.strictEqual(push(mixed, renamed), true, 'a rename out of code counts its old side');
  put('docs/a.md', 'c\n');
  const docs2 = commit('docs');
  assert.strictEqual(push(renamed, docs2), false);
  assert.strictEqual(push(docs2, docs2), true, 'no change: unknown, analysed');
  assert.strictEqual(push('0'.repeat(40), docs2), true, 'no commit before the push');
  assert.strictEqual(push('', docs2), true);
  assert.strictEqual(push('f'.repeat(40), docs2), true, 'a commit that cannot be fetched');
  assert.strictEqual(run(w, {GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/other', BEFORE: renamed, GITHUB_SHA: docs2}), true);
  assert.strictEqual(run(w, {GITHUB_EVENT_NAME: 'schedule', GITHUB_SHA: docs2}), true, 'the weekly run: everything');
  assert.strictEqual(run(w, {GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_SHA: docs2}), true);

  // As on CI: a depth-1 clone without file contents, the commit before the push fetched by its id.
  const origin = path.join(d, 'origin.git'),
    s = path.join(d, 's');
  git(d, 'clone', '-q', '--bare', w, origin);
  git(origin, 'config', 'uploadpack.allowFilter', 'true');
  git(origin, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
  git(d, 'clone', '-q', '--depth=1', '--filter=blob:none', '--no-checkout', 'file://' + origin, s);
  assert.deepStrictEqual([git(s, 'rev-parse', '--is-shallow-repository'), git(s, 'rev-list', '--count', 'HEAD')], ['true', '1']);
  assert.strictEqual(run(s, {GITHUB_EVENT_NAME: 'push', BEFORE: renamed, GITHUB_SHA: docs2}), false, 'the commit before, fetched');
  assert.strictEqual(run(s, {GITHUB_EVENT_NAME: 'push', BEFORE: c0, GITHUB_SHA: docs2}), true);

  // A PR: GitHub's merge of its head into main; its first parent is main, its second the head.
  git(w, 'checkout', '-q', '-b', 'pr', docs2);
  put('docs/b.md', 'b\n');
  put('judging/fish/a.json', '[]\n');
  const head = commit('pr docs');
  git(w, 'checkout', '-q', 'main');
  put('app.js', 'x = 3;\n');
  commit('main moved');
  git(w, 'merge', '-q', '--no-ff', '-m', 'Merge', 'pr');
  const merge = git(w, 'rev-parse', 'HEAD');
  const pr = (sha, prHead) =>
    run(w, {GITHUB_EVENT_NAME: 'pull_request', GITHUB_REF: 'refs/pull/1/merge', GITHUB_SHA: sha, PR_HEAD: prHead});
  assert.strictEqual(pr(merge, head), false, "a docs and data PR: not analysed, main's own change left out");
  assert.strictEqual(pr(merge, docs2), true, 'the second parent is not the PR head: unknown');
  assert.strictEqual(pr(merge, ''), true);
  assert.strictEqual(pr(head, head), true, 'not a merge commit: unknown');
  git(w, 'checkout', '-q', 'pr');
  put('.github/workflows/codeql.yml', 'name: CodeQL\n');
  const head2 = commit('pr workflow');
  git(w, 'checkout', '-q', 'main');
  git(w, 'merge', '-q', '--no-ff', '-m', 'Merge', 'pr');
  assert.strictEqual(pr(git(w, 'rev-parse', 'HEAD'), head2), true, 'a workflow change: analysed');
});
