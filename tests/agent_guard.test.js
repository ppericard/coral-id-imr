'use strict';
require('./slot.js').testGuard();
// tools/agent_guard.py, the agent-launch guard (AGENTS.md "The right model and effort for each task"; the rules core
// proposal's G5, with a log): a PreToolUse hook on the Agent tool refuses a launch without `model` or `effort` (a fork
// excepted), logs every launch in the git common dir, and tools/brief.py counts today's by model and effort. Also
// brief.py's line when this checkout's instructions differ from origin/main (the proposal's G13).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  {execFileSync, spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  TOOL = path.join(ROOT, 'tools', 'agent_guard.py'),
  SRC = fs.readFileSync(TOOL, 'utf-8');

const tmpLog = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-')), 'launches.jsonl');
const check = ti => {
  const r = spawnSync('python3', [TOOL, '--check', JSON.stringify(ti)], {encoding: 'utf-8', timeout: 10000});
  assert.ok(r.status === 0 || r.status === 1, r.stderr);
  return r.status === 1 ? r.stdout : '';
};
// As the hook runs it: main's copy given with -c, the event on stdin.
const hook = (input, log) => {
  const r = spawnSync('python3', ['-I', '-c', SRC], {input, env: {...process.env, AGENT_LOG: log}, encoding: 'utf-8', timeout: 10000});
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};
const launch = (ti, extra = {}) =>
  JSON.stringify({hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Agent', tool_input: ti, ...extra});
const readLog = f =>
  fs.existsSync(f)
    ? fs
        .readFileSync(f, 'utf-8')
        .trim()
        .split('\n')
        .map(l => JSON.parse(l))
    : [];

test('a launch needs both model and effort; the refusal names what is missing and the keys it saw', () => {
  const both = check({description: 'Fix', prompt: 'p'});
  assert.match(both, /sets no `model` nor `effort`/);
  assert.match(both, /Keys this launch carried: description, prompt\./);
  assert.match(check({description: 'Fix', prompt: 'p', model: 'sonnet'}), /sets no `effort`\./);
  assert.match(check({description: 'Fix', prompt: 'p', effort: 'high'}), /sets no `model`\./);
  assert.match(check({description: 'Fix', prompt: 'p', model: 'sonnet', effort: ''}), /sets no `effort`/);
  assert.strictEqual(check({description: 'Fix', prompt: 'p', model: 'sonnet', effort: 'medium'}), '');
  assert.strictEqual(check({description: 'Fix', prompt: 'p', model: 'opus', effort: 'high', subagent_type: 'Explore'}), '');
  // A fork runs on its parent's model and effort: both parameters are ignored there.
  assert.strictEqual(check({description: 'Fork', prompt: 'p', subagent_type: 'fork'}), '');
});

test('the hook: a deny with the reason, or nothing; every Agent launch logged, never its prompt', () => {
  const log = tmpLog();
  const d = hook(launch({description: 'Study the rules', prompt: 'SECRET PROMPT'}, {agent_id: 'agent-1', effort: {level: 'high'}}), log);
  assert.strictEqual(d.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.strictEqual(d.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(d.hookSpecificOutput.permissionDecisionReason, /docs\/INTEGRATOR\.md/);
  assert.strictEqual(hook(launch({description: 'Fix a test', prompt: 'p', model: 'sonnet', effort: 'medium'}), log), null);
  const [a, b] = readLog(log);
  assert.strictEqual(a.ok, false);
  assert.strictEqual(a.by, 'agent-1');
  assert.strictEqual(a.by_effort, 'high');
  assert.deepStrictEqual(a.keys, ['description', 'prompt']);
  assert.strictEqual(a.desc, 'Study the rules');
  assert.deepStrictEqual([b.ok, b.model, b.effort], [true, 'sonnet', 'medium']);
  assert.ok(!fs.readFileSync(log, 'utf-8').includes('SECRET PROMPT'), 'the prompt is never logged');
});

test('never blocks work by failing, and leaves other tools alone', () => {
  const log = tmpLog();
  assert.strictEqual(hook('not json', log), null);
  assert.strictEqual(hook('', log), null);
  assert.strictEqual(hook(JSON.stringify({tool_name: 'Bash', tool_input: {command: 'ls'}}), log), null);
  assert.deepStrictEqual(readLog(log), []);
  // A log that cannot be written changes nothing: the decision still comes.
  const d = hook(launch({description: 'x', prompt: 'p'}), '/nonexistent/dir/launches.jsonl');
  assert.strictEqual(d.hookSpecificOutput.permissionDecision, 'deny');
});

test('--report and the brief line: the day by model and effort, refusals counted, Manila day', () => {
  const log = tmpLog();
  const now = new Date();
  const t = new Date(now.getTime() - 60000).toISOString().replace(/\.\d+Z$/, '+00:00');
  const old = '2020-01-01T00:00:00+00:00';
  const rows = [
    {t, model: 'opus', effort: 'high', desc: 'design', ok: true},
    {t, model: 'opus', effort: 'high', desc: 'review', ok: true},
    {t, model: 'sonnet', effort: 'medium', desc: 'fix', ok: true},
    {t, type: 'fork', desc: 'fork', ok: true},
    {t, desc: 'no model', ok: false},
    {t: old, model: 'haiku', effort: 'low', ok: true}
  ];
  fs.writeFileSync(log, rows.map(r => JSON.stringify(r)).join('\n') + '\nnot json\n');
  const line = 'Agent launches today: 4 (opus/high 2, fork/- 1, sonnet/medium 1); 1 refused';
  const rep = execFileSync('python3', [TOOL, '--report'], {env: {...process.env, AGENT_LOG: log}, encoding: 'utf-8'});
  assert.ok(rep.includes(line), rep);
  assert.match(rep, /REFUSED -\/- no model/);
  const brief = execFileSync(
    'python3',
    ['-B', '-c', 'import sys; sys.path.insert(0, "tools"); import brief; print(brief.launches(None))'],
    {
      cwd: ROOT,
      env: {...process.env, AGENT_LOG: log},
      encoding: 'utf-8'
    }
  ).trim();
  assert.strictEqual(brief, line);
  const none = execFileSync('python3', ['-B', '-c', 'import sys; sys.path.insert(0, "tools"); import brief; print(brief.launches(None))'], {
    cwd: ROOT,
    env: {...process.env, AGENT_LOG: '/nonexistent/launches.jsonl'},
    encoding: 'utf-8'
  }).trim();
  assert.strictEqual(none, 'None', 'no log: no line, no error');
});

test("brief.py says when this checkout's instructions differ from origin/main, and is silent without origin/main", () => {
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 't',
    GIT_AUTHOR_EMAIL: 't@example.com',
    GIT_COMMITTER_NAME: 't',
    GIT_COMMITTER_EMAIL: 't@example.com'
  };
  const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], {env, encoding: 'utf-8'});
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'));
  git(d, 'init', '-q', '-b', 'work');
  fs.writeFileSync(path.join(d, 'AGENTS.md'), 'one\n');
  fs.writeFileSync(path.join(d, 'app.js'), 'one\n');
  git(d, 'add', '.');
  git(d, 'commit', '-q', '-m', 'one');
  const drift = () =>
    execFileSync(
      'python3',
      [
        '-B',
        '-c',
        'import sys; sys.path.insert(0, sys.argv[1]); import brief; brief.ROOT = sys.argv[2]; print(brief.drift())',
        path.join(ROOT, 'tools'),
        d
      ],
      {
        encoding: 'utf-8'
      }
    ).trim();
  assert.strictEqual(drift(), '[]', 'no origin/main: silent');
  git(d, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  fs.writeFileSync(path.join(d, 'app.js'), 'two\n');
  assert.strictEqual(drift(), '[]', 'only the instruction files count');
  fs.writeFileSync(path.join(d, 'AGENTS.md'), 'two\n');
  assert.strictEqual(drift(), "['AGENTS.md']");
});

test(".claude/settings.json runs main's copy of the guard before every Agent launch, with the event on stdin", () => {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf-8'));
  const pre = (s.hooks.PreToolUse || []).find(h => h.matcher === 'Agent');
  assert.ok(pre, 'a PreToolUse hook on Agent');
  const cmd = pre.hooks[0].command;
  assert.match(cmd, /python3 -I -c "\$\(git show origin\/main:tools\/agent_guard\.py 2>\/dev\/null\)"/);
  assert.match(cmd, /\|\| true$/, 'never blocks work by failing');
});
