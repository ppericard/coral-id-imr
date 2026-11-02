// Spot the feature: read the corallites on a photo (wall type, size, other features) before naming the genus.
LAB.add({
  id: 'spot',
  icon: '◉',
  title: 'Spot the feature',
  blurb: 'Read a corallite photo like an expert: walls, size, other features. The genus name comes last.',
  lede: 'Answers come from the genus traits used in the key, so a single photo may not show every feature clearly. Tap the photo to enlarge it.',
  render(root) {
    const score = {wall: [0, 0], size: [0, 0], feat: [0, 0]};
    const Q = {
      wall: 'What kind of corallite walls?',
      size: 'Roughly how wide are the corallites?',
      feat: 'Which feature (IMR lecture or Coral Finder) does this genus show?'
    };
    const round = () => {
      const t = pick(labNames()),
        g = DATA.gen[t],
        L = g.views.macro && g.views.macro.length ? g.views.macro : g.views.medium || [],
        p = pick(L.length ? L : [viewPhoto(t, 'macro')]);
      const feats = g.tr.filter(x => trSet('feat').includes(x));
      const steps = ['wall', 'size', ...(feats.length ? ['feat'] : [])];
      let si = 0;
      root.innerHTML = `<div class="spot"><button type="button" class="spotph" id="spz"><img src="${img(p, fit(Math.min(innerWidth, 800)))}" alt="Corallites to read"></button><div class="spotq" id="spq"></div></div>
        <p class="note" id="spscore"></p>`;
      const showScore = () => {
        root.querySelector('#spscore').textContent = Object.entries(score)
          .map(([k, [ok, n]]) => `${{wall: 'Walls', size: 'Size', feat: 'Details'}[k]} ${ok}/${n}`)
          .join(' · ');
      };
      showScore();
      root.querySelector('#spz').onclick = () => zoom([{...p, genus: '?'}], 0);
      const ask = () => {
        const k = steps[si],
          right = g.tr.filter(x => trSet(k).includes(x));
        const opts =
          k === 'feat' ? shuffle([pick(right), ...shuffle(trSet('feat').filter(x => !right.includes(x))).slice(0, 3)]) : trSet(k);
        const q = root.querySelector('#spq');
        q.innerHTML = `<p class="spstep">Step ${si + 1} of ${steps.length + 1}</p><h3>${Q[k]}</h3><div class="choices col">${opts.map(o => `<button type="button" class="choice" data-o="${o}">${esc(trName(o))}</button>`).join('')}</div><div id="spres"></div>`;
        q.querySelectorAll('[data-o]').forEach(
          b =>
            (b.onclick = () => {
              if (q.dataset.done) return;
              q.dataset.done = '1';
              const ok = right.includes(b.dataset.o);
              score[k][1]++;
              if (ok) score[k][0]++;
              showScore();
              q.querySelectorAll('[data-o]').forEach(x =>
                x.classList.add(right.includes(x.dataset.o) ? 'right' : x === b ? 'wrong' : 'off')
              );
              q.querySelector('#spres').innerHTML =
                `<p class="${ok ? 'ok' : 'ko'}">${ok ? 'Yes.' : 'Not this one.'}${right.length > 1 ? ' This genus can show several: ' + right.map(trName).map(esc).join(', ') + '.' : ''}</p><button type="button" class="next" id="spn">Next</button>`;
              q.querySelector('#spn').onclick = () => {
                delete q.dataset.done;
                si++;
                si < steps.length ? ask() : name();
              };
            })
        );
      };
      // Last step: name the genus, with the features you just read in mind.
      const name = () => {
        const q = root.querySelector('#spq');
        q.innerHTML = `<p class="spstep">Step ${steps.length + 1} of ${steps.length + 1}</p><h3>So, which genus?</h3><p class="note">${g.tr.map(trName).map(esc).join(' · ')}</p><div class="choices col">${labChoices(
          t,
          4
        )
          .map(n => `<button type="button" class="choice" data-c="${esc(n)}">${esc(n)}</button>`)
          .join('')}</div><div id="spres"></div>`;
        q.querySelectorAll('[data-c]').forEach(
          b =>
            (b.onclick = () => {
              if (q.dataset.done) return;
              q.dataset.done = '1';
              q.querySelectorAll('[data-c]').forEach(x => x.classList.add(x.dataset.c === t ? 'right' : x === b ? 'wrong' : 'off'));
              q.querySelector('#spres').innerHTML =
                `<p class="${b.dataset.c === t ? 'ok' : 'ko'}"><a href="${genLink(t)}"><i>${esc(t)}</i></a>: ${whyLine(t)}</p><button type="button" class="next" id="spn">New photo</button>`;
              q.querySelector('#spn').onclick = round;
            })
        );
      };
      ask();
    };
    round();
  }
});
