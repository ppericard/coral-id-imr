'use strict';
require('./slot.js').testGuard();
// Exercise the actual commands in .claude/settings.json. A local bare origin lets the startup events see a stale
// or missing origin/main, including InstructionsLoaded before SessionStart, without calling GitHub or the sheet.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawn, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  HOOKS = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf-8')).hooks,
  FIX = 'git fetch origin +refs/heads/main:refs/remotes/origin/main',
  TOOLS = ['brief.py', 'guard_bash.py', 'agent_guard.py', 'issue_guard.py', 'instr_log.py'],
  ISSUE = '^mcp__.*[Ll]inear.*__save_issue$';

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
  loaded: command('InstructionsLoaded', 'instr_log.py'),
  subagent: command('SubagentStart', 'instr_log.py'),
  prompt: command('UserPromptSubmit', 'brief.py'),
  bash: command('PreToolUse', 'guard_bash.py', 'Bash'),
  agent: command('PreToolUse', 'agent_guard.py', 'Agent'),
  issue: command('PreToolUse', 'issue_guard.py', ISSUE)
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
function setup(t, legacy = false) {
  const top = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-')),
    src = path.join(top, 'src'),
    origin = path.join(top, 'origin.git'),
    clone = path.join(top, 'clone');
  t.after(() => fs.rmSync(top, {recursive: true, force: true}));
  fs.mkdirSync(path.join(src, 'tools'), {recursive: true});
  git(src, 'init', '-q', '-b', 'main');
  for (const t of TOOLS) fs.copyFileSync(path.join(ROOT, 'tools', t), path.join(src, 'tools', t));
  if (legacy) {
    fs.rmSync(path.join(src, 'tools', 'instr_log.py'));
    fs.writeFileSync(path.join(src, 'tools', 'brief.py'), 'print("Stale brief")\n');
  }
  fs.writeFileSync(path.join(src, 'AGENTS.md'), '# AGENTS.md\n\nCore v1: what every agent holds.\n');
  git(src, 'add', '.');
  git(src, 'commit', '-q', '-m', 'main');
  git(src, 'checkout', '-q', '-b', 'work');
  fs.writeFileSync(path.join(src, 'tools', 'guard_bash.py'), 'import sys\nsys.exit(0)\n');
  git(src, 'commit', '-q', '-am', 'a branch copy that lets everything through');
  execFileSync('git', ['clone', '-q', '--bare', src, origin]);
  execFileSync('git', ['clone', '-q', '--depth=1', '--single-branch', '--branch', 'work', 'file://' + origin, clone]);
  assert.ok(!hasMain(clone), 'the clone starts with no origin/main ref');
  return {top, src, origin, clone, log: path.join(top, 'instr.jsonl'), launches: path.join(top, 'launches.jsonl')};
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
  PATH: s.path ?? '/usr/bin:/bin'
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
const issueEv = JSON.stringify({tool_name: 'mcp__Linear__save_issue', tool_input: {team: 'REE', title: 'x', description: 'y'}});
const loadEv = (sid, file) =>
  JSON.stringify({hook_event_name: 'InstructionsLoaded', session_id: sid, file_path: file, load_reason: 'session_start'});
const startEv = (s, source = 'startup') => JSON.stringify({hook_event_name: 'SessionStart', session_id: 's1', cwd: s.clone, source});
const deny = r => {
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout).hookSpecificOutput.permissionDecision;
};

test('no origin/main ref, origin reachable: the startup hooks and guards fetch main and use its tools', t => {
  const s = setup(t);
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
  assert.strictEqual(deny(run(s, C.issue, issueEv)), 'deny', 'the issue guard refuses a new issue with no Searched: line');

  fresh();
  let r = run(s, C.loaded, loadEv('s1', path.join(s.clone, 'CLAUDE.md')));
  assert.strictEqual(r.status, 0, r.stderr);
  fresh();
  r = run(s, C.start, startEv(s));
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Manila /, 'the brief');
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
  assert.match(r.stdout, /^Manila .+origin\/main clock unavailable/);
  assert.ok(!hasMain(s.clone), 'the prompt clock is offline even without the ref');
});

test('an eager instruction load before SessionStart refreshes a stale shallow ref and preserves local work', t => {
  const s = setup(t, true);
  git(s.clone, 'fetch', '-q', 'origin', FIX.split(' ').at(-1));
  const ref = 'refs/remotes/origin/main';
  const old = git(s.clone, 'rev-parse', ref);
  git(s.src, 'checkout', '-q', 'main');
  for (const tool of ['brief.py', 'instr_log.py']) fs.copyFileSync(path.join(ROOT, 'tools', tool), path.join(s.src, 'tools', tool));
  git(s.src, 'add', 'tools');
  git(s.src, 'commit', '-qm', 'a newer brief and logger');
  git(s.src, 'tag', 'main-tag');
  const latest = git(s.src, 'rev-parse', 'HEAD');
  git(s.src, 'push', '-q', s.origin, 'main', 'main-tag');

  const staged = path.join(s.clone, 'AGENTS.md');
  fs.appendFileSync(staged, 'staged\n');
  git(s.clone, 'add', 'AGENTS.md');
  fs.appendFileSync(staged, 'unstaged\n');
  fs.writeFileSync(path.join(s.clone, 'notes.txt'), 'untracked\n');
  const snapshot = () => ({
    head: git(s.clone, 'symbolic-ref', 'HEAD'),
    commit: git(s.clone, 'rev-parse', 'HEAD'),
    index: git(s.clone, 'ls-files', '--stage'),
    status: git(s.clone, 'status', '--porcelain'),
    files: [staged, path.join(s.clone, 'notes.txt')].map(file => fs.readFileSync(file, 'utf8')),
    fetchHead: fs.readFileSync(path.join(s.clone, '.git', 'FETCH_HEAD'), 'utf8'),
    tags: git(s.clone, 'tag', '--list')
  });
  const before = snapshot();
  assert.strictEqual(git(s.clone, 'rev-parse', '--is-shallow-repository'), 'true');
  const loaded = run(s, C.loaded, loadEv('s1', staged));
  assert.strictEqual(loaded.status, 0, loaded.stderr);
  assert.strictEqual(git(s.clone, 'rev-parse', ref), latest);
  assert.deepStrictEqual(
    lines(s.log).map(row => row.ev),
    ['InstructionsLoaded']
  );
  assert.ok(lines(s.log)[0].sha, 'the loaded checkout file has a recorded hash');

  // SessionStart also checks for itself, even when InstructionsLoaded completed first.
  git(s.clone, 'update-ref', ref, old);
  const start = run(s, C.start, startEv(s, 'compact'));
  assert.strictEqual(start.status, 0, start.stderr);
  assert.match(start.stdout, /^Manila .* = remote main/m);
  assert.doesNotMatch(start.stdout, /Stale brief|instruction logging unavailable/);
  assert.strictEqual(git(s.clone, 'rev-parse', ref), latest);
  assert.deepStrictEqual(
    lines(s.log).map(row => row.ev),
    ['InstructionsLoaded', 'SessionStart']
  );
  assert.strictEqual(lines(s.log)[1].source, 'compact');
  assert.strictEqual(lines(s.log)[1].main, latest.slice(0, 9));
  assert.deepStrictEqual(snapshot(), before);
});

test('a slow fetch is cut off and startup reports unknown freshness with its cached revision', async t => {
  const s = setup(t, true);
  git(s.clone, 'fetch', '-q', 'origin', FIX.split(' ').at(-1));
  const bin = path.join(s.top, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'git'), '#!/bin/sh\nif [ "$3" = fetch ]; then sleep 30; exit 0; fi\nexec /usr/bin/git "$@"\n', {
    mode: 0o755
  });
  s.path = bin + ':/usr/bin:/bin';
  const began = Date.now();
  const [start, loaded] = await Promise.all([runAsync(s, C.start, startEv(s)), runAsync(s, C.loaded, loadEv('s1', 'x'))]);
  assert.ok(Date.now() - began < 10000, 'neither waits for the stalled child');
  assert.strictEqual(start.status, 0);
  assert.match(start.stdout, /remote freshness unknown \(fetch timed out; cached origin\/main: [0-9a-f]+\)/);
  assert.doesNotMatch(start.stdout, /Stale brief/);
  assert.strictEqual(loaded.status, 1);
  assert.match(loaded.stderr, /fetch timed out/);
  assert.deepStrictEqual(lines(s.log), []);
});

test('missing or unwritable instructions log is visible while the startup brief can still run', t => {
  const absent = setup(t, true);
  const missing = run(absent, C.loaded, loadEv('s1', 'x'));
  assert.strictEqual(missing.status, 1);
  assert.match(missing.stderr, /tools\/instr_log.py missing on origin\/main/);
  const startWithoutLogger = run(absent, C.start, startEv(absent));
  assert.strictEqual(startWithoutLogger.status, 0);
  assert.match(startWithoutLogger.stdout, /instruction logging unavailable/);

  const blocked = setup(t);
  fs.mkdirSync(blocked.log);
  const unwritable = run(blocked, C.loaded, loadEv('s1', 'x'));
  assert.strictEqual(unwritable.status, 1);
  assert.match(unwritable.stderr, /could not record hook event/);
  const start = run(blocked, C.start, startEv(blocked));
  assert.strictEqual(start.status, 0);
  assert.match(start.stdout, /instruction logging unavailable/);
  assert.match(start.stdout, /^Manila /m, 'still supplies the brief');
});

test('new and existing sessions get only the Manila clock on prompts, including technical notifications', t => {
  const existing = setup(t);
  run(existing, C.start, startEv(existing));
  const fresh = setup(t);
  const prompt = C.prompt.replace('--time;', '--time --at 15:02;');
  for (const [s, sid, text] of [
    [existing, 's1', '<task-notification>GitHub CI completed</task-notification>'],
    [fresh, 's2', 'A message in a new checkout'],
    [existing, 's3', 'A new session in the existing checkout']
  ]) {
    const r = run(s, prompt, JSON.stringify({hook_event_name: 'UserPromptSubmit', session_id: sid, prompt: text}));
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout.trim(), /^Manila [^\n]+$/);
    assert.doesNotMatch(r.stdout, /Night report|tools\/night.py/);
    assert.ok(!fs.existsSync(envOf(s).BRIEF_NIGHT_MARK));
  }
});

test('no origin/main ref, origin unreachable: the guards refuse, the brief and log report the failed refresh', async t => {
  const s = setup(t);
  git(s.clone, 'remote', 'set-url', 'origin', path.join(s.top, 'gone.git'));
  // Each failed fetch waits a second before its last look: the runs go at once.
  const allowed = JSON.stringify({tool_name: 'Agent', tool_input: {description: 'x', prompt: 'y', model: 'opus', effort: 'high'}});
  // Codex, #1220: the fix elsewhere in the event (a description) lets nothing through, nor a malformed event.
  const inDesc = JSON.stringify({tool_name: 'Bash', tool_input: {command: "python3 -c 'print(1)'", description: FIX}});
  const [sh, bash, fix, more, desc, bad, agent, issue, ...rest] = await Promise.all([
    runAsync(s, C.bash, bashEv('ls'), 'sh'),
    runAsync(s, C.bash, bashEv('ls'), 'bash'),
    runAsync(s, C.bash, bashEv(FIX)),
    runAsync(s, C.bash, bashEv(FIX + '; rm -rf x')),
    runAsync(s, C.bash, inDesc),
    runAsync(s, C.bash, '"' + FIX + '"'),
    runAsync(s, C.agent, allowed),
    runAsync(s, C.issue, JSON.stringify({tool_name: 'mcp__Linear__save_issue', tool_input: {id: 'REE-1', state: 'Done'}})),
    ...[C.loaded, C.subagent, C.start, C.prompt].map(c => runAsync(s, c, loadEv('s1', 'x')))
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
  assert.strictEqual(desc.status, 2, 'only in the command field');
  assert.strictEqual(bad.status, 2, 'a malformed event refuses');
  assert.strictEqual(agent.status, 2, 'the agent guard refuses even a launch it would allow');
  assert.ok(agent.stderr.includes(FIX));
  assert.strictEqual(issue.status, 2, 'the issue guard refuses even an update it would allow');
  assert.ok(issue.stderr.includes(FIX));

  for (const r of rest.slice(0, 2)) {
    assert.strictEqual(r.status, 1, 'the log fails visibly');
    assert.match(r.stderr, /Instructions log skipped: remote freshness unknown .*cached origin\/main: absent/);
  }
  assert.deepStrictEqual(lines(s.log), []);

  assert.strictEqual(rest[2].status, 0, 'never blocks the session');
  assert.match(rest[2].stdout, /^⚠ Session hooks: remote freshness unknown .*Brief and SessionStart instruction log skipped/);
  assert.match(rest[2].stdout, /Manila \w{3} \d\d \w{3} \d\d:\d\d/);
  assert.strictEqual(rest[3].status, 0, 'never blocks the prompt');
  assert.match(rest[3].stdout, /origin\/main clock unavailable/);
});

test('origin/main present offline: tool guards use the trusted ref and the startup hooks report unknown freshness', t => {
  const s = setup(t);
  git(s.clone, 'fetch', '-q', 'origin', '+refs/heads/main:refs/remotes/origin/main');
  git(s.clone, 'remote', 'set-url', 'origin', path.join(s.top, 'gone.git'));
  assert.match(fs.readFileSync(path.join(s.clone, 'tools', 'guard_bash.py'), 'utf-8'), /sys\.exit\(0\)/, "the branch's copy allows all");
  const began = Date.now();
  assert.strictEqual(deny(run(s, C.bash, bashEv("python3 -c 'print(1)'"))), 'deny', "main's copy refuses");
  assert.ok(Date.now() - began < 900, 'no fetch, no wait');
  assert.strictEqual(run(s, C.bash, bashEv('git status')).stdout, '', 'and allows the rest');
  // A tool not on main yet (a branch adding a hook): nothing runs, nothing is refused, until it is merged.
  const r = run(s, C.agent.split('agent_guard.py').join('new_guard.py'), agentEv);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout, '');
  const start = run(s, C.start, startEv(s));
  assert.match(start.stdout, /remote freshness unknown .*cached origin\/main: [0-9a-f]+/);
  assert.doesNotMatch(start.stdout, /Sheet script:|= remote main/);
  assert.match(run(s, C.loaded, loadEv('s1', 'x')).stderr, /Instructions log skipped: remote freshness unknown/);
  assert.deepStrictEqual(lines(s.log), []);
  const clock = run(s, C.prompt.split('--time').join('--not-on-main-yet'));
  assert.strictEqual(clock.status, 0, 'a clock failure does not block a prompt');
  assert.match(clock.stdout, /origin\/main clock unavailable/);
});

test('hooks fired at once in a checkout with no origin/main all take effect (one fetch wins the ref lock)', async t => {
  const s = setup(t);
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

test('the startup hooks select a revision before opening a tool and the guards fail closed', () => {
  const marker = 'R=$(select_main)';
  const starter = C.start.split(marker)[0];
  for (const c of [C.start, C.loaded, C.subagent]) {
    assert.ok(c.startsWith(starter + marker), 'the independent events use the same bootstrap');
    assert.match(c, /R=\$\(select_main\)[\s\S]+git show "\$R:tools\//);
    assert.match(c, /M=refs\/remotes\/origin\/main/);
    assert.match(c, /"\+refs\/heads\/main:" \+ sys\.argv\[1\]/);
  }
  assert.match(C.prompt, /git show refs\/remotes\/origin\/main:tools\/brief\.py/);
  assert.doesNotMatch(C.prompt, /fetch|--night-due/);
  for (const m of ['Bash', 'Agent', ISSUE]) {
    const h = HOOKS.PreToolUse.find(x => x.matcher === m).hooks[0];
    assert.strictEqual(h.onFailure, 'block', m + ': a guard that fails or times out blocks');
    assert.match(h.command, /python3 -I -c "\$S"/, m + ': the code with -c, the event on stdin');
  }
});
