'use strict';
require('./slot.js').testGuard();
// tools/instr_log.py, the instructions log of the rules core trial (docs/reviews/2026-11-19-rules-core-proposal.md §3;
// Q425 B): the InstructionsLoaded, SessionStart and SubagentStart hooks append to one log in the git common dir, the
// SubagentStart hook gives the subagent the Manila time and origin/main's core line, and --report says per agent what
// loaded and why. Each test builds its own repository with an origin/main ref: the real checkout is never read.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  TOOL = path.join(ROOT, 'tools', 'instr_log.py'),
  SRC = fs.readFileSync(TOOL, 'utf-8');

const CORE = '# AGENTS.md: the constitution\n\nCore v1: what every agent holds in every task. Each rule has a home.\n';
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@example.com',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@example.com'
};
const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], {env: gitEnv, encoding: 'utf-8'});
// A repository whose origin/main holds `agents` as AGENTS.md.
const repo = (agents = CORE) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'instr-'));
  git(d, 'init', '-q', '-b', 'work');
  fs.writeFileSync(path.join(d, 'AGENTS.md'), agents);
  fs.writeFileSync(path.join(d, 'CLAUDE.md'), '# CLAUDE.md\n\n@AGENTS.md\n');
  git(d, 'add', '.');
  git(d, 'commit', '-q', '-m', 'one');
  git(d, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  return d;
};
// As the hook runs it: main's copy given with -c, the event on stdin, CLAUDE_PROJECT_DIR the main checkout.
const hook = (dir, ev) => {
  const env = {...process.env, CLAUDE_PROJECT_DIR: dir};
  delete env.INSTR_LOG;
  const r = spawnSync('python3', ['-I', '-c', SRC], {
    input: typeof ev === 'string' ? ev : JSON.stringify(ev),
    env,
    encoding: 'utf-8',
    timeout: 10000
  });
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout.trim();
};
const logOf = dir =>
  fs
    .readFileSync(path.join(dir, '.git', 'claude-instructions.jsonl'), 'utf-8')
    .trim()
    .split('\n')
    .map(l => JSON.parse(l));
const run = (dir, ...a) => {
  const env = {...process.env, CLAUDE_PROJECT_DIR: dir};
  delete env.INSTR_LOG;
  return execFileSync('python3', [TOOL, ...a], {env, encoding: 'utf-8', timeout: 10000});
};

test('InstructionsLoaded: one record with the load reason and the copy that loaded (hash, core line)', () => {
  const d = repo();
  const out = hook(d, {
    hook_event_name: 'InstructionsLoaded',
    session_id: 's1',
    cwd: d,
    file_path: path.join(d, 'AGENTS.md'),
    memory_type: 'Project',
    load_reason: 'include',
    parent_file_path: path.join(d, 'CLAUDE.md')
  });
  assert.strictEqual(out, '', 'InstructionsLoaded output is discarded: the hook prints nothing');
  const [r] = logOf(d);
  assert.strictEqual(r.ev, 'InstructionsLoaded');
  assert.strictEqual(r.load_reason, 'include');
  assert.strictEqual(r.core, 'Core v1: what every agent holds in every task');
  assert.match(r.sha, /^[0-9a-f]{12}$/);
  assert.strictEqual(r.parent_file_path, path.join(d, 'CLAUDE.md'));
  assert.ok(!('aid' in r), 'the main agent has no agent_id');
});

test("a subagent's worktree logs into the main checkout's .git: one log for the session", () => {
  const d = repo();
  const wt = path.join(d, '.claude', 'worktrees', 'w1');
  git(d, 'worktree', 'add', '-q', '-b', 'w1', wt);
  hook(wt, {
    hook_event_name: 'InstructionsLoaded',
    session_id: 's1',
    agent_id: 'agent-7',
    agent_type: 'general-purpose',
    cwd: wt,
    file_path: path.join(d, '.claude', 'rules', 'sheet.md'),
    load_reason: 'path_glob_match',
    globs: ['**/tools/sync/**'],
    trigger_file_path: path.join(wt, 'tools', 'sync', 'Code.gs')
  });
  const [r] = logOf(d);
  assert.strictEqual(r.aid, 'agent-7');
  assert.deepStrictEqual(r.globs, ['**/tools/sync/**']);
  assert.ok(!fs.existsSync(path.join(wt, '.git', 'claude-instructions.jsonl')));
});

test('SessionStart: a record with the checkout and origin/main, and nothing printed into the session', () => {
  const d = repo();
  const out = hook(d, {hook_event_name: 'SessionStart', session_id: 's2', cwd: d, source: 'startup', model: 'claude-opus-5-5'});
  assert.strictEqual(out, '');
  const [r] = logOf(d);
  assert.strictEqual(r.source, 'startup');
  assert.strictEqual(r.head, r.main);
  assert.match(r.main, /^[0-9a-f]{9}$/);
});

test("SubagentStart: the subagent gets the Manila time and origin/main's core line; before the core, says none", () => {
  const ctx = dir => {
    const o = JSON.parse(hook(dir, {hook_event_name: 'SubagentStart', session_id: 's3', agent_id: 'a1', agent_type: 'Explore', cwd: dir}));
    assert.strictEqual(o.hookSpecificOutput.hookEventName, 'SubagentStart');
    return o.hookSpecificOutput.additionalContext;
  };
  const d = repo();
  const c = ctx(d);
  assert.match(c, /^Session hook \(tools\/instr_log\.py\): Manila time \w{3} \d\d \w{3} \d\d:\d\d \(Rule 0: AGENTS\.md\)/);
  assert.match(c, /the rules core on origin\/main: «Core v1: what every agent holds in every task»\.$/);
  assert.strictEqual(logOf(d)[0].atype, 'Explore');
  assert.match(ctx(repo('# AGENTS.md: the constitution\n\nRead first.\n')), /none yet \(AGENTS\.md before the core\)/);
});

test('never fails the session: bad input writes nothing and exits 0', () => {
  const d = repo();
  assert.strictEqual(hook(d, 'not json'), '');
  assert.strictEqual(hook(d, ''), '');
  assert.ok(!fs.existsSync(path.join(d, '.git', 'claude-instructions.jsonl')));
});

test('--report: per session and agent, what loaded and why; an empty log says the hooks did not run', () => {
  const d = repo();
  assert.match(run(d, '--report'), /No record: the hooks did not run here/);
  const wt = path.join(d, '.claude', 'worktrees', 'w2');
  hook(d, {hook_event_name: 'SessionStart', session_id: 'sess-abcdef12', cwd: d, source: 'startup'});
  hook(d, {
    hook_event_name: 'InstructionsLoaded',
    session_id: 'sess-abcdef12',
    cwd: d,
    file_path: path.join(d, 'CLAUDE.md'),
    load_reason: 'session_start'
  });
  hook(d, {
    hook_event_name: 'InstructionsLoaded',
    session_id: 'sess-abcdef12',
    cwd: d,
    file_path: path.join(d, 'AGENTS.md'),
    load_reason: 'include'
  });
  hook(d, {hook_event_name: 'SubagentStart', session_id: 'sess-abcdef12', agent_id: 'agent-x1', agent_type: 'general-purpose', cwd: d});
  hook(d, {
    hook_event_name: 'InstructionsLoaded',
    session_id: 'sess-abcdef12',
    agent_id: 'agent-x1',
    agent_type: 'general-purpose',
    cwd: d,
    file_path: path.join(d, 'docs', 'rules', 'sheet.md'),
    load_reason: 'path_glob_match',
    globs: ['**/tools/sync/**'],
    trigger_file_path: path.join(wt, 'tools', 'sync', 'Code.gs')
  });
  const out = run(d, '--report');
  assert.match(out, /^Session sess-abc \(startup, /m);
  assert.match(out, /^ {2}main agent: 2 files loaded$/m);
  assert.match(out, / CLAUDE\.md \(session_start; [0-9a-f]{12}\)$/m);
  assert.match(out, / AGENTS\.md \(include; Core v1: what every agent holds in every task; [0-9a-f]{12}\)$/m);
  assert.match(out, /^ {2}general-purpose agent-x1 \(SubagentStart given\): 1 file loaded$/m);
  assert.match(out, /docs\/rules\/sheet\.md \(path_glob_match; on worktree w2: tools\/sync\/Code\.gs; globs \*\*\/tools\/sync\/\*\*\)$/m);
  assert.match(run(d, '--report', '--since', '2999-01-01T00:00:00'), /No record since then/);
});

test('--expect: the texts the trial agents quote, read from a ref', () => {
  // The core's form: a bullet that names the rule, wrapped over two lines.
  const agents =
    '# AGENTS.md\n\nCore v1: what every agent holds in every task. More.\n\n## Rule 0\n\n> **After 17:30 (Manila time), the integrator\n> asks nothing.**\n\n' +
    '- **No two open PRs on the same sensitive file; two Codex rounds,\n  then cut the scope** (rule W27).\n- **Other** (rule W6).\n';
  const out = run(repo(agents), '--expect');
  assert.match(out, /^Rule 0: After 17:30 \(Manila time\), the integrator asks nothing\.$/m);
  assert.match(out, /^Core line: Core v1: what every agent holds in every task$/m);
  assert.match(
    out,
    /^W27 line: - \*\*No two open PRs on the same sensitive file; two Codex rounds, then cut the scope\*\* \(rule W27\)\.$/m
  );
  // Codex review #1209: the index's form, as AGENTS.md declares it before the core.
  const index = run(
    repo('# AGENTS.md\n\n## The rules\n\n- **W26** Every PR merges through a train.\n- **W27** Bounded cost: few agents.\n'),
    '--expect'
  );
  assert.match(index, /^W27 line: - \*\*W27\*\* Bounded cost: few agents\.$/m);
  assert.match(index, /^Core line: \(none: AGENTS\.md before the core\)$/m);
});

test("--expect on the repository's own AGENTS.md finds Rule 0 and rule W27", () => {
  const out = execFileSync('python3', [TOOL, '--expect', 'HEAD'], {
    cwd: ROOT,
    env: {...process.env, CLAUDE_PROJECT_DIR: ROOT},
    encoding: 'utf-8'
  });
  assert.match(out, /^Rule 0: After 17:30 /m);
  assert.match(out, /^W27 line: - \*\*.*W27/m);
});

test(".claude/settings.json runs main's copy of the log on InstructionsLoaded, SessionStart and SubagentStart", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf-8')).hooks;
  for (const ev of ['InstructionsLoaded', 'SessionStart', 'SubagentStart']) {
    const cmd = (hooks[ev] || []).flatMap(h => h.hooks.map(x => x.command)).find(c => c.includes('tools/instr_log.py'));
    assert.ok(cmd, ev + ' runs tools/instr_log.py');
    assert.match(cmd, /python3 -I -c "\$\(git show origin\/main:tools\/instr_log\.py 2>\/dev\/null\)"/, ev);
    assert.match(cmd, /\|\| true$/, ev + ': never fails the session');
  }
  const start = hooks.SessionStart.flatMap(h => h.hooks.map(x => x.command)).find(c => c.includes('instr_log'));
  assert.match(start, />\/dev\/null 2>&1/, "SessionStart's output would go into the session's context");
});
