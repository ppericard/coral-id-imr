require('./slot.js').testGuard();
// About and credits lists the sources a subject's data cites (REE-213; rule C2): the sea slugs' cards and marks cite
// papers, the Sea Slug Forum, SEASLUG.WORLD, dive guides, and About once listed WoRMS alone. The subject declares where
// its data holds them (app.js UNITS seaslug about.cites), one function lists them (home.js aboutCites), and the corals'
// and the fish's lists stay the ones written by hand. The blocks run in a vm with the page stubbed.
const test = require('node:test'),
  assert = require('node:assert'),
  fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  block = require('./block.js');
const ROOT = path.join(__dirname, '..'),
  read = f => fs.readFileSync(path.join(ROOT, f), 'utf8'),
  app = read('app.js'),
  home = read('home.js'),
  SLUG = JSON.parse(read('seaslug.json'));

// A subject's `about` entry as app.js writes it: the object literal after "about:", evaluated.
const aboutOf = who =>
  vm.runInNewContext(
    '(' + block(app, `    about: {\n      who: '${who}',`, '\n    },\n', {file: 'app.js'}).replace(/^ {4}about: /, '') + '\n    })'
  );
const SEA = aboutOf('sea slug genera'),
  FISH = aboutOf('reef fish families');

const norm = u => u.replace(/^https?:\/\/(?:www\.)?/i, ''),
  host = u => norm(u).split('/')[0];

// home.js in a vm: viewAbout and aboutCites. `subjects` are the ones open to the player, each {id, about, f}.
function page(subjects) {
  const out = {innerHTML: ''},
    uls = {},
    c = {
      window: {},
      $v: out,
      subjMine: () => subjects.map(s => ({id: s.id})),
      UNITS: Object.fromEntries(subjects.map(s => [s.id, {about: s.about, get: {f: () => Promise.resolve(s.f)}}])),
      ORG: {app: 'Reef ID', name: 'Institute', short: 'IMR'},
      esc: s => String(s).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]),
      safeUrl: u => (/^https:\/\//.test(u) ? u : '#'),
      hr: k => '#' + k
    };
  out.querySelector = sel => {
    const m = /^\[data-cites="([^"]+)"\]$/.exec(sel);
    return m && out.innerHTML.includes(`data-cites="${m[1]}"`) ? uls[m[1]] || (uls[m[1]] = {innerHTML: ''}) : null;
  };
  vm.createContext(c);
  vm.runInContext(home, c);
  return {c, out, uls};
}
const cites = (f, parts) => page([]).c.window.aboutCites(f, parts);

test('aboutCites: a site cited by several pages is one line with its pages counted, a work cited at several places one line', () => {
  const L = cites(
    {
      genera: [
        {
          msrc: [
            {t: 'Sea Slug Forum, Rudman 1998, A fact sheet', u: 'https://www.seaslugforum.net/find/a'},
            {t: 'Sea Slug Forum, Rudman 1999, B fact sheet, now C', u: 'https://www.seaslugforum.net/find/b'},
            {t: 'Brunckhorst 1993, Systematics of phyllidiids, General features, p. 9', u: 'https://doi.org/10.1/x'},
            {t: 'Brunckhorst 1993, Systematics of phyllidiids, External morphology, p. 19', u: 'https://doi.org/10.1/x'},
            {
              t: 'Gosliner 1995, The genus Thuridilla, with a revision (Proc. Calif. Acad. Sci. 49), Discussion, p. 45',
              u: 'https://archive.org/details/b1'
            },
            {t: 'Kim, Donohoo and Gosliner 2024, The Fionidae (PeerJ 12), Natural history', u: 'https://doi.org/10.2/y'}
          ],
          lsrc: {
            'g:X': [{t: 'iNaturalist identifications, one genus taken for the other: 2 in the Philippines (2026-11-17)'}],
            'g:Y': [{t: 'iNaturalist identifications, one genus taken for the other: 5 in the Philippines (2026-11-17)'}]
          }
        }
      ],
      species: [
        {
          msrc: [
            {t: 'Sea Slug Forum, Rudman 1998, A fact sheet', u: 'https://www.seaslugforum.net/find/a'},
            {
              t: "Rudman W.B. 1999 (July 6), Sea Slug Forum message 'Juvenile': Hexabranchus lacer",
              u: 'http://www.seaslugforum.net/find/1013'
            }
          ],
          en: [{n: 'x', web: [{t: "Nudi Pixel, 'Nudibranch Look-Alikes': A, B", u: 'https://nudipixel.net/similarities'}]}]
        },
        // a species named by a paper: its own `cite`, linked by its doi, named whole
        {
          id: 'x:sp',
          inf: 1,
          cite: 'Soong, G.Y. & Reimer, J.D. (2020). A species complex (Nudibranchia: Doridina). Marine Biodiversity 50: 25.',
          doi: '10.1007/s12526-020-01048-w'
        }
      ],
      taxa: {cite: 'never a source: no object {t}', groups: [{n: 1, title: 'not a source'}]}
    },
    ['genera', 'species']
  );
  assert.deepStrictEqual(JSON.parse(JSON.stringify(L)), [
    {name: 'Brunckhorst 1993, Systematics of phyllidiids', url: 'https://doi.org/10.1/x', pages: 0},
    {
      name: 'Gosliner 1995, The genus Thuridilla, with a revision (Proc. Calif. Acad. Sci. 49)',
      url: 'https://archive.org/details/b1',
      pages: 0
    },
    {name: 'iNaturalist identifications', url: '', pages: 0},
    {name: 'Kim, Donohoo and Gosliner 2024, The Fionidae (PeerJ 12)', url: 'https://doi.org/10.2/y', pages: 0},
    {name: "Nudi Pixel, 'Nudibranch Look-Alikes'", url: 'https://nudipixel.net/similarities', pages: 0},
    // the site's own line takes the forum message cited by another short name
    {name: 'Sea Slug Forum', url: 'https://www.seaslugforum.net', pages: 3},
    {
      name: 'Soong, G.Y. & Reimer, J.D. (2020). A species complex (Nudibranchia: Doridina). Marine Biodiversity 50: 25.',
      url: 'https://doi.org/10.1007/s12526-020-01048-w',
      pages: 0
    }
  ]);
});

test('aboutCites: nothing for a file or a part with no source, never a throw', () => {
  assert.strictEqual(cites(null, ['genera']).length, 0);
  assert.strictEqual(cites({genera: [{marks: ['a']}]}, ['genera', 'nope']).length, 0);
  assert.strictEqual(cites({genera: [{t: 'x'}]}, undefined).length, 0);
});

test('the sea slugs declare what their data cites; the corals and the fish keep their lists', () => {
  assert.ok(SEA.cites && SEA.cites.lead && Array.isArray(SEA.cites.in) && SEA.cites.in.length, 'seaslug about.cites');
  assert.ok(!FISH.cites, 'the fish list stays the one written by hand');
  assert.strictEqual((app.match(/\n {6}cites: \{\n/g) || []).length, 1, 'one subject declares it, the sea slugs');
  // every part of seaslug.json that holds a source is one the subject declares (a new part cannot hide its sources)
  const holds = [];
  const walk = (o, part) => {
    if (Array.isArray(o)) o.forEach(x => walk(x, part));
    else if (o && typeof o === 'object') {
      if (typeof o.t === 'string' && Object.keys(o).every(k => k === 't' || k === 'u' || k === 'read')) holds.push(part);
      else {
        if (typeof o.cite === 'string') holds.push(part);
        Object.values(o).forEach(x => walk(x, part));
      }
    }
  };
  Object.entries(SLUG).forEach(([k, v]) => k !== 'taxa' && walk(v, k)); // the taxa's cite is WoRMS's own line (the test below)
  assert.deepStrictEqual([...new Set(holds)].sort(), [...SEA.cites.in].sort());
});

test("About lists every source the sea slugs' data cites, named as the data names it, none invented", () => {
  const L = cites(SLUG, SEA.cites.in);
  assert.ok(L.length >= 30, `${L.length} lines`);
  // the sources, read again by a walk over the whole file (not the taxa's: WoRMS's own line, below), a record's `cite`
  // with its doi as the source it names whole
  const cited = [];
  const walk = o => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if (typeof o.t === 'string' && Object.keys(o).every(k => k === 't' || k === 'u' || k === 'read')) cited.push(o);
      else {
        if (typeof o.cite === 'string') cited.push({t: o.cite, u: o.doi ? 'https://doi.org/' + o.doi : undefined});
        Object.values(o).forEach(walk);
      }
    }
  };
  Object.entries(SLUG).forEach(([k, v]) => k !== 'taxa' && walk(v));
  assert.ok(cited.length > 600, `${cited.length} citations`);
  assert.ok(
    cited.some(s => /^Soong, G\.Y\./.test(s.t) && /^https:\/\/doi\.org\/10\./.test(s.u)),
    'the species named by a paper'
  );
  const sites = L.filter(s => s.pages),
    docs = L.filter(s => !s.pages);
  cited.forEach(s => {
    const short = s.t.split(', ')[0];
    if (s.u) {
      const ok = docs.some(d => d.url && norm(d.url) === norm(s.u)) || sites.some(x => host(x.url) === host(s.u)); // the page, or its site
      assert.ok(ok, `not listed: ${s.t} ${s.u}`);
    } else
      assert.ok(
        L.some(d => d.name === short || d.name.startsWith(short + ', ')),
        `not listed: ${s.t}`
      );
  });
  // no line the data does not cite: a link is a cited page or a cited site, a name the beginning of a cited t
  const urls = new Set(cited.filter(s => s.u).map(s => norm(s.u))),
    hosts = new Set([...urls].map(host));
  L.forEach(s => {
    if (s.pages) assert.ok(hosts.has(host(s.url)), `site not cited: ${s.url}`);
    else if (s.url) assert.ok(urls.has(norm(s.url)), `page not cited: ${s.url}`);
    assert.ok(
      cited.some(c => c.t.trim().startsWith(s.name)),
      `name not the data's: ${s.name}`
    );
  });
  // the data's own big sources by name, with their pages counted and a link to the site
  const forum = L.find(s => s.name === 'Sea Slug Forum'),
    world = L.find(s => /^SEASLUG\.WORLD/.test(s.name));
  assert.ok(forum && forum.pages > 50 && /^https:\/\/(www\.)?seaslugforum\.net$/.test(forum.url), JSON.stringify(forum));
  assert.ok(world && world.pages > 50 && world.url === 'https://en.seaslug.world', JSON.stringify(world));
  assert.ok(L.some(s => /^Brunckhorst 1993, Systematics and phylogeny of phyllidiid nudibranchs$/.test(s.name)));
  assert.strictEqual(new Set(L.map(s => s.name)).size, L.length, 'one line per source');
  assert.ok(L.some(s => /^Soong, G\.Y\./.test(s.name) && /^https:\/\/doi\.org\/10\./.test(s.url)));
});

test("every source the sea slugs' data cites by a key has its line on About (iNaturalist, WoRMS, Wikipedia, the guides, the web pages)", () => {
  // en[].src: the keys a name's sources are cited by; ensrc: each record's ids at them; taxa.cite: the classification's
  const keys = new Set(),
    walk = o => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === 'object') {
        if (Array.isArray(o.src) && o.src.every(x => typeof x === 'string')) o.src.forEach(k => keys.add(k));
        Object.values(o).forEach(walk);
      }
    };
  walk(SLUG);
  Object.keys(SLUG.ensrc).forEach(k => keys.add(k));
  const p = page([{id: 'coral'}, {id: 'seaslug', about: SEA, f: SLUG}]);
  p.c.window.viewAbout();
  const html = p.out.innerHTML,
    L = p.c.window.aboutCites(SLUG, SEA.cites.in),
    line = {
      inat: /<a href="https:\/\/www\.inaturalist\.org"[^>]*>iNaturalist<\/a>/,
      worms: /<a href="https:\/\/www\.marinespecies\.org"[^>]*>World Register of Marine Species/,
      wiki: /<a href="https:\/\/en\.wikipedia\.org"[^>]*>Wikipedia<\/a>/
    };
  assert.deepStrictEqual([...keys].sort(), ['guide', 'inat', 'web', 'wiki', 'worms'], 'a new key needs its line (and this test its case)');
  Object.entries(line).forEach(([k, re]) => assert.match(html, re, `the key ${k} has no line on About`));
  // guide: the guides ensrc.guide names, as the list's lines; web: each page, in the list (the test above)
  SLUG.ensrc.guide.forEach(g =>
    assert.ok(
      L.some(s => g.t.startsWith(s.name)),
      `the guide is not listed: ${g.t}`
    )
  );
  assert.ok(SLUG.taxa.cite.startsWith('WoRMS Editorial Board') && /WoRMS Editorial Board/.test(html), 'the classification: WoRMS');
});

test('viewAbout: the sea slugs list their sources under References once the file is in, the others change nothing', async () => {
  const flush = () => new Promise(r => setTimeout(r, 0));
  // corals alone: no list, the References as before
  let p = page([{id: 'coral', about: undefined}]);
  p.c.window.viewAbout();
  assert.ok(!/abcites/.test(p.out.innerHTML));
  // corals and fish: the fish's line written by hand, no declared sources, no fetch of its file
  p = page([{id: 'coral'}, {id: 'fish', about: FISH, f: {}}]);
  p.c.window.viewAbout();
  assert.ok(!/abcites/.test(p.out.innerHTML) && /Reef Fish Identification/.test(p.out.innerHTML));
  // with the sea slugs: WoRMS stays, a placeholder, then the list in it, each line a link or a name
  p = page([{id: 'coral'}, {id: 'fish', about: FISH, f: {}}, {id: 'seaslug', about: SEA, f: SLUG}]);
  p.c.window.viewAbout();
  assert.match(p.out.innerHTML, /World Register of Marine Species/);
  assert.match(p.out.innerHTML, /<ul class="abcites" data-cites="seaslug"><li>Loading the sources…<\/li><\/ul>/);
  assert.ok(p.out.innerHTML.includes(SEA.cites.lead));
  await flush();
  const h = p.uls.seaslug.innerHTML;
  assert.ok(!/Loading/.test(h));
  assert.strictEqual((h.match(/<li>/g) || []).length, p.c.window.aboutCites(SLUG, SEA.cites.in).length);
  assert.match(
    h,
    /<li><a href="https:\/\/doi\.org\/10\.3853\/j\.0812-7387\.16\.1993\.79" target="_blank" rel="noopener">Brunckhorst 1993, Systematics and phylogeny of phyllidiid nudibranchs<\/a><\/li>/
  );
  assert.match(h, /<li><a href="https:\/\/[^"]*seaslugforum\.net" [^>]*>Sea Slug Forum<\/a>: \d+ pages cited<\/li>/);
  assert.match(h, /<li>iNaturalist identifications<\/li>/);
  // a file that did not come (json() answers {}): said, not an empty list
  p = page([{id: 'seaslug', about: SEA, f: {}}]);
  p.c.window.viewAbout();
  await flush();
  assert.match(p.uls.seaslug.innerHTML, /could not be loaded/);
  // the player left the page before the file came: nothing to fill, no throw
  p = page([{id: 'seaslug', about: SEA, f: SLUG}]);
  p.c.window.viewAbout();
  p.out.innerHTML = '<p>another page</p>';
  await flush();
  assert.strictEqual(p.uls.seaslug, undefined);
});
