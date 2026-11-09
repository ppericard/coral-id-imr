'use strict';
// admin.js statsFor (PR #808's salvage, Q335): the admin's full replay of a player (progOf) takes what the sheet's replay
// takes (Code.gs replay_: mem, conf, fmt and the genus offsets gd), so the admin's replayed progress is the sheet's for
// rows logged without a scoring record (the domain-score bar reads gd for them, core.js replayProgress).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const cut = require('./block.js');

test("statsFor: the replayed subject's stats with the genus offsets, as the sheet's replay", () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'admin.js'), 'utf8'),
    ctx = {
      SMEM: [0, -0.5, -0.5, -1.5],
      SCONF: {'A|B': [3, 1]},
      SFMT: {k2: [0.3, 9]},
      GD: {Acropora: [0.2, 12]},
      domReplay: () => ({dom: true})
    };
  vm.createContext(ctx);
  vm.runInContext(cut(src, 'const statsFor = ', '\n', {through: 1, file: 'admin.js'}) + 'this.statsFor = statsFor;', ctx);
  const same = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b)); // objects made in the vm's realm
  same(ctx.statsFor({replay: true}), {mem: ctx.SMEM, conf: ctx.SCONF, fmt: ctx.SFMT, gd: ctx.GD, dom: true});
  assert.strictEqual(ctx.statsFor({replay: true}).gd, ctx.GD, 'the genus offsets the admin holds (?stats=1 gd)');
  same(ctx.statsFor({replay: false}), {dom: true});
  // The sheet's replay passes the same names (Code.gs replay_).
  const gs = fs.readFileSync(path.join(__dirname, '..', 'tools', 'sync', 'Code.gs'), 'utf8');
  assert.match(gs, /CORE_\.replayProgress\(rows, \{gen: gen, mem: st\.mem, conf: st\.conf, fmt: st\.fmt \|\| \{\}, gd: st\.gd/);
});
