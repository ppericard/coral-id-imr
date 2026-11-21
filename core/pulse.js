  // The one-tap question's bank (docs/spec/cards.md "One-tap questions", which gives the items, their scales and their
  // sources; quiz.js pulseAsk, admin Errors). Each item {id, q: its question, a: its answers}, each answer [code,
  // label, d, f]: d felt difficulty (-1 too easy, 0 right, +1 too hard), f how the play feels (-1 bad, 0 neutral, +1
  // good), null says nothing on that scale. Every prompt also logs its showing (PULSE_SHOWN) and, when it ends without
  // an answer, a "Not now" (PULSE_SKIP) or moving on without a tap (PULSE_NONE).
  const PULSE_SHOWN = 'shown',
    PULSE_SKIP = 'skip',
    PULSE_NONE = 'none';
  const PULSEQ = [
    {
      id: 'are',
      q: 'These questions are',
      a: [
        ['easy', 'Too easy', -1, null],
        ['ok', 'About right', 0, null],
        ['hard', 'Too hard', 1, null]
      ]
    },
    // The challenge-skill balance as the flow channels, said as states: "the challenge is too low / too high" leaves
    // non-native speakers unsure whether low means easy or hard.
    {
      id: 'zone',
      q: 'Right now I feel',
      a: [
        ['easy', 'Bored', -1, null],
        ['ok', 'In the zone', 0, null],
        ['hard', 'Struggling', 1, null]
      ]
    },
    {
      id: 'more',
      q: 'Want harder photos?',
      a: [
        ['easy', 'Yes', -1, null],
        ['ok', 'Keep it', 0, null],
        ['hard', 'Easier', 1, null]
      ]
    },
    {
      id: 'fun',
      q: 'Having fun?',
      a: [
        ['lo', 'Not really', null, -1],
        ['mid', "It's OK", null, 0],
        ['hi', 'Yes!', null, 1]
      ]
    },
    {
      id: 'frus',
      q: 'Frustrating?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', 0.5, -0.5],
        ['yes', 'Very', 1, -1]
      ]
    },
    {
      id: 'bored',
      q: 'Getting boring?',
      a: [
        ['no', 'Not at all', 0, 0],
        ['bit', 'A bit', -0.5, -0.5],
        ['yes', 'Yes', -1, -1]
      ]
    }
  ];
  // The first item ever asked, and the item of every answer logged without an item id (the oldest sheet rows).
  const PULSE0 = 'are';
  const pulseItem = id => PULSEQ.find(x => x.id === (id || PULSE0)) || null;
  // An answer on the common scales: {d, f}, null where it says nothing (an unknown item or code: both null).
  function pulseScore(id, code) {
    const it = pulseItem(id),
      a = it && it.a.find(x => x[0] === code);
    return a ? {d: a[2], f: a[3]} : {d: null, f: null};
  }
  // Which item to ask next. Rounds: every item once in a shuffled order, then a new round, never starting with the item
  // just asked, so a player never meets the same wording twice in a row and meets each one as often. st is what the
  // device stored at the last ask ({q: item asked, left: the round's items still to ask}; before the bank, {at} alone,
  // which means PULSE0 was asked); rnd a random number generator in [0, 1). Returns {q, left}, to store.
  function pulsePick(st, rnd = Math.random) {
    const ids = PULSEQ.map(x => x.id),
      last = (st && st.q) || (st && typeof st.at === 'number' ? PULSE0 : ''),
      shuffle = L => {
        const o = L.slice();
        for (let i = o.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [o[i], o[j]] = [o[j], o[i]];
        }
        return o;
      };
    let left = (st && Array.isArray(st.left) ? st.left : []).filter((x, i, L) => ids.includes(x) && x !== last && L.indexOf(x) === i);
    if (!left.length) {
      if (!last) return {q: PULSE0, left: shuffle(ids.filter(x => x !== PULSE0))};
      left = shuffle(ids);
      if (left[0] === last) left.push(left.shift());
    }
    return {q: left[0], left: left.slice(1)};
  }

