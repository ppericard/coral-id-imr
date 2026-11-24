'use strict';
require('./slot.js').testGuard();
// REE-279: the step of .github/workflows/pages.yml that waits, bounded and logged, until the run lists its `github-pages`
// artifact before deploy-pages (docs/PAGES.md "The artifact wait"). The step's own script runs here under bash, with `gh`,
// `date` and `sleep` replaced by shims on a fake clock: no network, no real wait (rule D1).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {spawnSync} = require('child_process');

const YML = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'pages.yml'), 'utf8');
const NAME = 'Wait until the run lists its Pages artifact (bounded, logged)';
const at = s => YML.indexOf(s);

// The step's `run:` script, from its block (the lines indented by 10 spaces under `run: |`).
function script() {
  const from = at('- name: ' + NAME);
  assert.ok(from > 0, 'the wait step is missing from pages.yml');
  const rest = YML.slice(from),
    next = rest.indexOf('\n      - ', 1),
    step = next < 0 ? rest : rest.slice(0, next),
    m = /\n {8}run: \|\n([\s\S]*)$/.exec(step);
  assert.ok(m, 'the wait step has no run block');
  return m[1]
    .split('\n')
    .map(l => l.replace(/^ {10}/, ''))
    .join('\n');
}

// Runs the script as the runner does (`bash -e`) with shims. `replies`: what each successive `gh` call does: a number is the
// listing's total_count, 'fail' is a call that exits 1 with an error text. The last reply repeats.
function run(replies) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pageswait-')),
    bin = path.join(d, 'bin');
  fs.mkdirSync(bin);
  const sh = (name, body) => fs.writeFileSync(path.join(bin, name), '#!/bin/bash\n' + body, {mode: 0o755});
  fs.writeFileSync(path.join(d, 'clock'), '1000000');
  fs.writeFileSync(path.join(d, 'replies'), replies.join('\n'));
  fs.writeFileSync(path.join(d, 'calls'), '');
  // The fake clock moves only by sleep: `date +%s%3N` reads it.
  sh('date', `cat "${d}/clock"\n`);
  sh('sleep', `echo $(( $(cat "${d}/clock") + $1 * 1000 )) > "${d}/clock"\n`);
  sh(
    'gh',
    `echo "$*" >> "${d}/calls"\nn=$(wc -l < "${d}/calls")\nr=$(sed -n "\${n}p" "${d}/replies")\n` +
      `[ -z "$r" ] && r=$(tail -n 1 "${d}/replies")\n` +
      `if [ "$r" = fail ]; then echo "HTTP 502: Bad Gateway" >&2; exit 1; fi\n` +
      // A request that stalls: 20 s of the fake clock go by, and it blocks for real until `timeout` cuts it.
      `if [ "$r" = hang ]; then echo $(( $(cat "${d}/clock") + 20000 )) > "${d}/clock"; exec /bin/sleep 30; fi\necho "$r"\n`
  );
  const summary = path.join(d, 'summary');
  const r = spawnSync('bash', ['-e', '-c', script()], {
    env: {
      PATH: bin + ':' + process.env.PATH,
      GH_TOKEN: 'ghs_FAKE',
      GITHUB_REPOSITORY: 'o/r',
      GITHUB_RUN_ID: '42',
      GITHUB_STEP_SUMMARY: summary,
      PAGES_WAIT_REQUEST_S: '1' // the cut of one request, 10 s in the workflow: kept short so a stalled call is cut in a second
    },
    encoding: 'utf8',
    timeout: 30000
  });
  const calls = fs.readFileSync(path.join(d, 'calls'), 'utf8').split('\n').filter(Boolean);
  const sum = fs.existsSync(summary) ? fs.readFileSync(summary, 'utf8') : '';
  fs.rmSync(d, {recursive: true, force: true});
  return {status: r.status, out: r.stdout, err: r.stderr, calls, summary: sum};
}

test('the wait step sits between the upload and deploy-pages, with the one permission it needs', () => {
  const up = at('uses: actions/upload-pages-artifact@'),
    wait = at('- name: ' + NAME),
    dep = at('uses: actions/deploy-pages@');
  assert.ok(up > 0 && wait > up && dep > wait, 'upload, then the wait, then deploy-pages');
  assert.match(YML, /permissions:\n {2}contents: read\njobs:/, 'the workflow-level permissions stay contents: read');
  const job = /\n {4}permissions:\n((?: {6}[^\n]*\n)+)/.exec(YML);
  assert.ok(job, 'the job-level permissions');
  assert.deepStrictEqual(
    job[1]
      .split('\n')
      .filter(l => /^ {6}[a-z-]+:/.test(l))
      .map(l => l.trim()),
    ['contents: read', 'pages: write', 'id-token: write', 'actions: read'],
    'actions: read added, nothing broader'
  );
  const s = script();
  assert.match(s, /actions\/runs\/\$GITHUB_RUN_ID\/artifacts\?name=github-pages/);
  assert.match(s, /limit=60000/, 'at most 60 s');
  const code = YML.replace(/^\s*#.*$/gm, '');
  assert.strictEqual(code.match(/continue-on-error/g).length, 1, 'only the first deploy attempt may fail without failing the job');
  assert.ok(!/gh run rerun|run rerun|workflow run|retry/i.test(s), 'the wait never re-runs or retries the deploy');
});

// REE-279, the integrator's call: deploy-pages v5 reads the results service once and failed on about half the runs; one
// bounded second attempt inside the same run, after a logged pause, only when the first failed.
test('the deploy: a first attempt that may fail, one logged second attempt, the job and the page URL from whichever worked', () => {
  const code = YML.replace(/^\s*#.*$/gm, ''),
    steps = code.split(/\n {6}- /).map(s => '- ' + s),
    byName = n => steps.find(s => s.startsWith('- name: ' + n) || s.startsWith('- uses: ' + n));
  const first = byName('Deploy to GitHub Pages\n'),
    pause = byName('First deploy attempt failed'),
    second = byName('Deploy to GitHub Pages (second attempt)'),
    stage = byName('Stage the static site');
  assert.ok(first && pause && second && stage, 'the four steps exist');
  const order = [stage, first, pause, second].map(s => code.indexOf(s.slice(0, 40)));
  assert.deepStrictEqual(
    order,
    [...order].sort((a, b) => a - b),
    'staging, first attempt, pause, second attempt, in that order'
  );
  assert.ok(at('- name: ' + NAME) < at('- name: Deploy to GitHub Pages\n'), 'the wait stays before the first attempt (the measurement)');
  assert.match(first, /id: deployment\n/);
  assert.match(first, /continue-on-error: true/);
  assert.match(first, /uses: actions\/deploy-pages@v5/);
  const FAILED = "if: steps.deployment.outcome == 'failure'";
  assert.ok(pause.includes(FAILED) && second.includes(FAILED), 'both only when the first attempt failed');
  assert.match(pause, /::warning title=pages-deploy-second-attempt::The first deploy-pages attempt failed .*Found 0 artifact\(s\)/);
  assert.match(pause, /\n {10}sleep 20\n?$/, 'a pause of 20 s after the warning');
  assert.ok(pause.indexOf('::warning') < pause.indexOf('sleep 20'), 'said before it waits');
  assert.match(second, /id: deployment_second\n/);
  assert.match(second, /uses: actions\/deploy-pages@v5/, 'the same action as the first attempt');
  assert.ok(!/continue-on-error/.test(second), 'a second failure fails the job');
  assert.strictEqual(first.match(/timeout: \d+/)[0], second.match(/timeout: \d+/)[0], 'the same inputs');
  assert.match(
    code,
    /url: \$\{\{ steps\.deployment_second\.outputs\.page_url \|\| steps\.deployment\.outputs\.page_url \}\}/,
    'the page URL of whichever attempt deployed'
  );
  assert.strictEqual(code.match(/uses: actions\/deploy-pages@/g).length, 2, 'two attempts, no more');
  assert.ok(code.lastIndexOf('uses: actions/deploy-pages@') > code.indexOf('id: deployment_second'), 'nothing deploys after the second');
  // Health's reading of what the deploy archived is unchanged: recorded at staging, before either attempt.
  assert.match(stage, /echo "::notice title=published-source::\$\(git rev-parse HEAD\)"/);
});

test('the wait: listed at once, listed late, never listed, and a failing call is an attempt not a crash', () => {
  const now = run([1]);
  assert.strictEqual(now.status, 0);
  assert.strictEqual(now.calls.length, 1);
  assert.match(now.out, /attempt 1, sent at \+0 ms, answered at \+0 ms after the upload step: 1 artifact\(s\) named github-pages listed/);
  assert.match(now.out, /::notice title=pages-artifact-lag::listed at attempt 1 \(call sent at \+0 ms, answered at \+0 ms\)/);
  assert.match(now.summary, /Artifact listed at attempt 1 \(call sent at \+0 ms, answered at \+0 ms after the upload step\)/);
  assert.match(now.calls[0], /^api repos\/o\/r\/actions\/runs\/42\/artifacts\?name=github-pages --jq \.total_count$/);

  const late = run([0, 0, 1]);
  assert.strictEqual(late.status, 0);
  assert.strictEqual(late.calls.length, 3);
  assert.match(late.out, /attempt 1, sent at \+0 ms, answered at \+0 ms .*: 0 artifact/);
  assert.match(late.out, /attempt 2, sent at \+2000 ms, answered at \+2000 ms .*: 0 artifact/);
  assert.match(
    late.out,
    /::notice title=pages-artifact-lag::listed at attempt 3 \(call sent at \+4000 ms, answered at \+4000 ms\)/,
    'the lag is printed, not hidden'
  );

  const hiccup = run(['fail', 'fail', 1]);
  assert.strictEqual(hiccup.status, 0, 'an API error is one more attempt');
  assert.match(hiccup.out, /attempt 1: the listing call failed: HTTP 502/);
  assert.match(hiccup.out, /listed at attempt 3 \(call sent at \+4000 ms/);

  const never = run([0]);
  assert.strictEqual(never.status, 1, 'it fails loudly');
  assert.strictEqual(never.calls.length, 31, 'every 2 s up to 60 s: attempts at 0, 2, ..., 60 s, then it stops');
  assert.match(never.out, /attempt 31, sent at \+60000 ms/);
  assert.match(
    never.out,
    /::error title=pages-artifact-lag::the run listed no github-pages artifact 60 s after the upload step \(31 attempts, 31 answered\)/
  );
  assert.strictEqual(never.summary, '');

  const down = run(['fail']);
  assert.strictEqual(down.status, 1, 'a listing that never answers fails after the bound, not before');
  assert.strictEqual(down.calls.length, 31);
  assert.match(
    down.out,
    /::error title=pages-artifact-lag::the artifact listing never answered in 60 s \(31 attempts; last error: HTTP 502: Bad Gateway\)/,
    'a dead listing is not reported as an artifact that was not listed'
  );
  assert.doesNotMatch(down.out, /the run listed no github-pages artifact/);

  // Codex, PR #1547: a request that stalls must not outlast the 60 s. Each call is cut by `timeout`, the attempt is counted,
  // and the loop reaches its deadline check (the stalled calls take 20 s of the fake clock each).
  const stall = run(['hang']);
  assert.strictEqual(stall.status, 1);
  assert.strictEqual(stall.calls.length, 3, '0, 22, 44 s: then the next check is past the bound');
  assert.match(stall.out, /attempt 1: the listing call failed: no answer in 1 s/);
  assert.match(
    stall.out,
    /::error title=pages-artifact-lag::the artifact listing never answered in 60 s \(3 attempts; last error: no answer in 1 s\)/
  );
  const slow = run(['hang', 1]);
  assert.strictEqual(slow.status, 0, 'a stalled call is one attempt, the next one lists the artifact');
  assert.match(slow.out, /listed at attempt 2 \(call sent at \+22000 ms/);
  assert.match(script(), /timeout "\$secs" gh api/, 'every call is cut');
});
