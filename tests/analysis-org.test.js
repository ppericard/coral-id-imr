require('./slot.js').testGuard();
// The organisation's short name in analysis.js's source labels (REE-296, REE-34): one definition, core.js ORG.short, read
// by Node and the admin page from core.js, sent to the Worker in its message. A literal IMR returning in a label fails
// tests/orgwords.test.js (analysis.js has no row left in its LEFT list).
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const A = require('../analysis.js');
const {ORG} = require('../core.js');

const SRC = path.join(__dirname, '..', 'analysis.js');

test('the source labels name the organisation as core.js ORG.short, same text as before for IMR', () => {
  assert.strictEqual(ORG.short, 'IMR');
  assert.strictEqual(A.PLAIN.photo.own.name, 'Pierre’s photo instead of an IMR lecture photo');
  assert.strictEqual(A.PLAIN.photo.inat.name, 'Another iNaturalist photo instead of an IMR lecture photo');
});

test('in a Worker (no core.js) the message carries the organisation, and the labels follow', () => {
  const posted = [],
    self = {postMessage: m => posted.push(m)};
  vm.createContext(self);
  self.self = self;
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), self);
  assert.strictEqual(typeof self.onmessage, 'function', 'the Worker handler is installed');
  self.onmessage({data: {id: 1, org: 'XYZ'}});
  const name = self.ANALYSIS.PLAIN.photo.own.name;
  assert.strictEqual(name, 'Pierre’s photo instead of an XYZ lecture photo');
  assert.ok(!/IMR/.test(JSON.stringify(self.ANALYSIS.PLAIN.photo)));
});
