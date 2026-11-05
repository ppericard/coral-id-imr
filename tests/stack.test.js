// tools/stack_check.py (the stack's pins in tools/stack.json, Pierre 2026-11-05: the whole stack on the latest stable) and
// the brief's once-a-day stack line (tools/brief.py). --check runs on fixtures in a throwaway folder; --latest offline.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');

const ROOT = path.join(__dirname, '..'),
  TOOL = path.join(ROOT, 'tools', 'stack_check.py');
// Every request fails at once: a dead proxy, and no host let past it.
const OFFLINE = {...process.env, HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', NO_PROXY: '', no_proxy: ''};
const run = (args, env) =>
  spawnSync('python3', ['-B', TOOL, ...args], {cwd: ROOT, encoding: 'utf-8', env: env || process.env, timeout: 30000});
const py = (code, ...args) => {
  const r = spawnSync('python3', ['-B', '-c', 'import json, sys; sys.path.insert(0, "tools")\n' + code, ...args], {
    cwd: ROOT,
    encoding: 'utf-8'
  });
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

// A repository in a temporary folder: files (path -> text) and tools/stack.json with these items.
const repo = (files, items) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-'));
  for (const [f, text] of Object.entries({...files, 'tools/stack.json': JSON.stringify({items})})) {
    fs.mkdirSync(path.dirname(path.join(d, f)), {recursive: true});
    fs.writeFileSync(path.join(d, f), text);
  }
  return d;
};
const item = (id, version, pins, latest = {kind: 'npm', package: id}) => ({
  id,
  name: id,
  version,
  pins,
  latest,
  lookup: 'https://example.org'
});
const check = d => {
  const r = run(['--check', '--root', d]);
  fs.rmSync(d, {recursive: true, force: true});
  return r;
};

test('the repository is consistent with tools/stack.json', () => {
  const r = run(['--check']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /tools\/stack\.json: \d+ items, \d+ pins: consistent/);
});

test('--check: every match of a pattern must equal the version, in every file its globs name', () => {
  const files = {
    '.github/workflows/a.yml': "runs-on: ubuntu-latest\n  node-version: '26'\n",
    '.github/workflows/b.yml': "  node-version: '26'\n",
    'AGENTS.md': 'Run `npx --yes prettier@3.9.10 --check`. Prettier 3.3.3 once dropped array elements.\n'
  };
  const items = [
    item('node', '26', [{files: ['.github/workflows/*.yml'], pattern: "node-version: '{v}'", min: 2}], {kind: 'node-lts'}),
    item('prettier', '3.9.10', [{files: ['AGENTS.md'], pattern: 'prettier@{v}'}])
  ];
  const ok = check(repo(files, items));
  assert.strictEqual(ok.status, 0, ok.stdout);
  assert.match(ok.stdout, /2 items, 2 pins: consistent/);

  const bad = check(repo({...files, '.github/workflows/b.yml': "\n  node-version: '24'\n"}, items));
  assert.strictEqual(bad.status, 1, bad.stdout);
  assert.match(bad.stdout, /^node: \.github\/workflows\/b\.yml:2 has 24, tools\/stack\.json says 26$/m);

  // A pattern found fewer times than min (a pin moved or was renamed): the check fails rather than pass on nothing.
  const few = check(repo({...files, '.github/workflows/b.yml': 'nothing here\n'}, items));
  assert.strictEqual(few.status, 1, few.stdout);
  assert.match(few.stdout, /^node: "node-version: '\{v\}'" found 1 times in \.github\/workflows\/\*\.yml, at least 2 expected$/m);

  // A version bumped in tools/stack.json alone fails too.
  const ahead = check(repo(files, [items[0], item('prettier', '3.9.11', items[1].pins)]));
  assert.strictEqual(ahead.status, 1, ahead.stdout);
  assert.match(ahead.stdout, /^prettier: AGENTS\.md:1 has 3\.9\.10, tools\/stack\.json says 3\.9\.11$/m);
});

test('--check: also, optional, contains and lacks; a missing file, an unknown kind or a bad pattern fail', () => {
  const files = {
    'tools/a.py': "U = 'https://api.inaturalist.org/v1/taxa'\nV = 'https://api.inaturalist.org/v2/taxa'\n",
    'tools/r2_sync.sh': 'sudo apt-get install -y -qq rclone\n',
    'admin.js': "fetch('https://api.github.com/user')\n"
  };
  const good = [
    item('inat', 'v1', [{files: ['tools/*.py'], pattern: 'api.inaturalist.org/{v}/', also: ['v2'], min: 2}], {kind: 'inat-api'}),
    item('pillow', '13.0.0', [{files: ['tools/requirements.txt'], pattern: 'pillow=={v}', optional: true}], {
      kind: 'pypi',
      package: 'pillow'
    }),
    item('rclone', '1.60.1', [{files: ['tools/r2_sync.sh'], contains: 'apt-get install -y -qq rclone'}], {kind: 'rclone'}),
    item('gh', '2022-11-28', [{files: ['admin.js'], lacks: 'X-GitHub-Api-Version'}], {kind: 'github-api'})
  ];
  const ok = check(repo(files, good));
  assert.strictEqual(ok.status, 0, ok.stdout);

  const cases = [
    [
      {...files, 'tools/a.py': "U = 'https://api.inaturalist.org/v3/x'\nV = 'https://api.inaturalist.org/v1/y'\n"},
      good,
      /^inat: tools\/a\.py:1 has v3/m
    ],
    [
      {...files, 'tools/r2_sync.sh': 'RCLONE_VERSION=1.75.2\n'},
      good,
      /^rclone: 'apt-get install -y -qq rclone' not in tools\/r2_sync\.sh/m
    ],
    [{...files, 'admin.js': "h['X-GitHub-Api-Version'] = '2026-03-10'\n"}, good, /^gh: admin\.js now holds 'X-GitHub-Api-Version'/m],
    [
      files,
      [item('pillow', '13.0.0', [{files: ['tools/requirements.txt'], pattern: 'pillow=={v}'}])],
      /^pillow: tools\/requirements\.txt not found$/m
    ],
    [
      files,
      [item('x', '1', [{files: ['admin.js'], contains: 'api.github.com'}], {kind: 'nowhere'})],
      /^x: unknown latest kind 'nowhere'$/m
    ],
    [files, [item('x', '1', [{files: ['admin.js'], pattern: 'no version here'}])], /^x: bad pin/m]
  ];
  for (const [f, items, want] of cases) {
    const r = check(repo(f, items));
    assert.strictEqual(r.status, 1, r.stdout);
    assert.match(r.stdout, want);
  }
});

test('--latest never crashes without network: each item is reported as not looked up, exit 0', () => {
  const d = repo({}, [item('prettier', '3.9.10', [], {kind: 'npm', package: 'prettier'}), item('node', '26', [], {kind: 'node-lts'})]);
  try {
    const r = run(['--latest', '--root', d, '--timeout', '3'], OFFLINE);
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stderr, /Traceback/);
    assert.match(r.stdout, /^prettier +3\.9\.10 +\? +unknown +\w+/m);
    assert.match(r.stdout, /Stack: 2 items, 0 behind, 2 not looked up \(prettier, node\)/);
    const j = JSON.parse(run(['--latest', '--json', '--root', d, '--timeout', '3'], OFFLINE).stdout);
    assert.deepStrictEqual([j.checked, j.outdated, j.unknown], [2, [], ['prettier', 'node']]);
  } finally {
    fs.rmSync(d, {recursive: true, force: true});
  }
});

test('versions compared by major, minor or exactly', () => {
  const pairs = [
    ['26', '26', 'major'],
    ['24', '26', 'major'],
    ['3.12', '3.15', 'minor'],
    ['3.15', '3.15', 'minor'],
    ['1.64.1', '1.64.1', 'exact'],
    ['1.64.1', '1.65.0', 'exact'],
    ['1.66.0', '1.65.0', 'exact'],
    ['v25.04', 'v26.01', 'exact'],
    ['1.9.0', '1.10.0', 'exact']
  ];
  const got = py('import stack_check as s\nprint(json.dumps([s.compare(*c) for c in json.loads(sys.argv[1])]))', JSON.stringify(pairs));
  assert.deepStrictEqual(got, ['current', 'outdated', 'outdated', 'current', 'current', 'outdated', 'ahead', 'outdated', 'outdated']);
});

test("the brief's stack line: today's cached result, retried when stale; silent until the tool is on main; never raises", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'brief-stack-'));
  try {
    const out = py(
      `
import brief, time
day, now = '2026-11-05', time.time()
c = {'day': day, 't': now, 'outdated': ['rclone', 'python'], 'unknown': [], 'checked': 11}
fresh = [brief.stack_fresh(c, day, now), brief.stack_fresh(c, '2026-11-06', now),
         brief.stack_fresh(dict(c, unknown=['node']), day, now + 1800), brief.stack_fresh(dict(c, unknown=['node']), day, now + 7200),
         brief.stack_fresh(None, day, now)]
lines = [brief.stack_line(c, None), brief.stack_line(c, 'no answer in 3 s'), brief.stack_line(dict(c, outdated=[]), None),
         brief.stack_line(None, 'not on main'), brief.stack_line(None, 'URLError')]
# Not a git checkout: the refresh fails, yesterday's cached result comes back with the reason, at once.
brief.ROOT = sys.argv[1]
os = __import__('os'); os.makedirs(os.path.join(brief.ROOT, 'tools', '.cache'))
open(os.path.join(brief.ROOT, brief.STACK_CACHE), 'w').write(json.dumps(dict(c, day='2026-11-04')))
t = time.monotonic(); got = brief.stack_get(); spent = time.monotonic() - t
print(json.dumps({'fresh': fresh, 'lines': lines, 'got': got, 'fast': spent < brief.STACK_LIMIT}))
`,
      d
    );
    assert.deepStrictEqual(out.fresh, [true, false, true, false, false]);
    assert.deepStrictEqual(out.lines, [
      'Stack: 2 outdated: rclone, python (python3 tools/stack_check.py --latest)',
      'Stack: 2 outdated: rclone, python [as of 2026-11-05: no answer in 3 s] (python3 tools/stack_check.py --latest)',
      'Stack: 0 outdated (python3 tools/stack_check.py --latest)',
      null,
      'Stack: not checked (URLError): python3 tools/stack_check.py --latest'
    ]);
    assert.strictEqual(out.got[0].day, '2026-11-04');
    assert.strictEqual(out.got[1], 'not on main');
    assert.ok(out.fast);
  } finally {
    fs.rmSync(d, {recursive: true, force: true});
  }
});

// Codex review #587 (rule C7): the iNaturalist probes are paced (about one request a second, never parallel), a
// 429 or a 5xx is retried after a pause, and only a 404 means "no such version" (a transient error never makes an older
// version look like the latest).
test('the iNaturalist version probe is paced, retries 429/5xx after a pause, and trusts only a 404', () => {
  const out = py(`
import io, time, urllib.error, stack_check as s
s.INAT_PACE = 0.05
class Fake(s.Lookup):
    def __init__(self, codes):
        super().__init__(10)
        self.codes, self.calls = list(codes), []
    def get(self, url, accept='application/json'):
        self.calls.append((url.split('/')[3], time.monotonic()))
        code = self.codes.pop(0)
        if code != 200:
            raise urllib.error.HTTPError(url, code, 'x', {}, io.BytesIO(b''))
        return '{}'
res = []
for codes in ([200, 429, 404], [200, 503, 503], [200, 404]):
    lk = Fake(codes)
    try:
        got = s.inat_api(lk, {'from': 2})[0]
    except Exception as e:
        got = type(e).__name__
    gaps = [b[1] - a[1] for a, b in zip(lk.calls, lk.calls[1:])]
    res.append({'got': got, 'calls': [c[0] for c in lk.calls], 'paced': all(g >= s.INAT_PACE * 0.9 for g in gaps)})
print(json.dumps(res))
`);
  assert.deepStrictEqual(out, [
    {got: 'v2', calls: ['v2', 'v3', 'v3'], paced: true},
    {got: 'ValueError', calls: ['v2', 'v3', 'v3'], paced: true},
    {got: 'v2', calls: ['v2', 'v3'], paced: true}
  ]);
});
