'use strict';
require('./slot.js').testGuard();
// tools/issue_guard.py, the issue guard (docs/INTEGRATOR.md "Questions and corrections"; REE-251): a PreToolUse hook
// on the Linear MCP tool that saves issues refuses a new issue whose description has no `Searched: <what> — <found>`
// line; an update (with `id`) and every other tool pass.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  {spawnSync} = require('child_process');
const ROOT = path.join(__dirname, '..'),
  TOOL = path.join(ROOT, 'tools', 'issue_guard.py'),
  SRC = fs.readFileSync(TOOL, 'utf-8'),
  MATCHER = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf-8')).hooks.PreToolUse.find(h =>
    h.hooks.some(x => x.command.includes('tools/issue_guard.py'))
  ).matcher;

const check = ti => {
  const r = spawnSync('python3', [TOOL, '--check', JSON.stringify(ti)], {encoding: 'utf-8', timeout: 10000});
  assert.ok(r.status === 0 || r.status === 1, r.stderr);
  return r.status === 1 ? r.stdout : '';
};
// As the hook runs it: main's copy given with -c, the event on stdin.
const hook = input => {
  const r = spawnSync('python3', ['-I', '-c', SRC], {input, encoding: 'utf-8', timeout: 10000});
  assert.strictEqual(r.status, 0, r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};
const save = (ti, tool = 'mcp__Linear__save_issue') =>
  JSON.stringify({hook_event_name: 'PreToolUse', session_id: 's1', tool_name: tool, tool_input: ti});
const LINE = 'Searched: Linear "expert" (incl. Backlog, Done), ANSWERS.md, ROADMAP, Drive — REE-191, REE-112 found';
const issue = description => ({team: 'REE', title: 'A new idea', description});

test('a new issue needs a Searched: line naming what was searched and, after a dash, what was found', () => {
  assert.strictEqual(check(issue('Some context.\n\n' + LINE + '\n')), '');
  assert.strictEqual(check(issue('Context.\n\nsearched: docs/ANSWERS.md for any of expert — 0 hits')), '', "asked.py's own line");
  assert.strictEqual(check(issue('- **Searched:** Linear "pace", ROADMAP -> nothing found')), '', 'a list item in bold');
  assert.strictEqual(check(issue('Searched: Linear "pace", ROADMAP - nothing found')), '');
  assert.strictEqual(check(issue('Searched: Linear "pace"—REE-191')), '', 'an em dash without spaces');
  assert.strictEqual(check(issue('Context.\n\n+++ Agent notes\n\n' + LINE + '\n\n+++')), '', 'inside the agent notes');

  const none = check(issue('Just an idea.'));
  assert.match(none, /no line starting `Searched:`/);
  for (const where of [
    /Backlog, Done and Duplicate/,
    /docs\/ANSWERS\.md/,
    /docs\/ROADMAP\.md/,
    /docs\/reviews\//,
    /Drive Reef_ID/,
    /fold this into it/
  ]) {
    assert.match(none, where, 'the refusal says ' + where);
  }
  assert.match(check(issue('Searched: Linear, ROADMAP')), /after a dash, what was found .*Searched: Linear, ROADMAP/);
  assert.match(check(issue('Searched: REE-191')), /what was found/, 'a hyphen inside a word is not the dash');
  assert.match(check(issue('Searched: — REE-191')), /what was found/, 'nothing named as searched');
  assert.match(check(issue('Searched: Linear —   ')), /what was found/, 'nothing named as found');
  assert.match(check(issue('We searched: Linear — nothing')), /no line starting/, 'only at the start of a line');
  assert.match(check({team: 'REE', title: 'x'}), /has no description/);
  assert.match(check({team: 'REE', template: 'Idea'}), /has no description/, 'a template body does not say what was searched');
  assert.match(check(issue('   ')), /has no description/);
});

test('an update passes, whatever it carries', () => {
  assert.strictEqual(check({id: 'REE-251', description: 'No search line here'}), '');
  assert.strictEqual(check({id: 'REE-251', state: 'Done'}), '');
  assert.strictEqual(check({id: 'REE-251', patch: [{op: 'append', text: 'x'}]}), '');
  assert.match(check({id: '', team: 'REE', title: 'x', description: 'y'}), /no line starting/, 'an empty id creates');
});

test('the hook: a deny with the reason on save_issue of any Linear server, nothing for other tools or on failure', () => {
  const d = hook(save(issue('No search.')));
  assert.strictEqual(d.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.strictEqual(d.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(d.hookSpecificOutput.permissionDecisionReason, /tools\/issue_guard\.py/);
  assert.strictEqual(hook(save(issue(LINE))), null);
  assert.strictEqual(hook(save({id: 'REE-1', description: 'x'})), null);
  for (const t of ['mcp__claude_ai_Linear__save_issue', 'mcp__plugin_linear_linear__save_issue']) {
    assert.strictEqual(hook(save(issue('No search.'), t)).hookSpecificOutput.permissionDecision, 'deny', t);
  }
  for (const t of ['mcp__Linear__save_comment', 'mcp__Linear__save_project', 'mcp__github__save_issue', 'Bash']) {
    assert.strictEqual(hook(save(issue('No search.'), t)), null, t + ' is left alone');
  }
  assert.strictEqual(hook('not json'), null);
  assert.strictEqual(hook(''), null);
  assert.strictEqual(hook(JSON.stringify({tool_name: 'mcp__Linear__save_issue', tool_input: 'x'})), null);
});

test("the settings' matcher selects the same tools as the script (Claude Code tests it as an unanchored regex)", () => {
  assert.ok(/[^A-Za-z0-9_\-\s,|]/.test(MATCHER), 'the matcher holds a regex character, so it is read as a regex');
  const re = new RegExp(MATCHER);
  for (const t of ['mcp__Linear__save_issue', 'mcp__claude_ai_Linear__save_issue', 'mcp__plugin_linear_linear__save_issue']) {
    assert.ok(re.test(t), t);
  }
  for (const t of ['mcp__Linear__save_comment', 'mcp__Linear__save_issue_label', 'mcp__github__save_issue', 'Bash']) {
    assert.ok(!re.test(t), t);
  }
});
