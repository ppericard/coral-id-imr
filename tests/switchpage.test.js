// The admin's subject switch stays on the page on screen (Pierre, 2026-11-09): the same view on the other side, or the
// view that side opens for the same tab or group; never the side's page used last.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
const block = require('./block.js');

const src = fs.readFileSync(__dirname + '/../admin.js', 'utf8');
const code = block(src, 'const sameOn = ', '\n};\n', {through: 1, file: 'admin.js'});

test('sameOn: the same view when the other side has it, else the view it opens for the tab or group', () => {
  const FISH = {id: 'fish', pages: ['inbox/todo/reports', 'inbox/todo/health', 'photos/families/live', 'analyses/overview']};
  const CORALS = {id: 'corals', pages: null};
  const ctx = {
    ADM_PAGES: [
      'inbox/todo/reports',
      'inbox/todo/health',
      'photos/genera/live',
      'photos/families/live',
      'analyses/overview',
      'players/list'
    ],
    under: (p, x) => p === x || p.startsWith(x + '/'),
    shared: p => p === 'players/list',
    hasPage: (S, p) => !S.pages || S.pages.some(x => p === x || p.startsWith(x + '/')),
    admRoute: (p, S) => (p === 'photos/genera' && S.id === 'fish' ? 'photos/families/live' : 'home:' + p)
  };
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.sameOn = sameOn;', ctx);
  // the same view
  assert.strictEqual(ctx.sameOn(FISH, 'inbox/todo/health'), 'inbox/todo/health');
  assert.strictEqual(ctx.sameOn(CORALS, 'analyses/overview'), 'analyses/overview');
  // a thing on one side (a genus page) gives its view on the other, or the tab's own view there
  assert.strictEqual(ctx.sameOn(FISH, 'photos/genera/live/Acropora'), 'photos/families/live');
  assert.strictEqual(ctx.sameOn(FISH, 'inbox/todo/reports/x1'), 'inbox/todo/reports');
});
