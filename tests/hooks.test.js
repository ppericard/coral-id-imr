'use strict';
require('./slot.js').testGuard();
// The session hooks of .claude/settings.json in a checkout with no origin/main ref, as a cloud session cloned with one
// branch is: each hook runs only origin/main's copy of its tool (a branch never weakens a guard), fetches main first
// when the ref is missing, and is never a silent no-op: the guards refuse with the fix when main cannot be had, the
// brief says it in the session's context, the log fails visibly. The commands are read from settings.json, never
// retyped; "origin" is a local bare repository, never the network.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawn, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  HOOKS = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf-8')).hooks,
  FIX = 'git fetch origin +refs/heads/main:refs/remotes/origin/main',
  TOOLS = ['brief.py', 'guard_bash.py', 'agent_guard.py', 'instr_log.py'];

// The command of an event's hook (with a matcher, PreToolUse) that runs `tool`.
const command = (ev, tool, matcher) => {
  const c = HOOKS[ev]
    .filter(h => !matcher || h.matcher === matcher)
    .flatMap(h => h.hooks.map(x => x.command))
    .find(x => x.includes('tools/' + tool));
  assert.ok(c, ev + ' runs tools/' + tool);
  return c;
};
const C = {
  start: command('SessionStart', 'brief.py'),
  startLog: command('SessionStart', 'instr_log.py'),
  loaded: command('InstructionsLoaded', 'instr_log.py'),
  subagent: command('SubagentStart', 'instr_log.py'),
  prompt: command('UserPromptSubmit', 'brief.py'),
  bash: command('PreToolUse', 'guard_bash.py', 'Bash'),
  agent: command('PreToolUse', 'agent_guard.py', 'Agent')
};

const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@example.com',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@example.com'
};
const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], {env: gitEnv, encoding: 'utf-8'}).trim();
const hasMain = d => spawnSync('git', ['-C', d, 'rev-parse', '-q', '--verify', 'refs/remotes/origin/main']).status === 0;

// An origin whose main holds the four tools, and a branch `work` whose own guard_bash.py lets everything through; a
// clone of `work` alone (no origin/main ref), as a cloud session's checkout.
function setup() {
  const top = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-')),
    src = path.join(top, 'src'),
    origin = path.join(top, 'origin.git'),
    clone = path.join(top, 'clone');
  fs.mkdirSync(path.join(src, 'tools'), {recursive: true});
  git(src, 'init', '-q', '-b', 'main');
  for (const t of TOOLS) fs.copyFileSync(path.join(ROOT, 'tools', t), path.join(src, 'tools', t));
  fs.writeFileSync(path.join(src, 'AGENTS.md'), '# AGENTS.md\n\nCore v1: what every agent holds.\n');
  git(src, 'add', '.');
  git(src, 'commit', '-q', '-m', 'main');
  git(src, 'checkout', '-q', '-b', 'work');
  fs.writeFileSync(path.join(src, 'tools', 'guard_bash.py'), 'import sys\nsys.exit(0)\n');
  git(src, 'commit', '-q', '-am', 'a branch copy that lets everything through');
  execFileSync('git', ['clone', '-q', '--bare', src, origin]);
  execFileSync('git', ['clone', '-q', '--single-branch', '--branch', 'work', 'file://' + origin, clone]);
  assert.ok(!hasMain(clone), 'the clone starts with no origin/main ref');
  return {top, origin, clone, log: path.join(top, 'instr.jsonl'), launches: path.join(top, 'launches.jsonl')};
}

// The environment a hook gets: the checkout, the logs in the scratch directory, no network and no gh (rule D1).
const envOf = s => ({
  ...process.env,
  CLAUDE_PROJECT_DIR: s.clone,
  INSTR_LOG: s.log,
  AGENT_LOG: s.launches,
  BRIEF_NIGHT_MARK: path.join(s.top, 'night-mark'),
  HTTPS_PROXY: 'http://127.0.0.1:9',
  https_proxy: 'http://127.0.0.1:9',
  PATH: '/usr/bin:/bin'
});
const run = (s, cmd, input = '', shell = 'sh') =>
  spawnSync(shell, ['-c', cmd], {input, cwd: s.top, env: envOf(s), encoding: 'utf-8', timeout: 20000});
const runAsync = (s, cmd, input = '', shell = 'sh') =>
  new Promise(resolve => {
    const p = spawn(shell, ['-c', cmd], {cwd: s.top, env: envOf(s)});
    let stdout = '',
      stderr = '';
    p.stdout.on('data', b => (stdout += b));
    p.stderr.on('data', b => (stderr += b));
    p.on('close', status => resolve({status, stdout, stderr}));
    p.stdin.end(input);
  });
const lines = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse) : []);

const bashEv = command => JSON.stringify({tool_name: 'Bash', tool_input: {command}});
const agentEv = JSON.stringify({tool_name: 'Agent', tool_input: {description: 'x', prompt: 'y'}});
const loadEv = (sid, file) =>
  JSON.stringify({hook_event_name: 'InstructionsLoaded', session_id: sid, file_path: file, load_reason: 'session_start'});
const deny = r => {
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout).hookSpecificOutput.permissionDecision;
};

test('no origin/main ref, origin reachable: each hook fetches main and runs its copy, with its effect', () => {
  const s = setup();
  const fresh = () => spawnSync('git', ['-C', s.clone, 'update-ref', '-d', 'refs/remotes/origin/main']);
  for (const shell of ['sh', 'bash']) {
    fresh();
    assert.strictEqual(deny(run(s, C.bash, bashEv("python3 -c 'print(1)'"), shell)), 'deny', shell + ': the Bash guard refuses');
    assert.ok(hasMain(s.clone), shell + ': the hook fetched origin/main');
  }
  fresh();
  assert.strictEqual(deny(run(s, C.agent, agentEv)), 'deny', 'the agent guard refuses a launch with no model nor effort');
  assert.strictEqual(lines(s.launches).length, 1, 'and logs it');

  fresh();
  let r = run(s, C.loaded, loadEv('s1', path.join(s.clone, 'CLAUDE.md')));
  assert.strictEqual(r.status, 0, r.stderr);
  fresh();
  r = run(s, C.startLog, JSON.stringify({hook_event_name: 'SessionStart', session_id: 's1', cwd: s.clone, source: 'startup'}));
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout, '', "SessionStart's log prints nothing into the session");
  fresh();
  r = run(s, C.subagent, JSON.stringify({hook_event_name: 'SubagentStart', session_id: 's1', agent_id: 'a1', agent_type: 'Explore'}));
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /Manila time .*«Core v1: what every agent holds»/);
  const rec = lines(s.log);
  assert.deepStrictEqual(
    rec.map(x => x.ev),
    ['InstructionsLoaded', 'SessionStart', 'SubagentStart']
  );
  assert.ok(rec[1].main, 'the SessionStart record names origin/main');

  fresh();
  r = run(s, C.prompt);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Manila /, 'the time line');
  fresh();
  r = run(s, C.start);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Manila /, 'the brief');
});

test('no origin/main ref, origin unreachable: the guards refuse with the fix, the brief and the log say it', async () => {
  const s = setup();
  git(s.clone, 'remote', 'set-url', 'origin', path.join(s.top, 'gone.git'));
  // Each failed fetch waits a second before its last look: the runs go at once.
  const allowed = JSON.stringify({tool_name: 'Agent', tool_input: {description: 'x', prompt: 'y', model: 'opus', effort: 'high'}});
  const [sh, bash, fix, more, agent, ...rest] = await Promise.all([
    runAsync(s, C.bash, bashEv('ls'), 'sh'),
    runAsync(s, C.bash, bashEv('ls'), 'bash'),
    runAsync(s, C.bash, bashEv(FIX)),
    runAsync(s, C.bash, bashEv(FIX + '; rm -rf x')),
    runAsync(s, C.agent, allowed),
    ...[C.loaded, C.startLog, C.subagent, C.start, C.prompt].map(c => runAsync(s, c, loadEv('s1', 'x')))
  ]);
  for (const [shell, r] of [
    ['sh', sh],
    ['bash', bash]
  ]) {
    assert.strictEqual(r.status, 2, shell + ': exit 2 blocks the call');
    assert.ok(r.stderr.includes(FIX), shell + ': the refusal gives the fix');
    assert.strictEqual(r.stdout, '');
  }
  assert.strictEqual(fix.status, 0, 'the fix itself goes through');
  assert.strictEqual(fix.stdout, '');
  assert.strictEqual(more.status, 2, 'only the fix, exactly');
  assert.strictEqual(agent.status, 2, 'the agent guard refuses even a launch it would allow');
  assert.ok(agent.stderr.includes(FIX));

  for (const r of rest.slice(0, 3)) {
    assert.strictEqual(r.status, 1, 'the log fails visibly');
    assert.ok(r.stderr.includes(FIX));
  }
  assert.deepStrictEqual(lines(s.log), []);

  for (const r of rest.slice(3)) {
    assert.strictEqual(r.status, 0, 'never blocks the session or the prompt');
    assert.match(r.stdout, /^⚠ Session hooks: .*no origin\/main ref/);
    assert.ok(r.stdout.includes(FIX), 'the fix, in the context');
    assert.match(r.stdout, /Manila \w{3} \d\d \w{3} \d\d:\d\d/, 'and still the Manila time (Rule 0)');
  }
});

test("origin/main present: main's copy runs, never the branch's, and nothing is fetched", () => {
  const s = setup();
  git(s.clone, 'fetch', '-q', 'origin', '+refs/heads/main:refs/remotes/origin/main');
  git(s.clone, 'remote', 'set-url', 'origin', path.join(s.top, 'gone.git'));
  assert.match(fs.readFileSync(path.join(s.clone, 'tools', 'guard_bash.py'), 'utf-8'), /sys\.exit\(0\)/, "the branch's copy allows all");
  const t = Date.now();
  assert.strictEqual(deny(run(s, C.bash, bashEv("python3 -c 'print(1)'"))), 'deny', "main's copy refuses");
  assert.ok(Date.now() - t < 900, 'no fetch, no wait');
  assert.strictEqual(run(s, C.bash, bashEv('git status')).stdout, '', 'and allows the rest');
  // A tool not on main yet (a branch adding a hook): nothing runs, nothing is refused, until it is merged.
  const r = run(s, C.agent.split('agent_guard.py').join('new_guard.py'), agentEv);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout, '');
});

test('hooks fired at once in a checkout with no origin/main all take effect (one fetch wins the ref lock)', async () => {
  const s = setup();
  const rs = await Promise.all(
    [1, 2, 3, 4]
      .map(i => runAsync(s, C.loaded, loadEv('s1', path.join(s.clone, 'f' + i + '.md'))))
      .concat([runAsync(s, C.bash, bashEv("python3 -c 'print(1)'"))])
  );
  assert.deepStrictEqual(
    rs.map(r => r.status),
    [0, 0, 0, 0, 0]
  );
  assert.strictEqual(lines(s.log).length, 4, 'four records');
  assert.strictEqual(JSON.parse(rs[4].stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('every hook runs a tool from origin/main only, fetches it when missing, and the guards fail closed', () => {
  for (const [name, c] of Object.entries(C)) {
    assert.match(c, /git show "origin\/main:\$F"/, name);
    assert.ok(c.includes('"+refs/heads/main:$M"') && c.includes('M=refs/remotes/origin/main'), name + ': the explicit refspec');
    assert.ok(!/HEAD:|python3[^|;]* tools\//.test(c), name + ": never the checkout's copy");
    assert.ok(!/\|\| true\b/.test(c), name + ': no failure swallowed');
  }
  for (const m of ['Bash', 'Agent']) {
    const h = HOOKS.PreToolUse.find(x => x.matcher === m).hooks[0];
    assert.strictEqual(h.onFailure, 'block', m + ': a guard that fails or times out blocks');
    assert.match(h.command, /python3 -I -c "\$S"/, m + ': the code with -c, the event on stdin');
  }
});
