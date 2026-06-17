// Airbus for AI, the negotiation game: engine.
// One turn = one month. Two actions a month. The Act lands somewhere
// in turns 13-16; the scorecard at that moment decides the ending.

(function () {
  const D = window.GAME_DATA;
  const $ = sel => document.querySelector(sel);

  const ACTIONS_PER_TURN = 2;
  const INFLUENCE_PER_TURN = 2;
  const COMMIT_LABELS = ['Out', 'Hedging', 'In'];
  const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth',
    'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth'];
  const MONTH_FULL = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
    Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };

  function monthTitle (turn) {
    const m = (D.MONTHS[turn - 1] || '.').split('.');
    return 'Month the ' + ORDINALS[turn - 1] + ' · ' + (MONTH_FULL[m[0]] || m[0]) + ' ' + m[1];
  }

  let S = null;        // game state
  let pendingCourt = false; // courting: pick a state on the ring / roster
  let pendingFund = false;  // FUND submenu open
  let lastMenuKey = '';     // which choice list was animated in last
  let pendingRed = false;   // Washington is on the line
  let lastHdrTurn = -1;     // last month decoded into the masthead

  function fundableLabs () {
    return Object.keys(D.LABS).filter(k =>
      !S.labs[k].anchored && !S.labs[k].gone && S.states[D.LABS[k].home].commit >= 1);
  }

  // ---------- state ----------

  function newGame () {
    S = {
      turn: 0,
      influence: 3,
      actionsLeft: 0,
      bonusActions: 0,
      pooled: false,
      summitUnlocked: false,
      warm: 0,             // turns of summit warmth remaining
      talentBonus: 0,
      capBonus: 0,
      efTarget: 5,
      actTurn: 13 + Math.floor(Math.random() * 4),
      seed: (Math.random() * 0x7fffffff) | 0,
      over: false,
      eventChoice: null,   // this turn's un-taken event choice
      fillerIdx: 0,
      windowIdx: 0,
      hedges: 0,
      declined: [],
      states: {},
      labs: {}
    };
    pendingCourt = false;
    pendingFund = false;
    pendingRed = false;
    Object.keys(D.STATES).forEach(k => {
      S.states[k] = { commit: 0, ease: D.STATES[k].ease, tries: 0 };
    });
    undoStack = [];
    Object.keys(D.LABS).forEach(k => {
      S.labs[k] = { anchored: false, gone: false };
    });
    stopArt();
    $('#gLog').innerHTML = '';
    $('#gEnd').hidden = true;
    nextTurn();
  }

  // ---------- scorecard ----------

  function score () {
    const inStates = Object.keys(S.states).filter(k => S.states[k].commit === 2);
    let cap = S.capBonus, ef = 0, talent = S.talentBonus;
    const strong = new Set(D.BASE_LANGS);
    inStates.forEach(k => {
      cap += D.STATES[k].cap;
      ef += D.STATES[k].ef;
      talent += D.STATES[k].talent;
      D.STATES[k].langs.forEach(l => strong.add(l));
    });
    Object.keys(S.labs).forEach(k => {
      if (S.labs[k].anchored) { cap += D.LABS[k].cap; talent += D.LABS[k].talent; }
    });
    return {
      inCount: inStates.length,
      compute: S.pooled ? ef : 0,
      computeRaw: ef,
      capital: cap,
      talent: talent,
      langs: strong.size,
      langSet: strong,
      labsAnchored: Object.keys(S.labs).filter(k => S.labs[k].anchored).length
    };
  }

  // ---------- rendering ----------

  function esc (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  function monthRule () {
    const el = document.createElement('div');
    const windowOpen = S.turn >= 13;
    el.className = 'g-month-rule' + (windowOpen ? ' warn' : '');
    $('#gLog').appendChild(el);
    decodeIn(el, monthTitle(S.turn) + (windowOpen ? ' · the window is open' : ''), { step: 1, tick: 20 });
  }

  // ---------- integrated text effects ----------
  // No boxed art: motion lives inside the typography itself. Real browsers
  // only (the test harness has no rAF), and reduced motion gets static text.
  const canAnimate = typeof window.requestAnimationFrame === 'function';
  const GLYPHS = '#%&*+=<>/\\|~^;:?!10';

  function reducedMotion () {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Persistent in-prose glitch effects were removed for readability: the
  // dispatch text decodes in once, then stays stable. The event fx fields in
  // data.js are kept but ignored, in case a subtler treatment returns.
  function stopArt () {}
  function applyFx () {}

  // ---------- pictorial ascii: the logotype and the cluster ----------

  // 3x5 block font for the title logotype.
  const FONT = {
    T: ['███', ' █ ', ' █ ', ' █ ', ' █ '],
    H: ['█ █', '█ █', '███', '█ █', '█ █'],
    E: ['███', '█  ', '██ ', '█  ', '███'],
    S: [' ██', '█  ', ' █ ', '  █', '██ '],
    L: ['█  ', '█  ', '█  ', '█  ', '███'],
    O: ['███', '█ █', '█ █', '█ █', '███'],
    W: ['█ █', '█ █', '█ █', '███', '█ █'],
    B: ['██ ', '█ █', '██ ', '█ █', '██ '],
    I: ['███', ' █ ', ' █ ', ' █ ', '███'],
    A: ['███', '█ █', '███', '█ █', '█ █'],
    R: ['██ ', '█ █', '██ ', '█ █', '█ █'],
    U: ['█ █', '█ █', '█ █', '█ █', '███'],
    F: ['███', '█  ', '██ ', '█  ', '█  ']
  };

  function logoLines (text) {
    const rows = ['', '', '', '', ''];
    text.split('').forEach(ch => {
      const g = FONT[ch];
      for (let r = 0; r < 5; r++) rows[r] += (g ? g[r] : '   ') + ' ';
    });
    return rows.join('\n');
  }

  // The logotype ignites: filled cells appear in random order, with a few
  // sparking glyphs running ahead of the burn.
  function buildLogo (el) {
    const final = logoLines('AIRBUS FOR AI');
    if (!canAnimate || reducedMotion()) { el.textContent = final; return; }
    const chars = final.split('');
    const targets = [];
    chars.forEach((c, i) => { if (c === '█') targets.push(i); });
    for (let i = targets.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = targets[i]; targets[i] = targets[j]; targets[j] = tmp;
    }
    const grid = chars.map(c => (c === '█' ? ' ' : c));
    let k = 0;
    const t = setInterval(() => {
      for (let s = 0; s < 6 && k < targets.length; s++) grid[targets[k++]] = '█';
      let out = grid.join('');
      if (k < targets.length) {
        // sparks: a few unlit cells flicker ahead of the burn
        const g2 = out.split('');
        for (let s = 0; s < 4; s++) {
          const idx = targets[k + ((Math.random() * (targets.length - k)) | 0)];
          if (idx !== undefined) g2[idx] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        out = g2.join('');
      }
      el.textContent = out;
      if (k >= targets.length) { clearInterval(t); el.textContent = final; }
    }, 30);
  }

  // The cluster: a rack elevation that comes alive as compute is pooled.
  // Each node is 1 EF: lit nodes blink their drive LEDs and push traffic,
  // standby nodes wait for the pooling treaty, the rest of the rack is cold.
  function renderStack () {
    const el = $('#gStack');
    if (!el || !S) return;
    const sc = score();
    const online = Math.min(5, Math.max(0, Math.round(S.pooled ? sc.compute : 0)));
    const standby = !S.pooled ? Math.min(5, Math.round(sc.computeRaw)) : 0;
    const load = Math.min(1, (S.pooled ? sc.compute : 0) / 5);
    const C = { K: '#181410', face: '#2A2832', slot: '#3A3640', rail: '#57525B',
                on: '#2E9E4F', io: '#0057FF', sb: '#8A8494', off: '#4A4550',
                pwr: '#E2A93B', red: '#BE1234' };
    const R = (x, y, w, h, f, cls, delay) =>
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + f + '"' +
      (cls ? ' class="' + cls + '"' : '') +
      (delay ? ' style="animation-delay:' + delay + 's"' : '') + '/>';
    let r = '';
    r += R(1, 0, 28, 26, C.K);
    r += R(2, 1, 26, 24, C.face);
    r += R(2, 1, 1, 24, C.rail); r += R(27, 1, 1, 24, C.rail);
    for (let n = 0; n < 5; n++) {
      const y = 2 + n * 4;
      r += R(4, y, 22, 3, C.slot);
      if (n < online) {
        for (let i = 0; i < 6; i++)
          r += R(5 + i * 2, y + 1, 1, 1, C.on, 'gx-led', (n * 0.31 + i * 0.17).toFixed(2));
        for (let i = 0; i < 3; i++)
          r += R(19 + i * 2, y + 1, 2, 1, C.io, 'gx-led', (n * 0.23 + i * 0.29).toFixed(2));
      } else if (n < online + standby) {
        for (let i = 0; i < 6; i++) r += R(5 + i * 2, y + 1, 1, 1, C.sb);
      } else {
        r += R(5, y + 1, 1, 1, C.red);
      }
    }
    const segs = Math.round(load * 8);
    for (let i = 0; i < 8; i++) r += R(4 + i * 3, 23, 2, 1, i < segs ? C.pwr : C.off);
    r += R(2, 26, 3, 1, C.K); r += R(25, 26, 3, 1, C.K);
    const pct = Math.round(load * 100);
    const temp = Math.round(18 + load * 16);
    const status = S.pooled
      ? 'EU-POOL-01 \u00B7 ' + online + '/5 nodes \u00B7 pwr ' + pct + '% \u00B7 ' + temp + '\u00B0C'
      : (standby
        ? 'EU-POOL-01 \u00B7 idle \u00B7 ' + standby + ' node' + (standby === 1 ? '' : 's') + ' on standby'
        : 'EU-POOL-01 \u00B7 dark');
    el.innerHTML =
      '<svg class="gx-art" viewBox="0 0 30 28" shape-rendering="crispEdges" aria-hidden="true">' + r + '</svg>' +
      status + (standby > 0 ? '\nPOOL to energize the rack' : '');
  }

  // The pressure gauge: the status line is the mood, the lines under it are the
  // facts. Timeline of 16 months, the Act window, and the time you have left.
  function renderBoil () {
    const el = $('#gBoil');
    if (!el || !S) return;
    const turn = Math.min(S.turn, 16);
    const heat = Math.min(1, turn / 16);
    const C = { K: '#181410', pot: '#57525B', water: '#A9CCE8', surf: '#C6DFF1',
                bub: '#FFFFFF', fl1: '#FF8E1F', fl2: '#FFD23C',
                past: '#0057FF', now: '#181410', win: '#b8002e', fut: '#C9C4B8' };
    const R = (x, y, w, h, f, cls, delay) =>
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + f + '"' +
      (cls ? ' class="' + cls + '"' : '') +
      (delay ? ' style="animation-delay:' + delay + 's"' : '') + '/>';
    let r = '';
    // pot: rim, walls, handles
    r += R(5, 2, 24, 1, C.K);
    r += R(5, 3, 1, 10, C.K); r += R(28, 3, 1, 10, C.K);
    r += R(5, 13, 24, 1, C.K);
    r += R(3, 4, 2, 2, C.K); r += R(29, 4, 2, 2, C.K);
    // water
    r += R(6, 4, 22, 1, C.surf);
    r += R(6, 5, 22, 8, C.water);
    // bubbles: more of them as the heat rises
    const nBub = 1 + Math.round(heat * 7);
    for (let i = 0; i < nBub; i++) {
      const bx = 7 + ((i * 5 + 2) % 20);
      r += R(bx, 10, 1, 1, C.bub, 'gx-bub', (i * 0.37).toFixed(2));
    }
    // steam once the Act window opens
    if (turn >= 13) {
      r += R(10, 0, 1, 1, C.fut, 'gx-bub', '0.2');
      r += R(17, 0, 1, 1, C.fut, 'gx-bub', '0.9');
      r += R(24, 0, 1, 1, C.fut, 'gx-bub', '1.5');
    }
    // flame under the pot, scaled by heat
    const nFl = 1 + Math.round(heat * 7);
    for (let i = 0; i < nFl; i++) {
      const fx = 7 + ((i * 3 + 1) % 20);
      r += R(fx, 15, 1, 2, i % 2 ? C.fl2 : C.fl1, 'gx-flick', (i * 0.21).toFixed(2));
      if (i % 3 === 0) r += R(fx, 14, 1, 1, C.fl2, 'gx-flick', (i * 0.27).toFixed(2));
    }
    r += R(4, 17, 26, 1, C.K); // the stove
    // month timeline: 16 pixel cells; past blue, current blinking, window red
    for (let m = 1; m <= 16; m++) {
      const x = 3 + (m - 1) * 1.75;
      let f = C.fut, cls = '';
      if (m < turn) f = C.past;
      else if (m === turn) { f = C.now; cls = 'gx-now'; }
      else if (m >= 13) f = C.win;
      r += R(x.toFixed(2), 20, 1.25, 1.25, f, cls, '');
    }
    const lo = Math.max(0, 13 - S.turn), hi = Math.max(0, 16 - S.turn);
    const eta = S.over
      ? 'the Act has landed'
      : (S.turn >= 13
        ? 'the Act can land any month now'
        : 'the Act lands in ' + lo + ' to ' + hi + ' months');
    const word = S.over ? 'past the deadline' : (S.turn >= 13 ? 'critical' : heat > 0.5 ? 'rising' : 'low');
    el.innerHTML =
      '<svg class="gx-art" viewBox="0 0 34 22" shape-rendering="crispEdges" aria-hidden="true">' + r + '</svg>' +
      'month ' + turn + ' of 16 \u00B7 red cells = the Act window\n' +
      eta + '\n' +
      'pressure ' + word + ' \u00B7 ' + Math.round(heat * 100) + '%';
  }

  // Text renders instantly: the decode/typewriter reveals were removed as
  // distracting. Function names kept for their call sites; GLYPHS stays for
  // the logo ignition sparks.
  function decodeIn (el, text, opts) {
    el.textContent = text || '';
    if (opts && opts.done) opts.done();
  }

  function typeInto (host, p, text, done) {
    if (p) p.textContent = text;
    if (done) done();
  }

  function dispatch (city, prose, title, fx, cast) {
    const el = document.createElement('article');
    el.className = 'g-dispatch';
    const dl = document.createElement('div');
    dl.className = 'g-dateline';
    el.appendChild(dl);
    decodeIn(dl, city, { step: 1, tick: 24 });
    if (title) {
      const tt = document.createElement('div');
      tt.className = 'g-ev-title';
      el.appendChild(tt);
      decodeIn(tt, title, { step: 1, tick: 30 });
    }
    if (cast && cast.length) {
      const cr = document.createElement('div');
      cr.className = 'g-cast';
      cr.innerHTML = cast.map(c => {
        const key = window.CastMarks && CastMarks.key(c.n);
        const mark = key
          ? '<span class="g-cast-flag" aria-hidden="true"><svg viewBox="0 0 18 12">' + CastMarks.faceInner(key) + '</svg></span>' +
            '<svg class="g-cast-pip" viewBox="0 0 10 10" aria-hidden="true">' + CastMarks.pipInner(CastMarks.facOf(key), CastMarks.color(key)) + '</svg>'
          : '';
        const style = key ? ' style="border-left-color:' + CastMarks.color(key) + '"' : '';
        return '<span class="g-cast-chip"' + style + '>' + mark +
          '<span class="g-cast-txt"><b>' + esc(c.n) + '</b>' + esc(c.c) + '</span></span>';
      }).join('');
      el.appendChild(cr);
    }
    const p = document.createElement('p');
    el.appendChild(p);
    $('#gLog').appendChild(el);
    typeInto(el, p, prose, () => applyFx(p, fx));
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function logLine (text, cls) {
    const el = document.createElement('p');
    el.className = 'g-line' + (cls ? ' ' + cls : '');
    $('#gLog').appendChild(el);
    decodeIn(el, text, { step: 3, tick: 14 });
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // One pictogram row: fixed slots, filled left to right; the slot at goalIdx
  // wears the dashed coral "credible minimum" marker (story-chart vocabulary).
  function slotRow (id, total, filled, goalIdx, cls, ghost) {
    let html = '';
    for (let i = 0; i < total; i++) {
      let c = 'g-slot ' + cls;
      if (i < filled) c += ghost ? ' ghost' : ' fill';
      if (i + 1 === goalIdx) c += ' goalmark';
      html += '<span class="' + c + '"></span>';
    }
    $(id).innerHTML = html;
  }

  function setVal (sel, txt, met) {
    const el = $(sel);
    el.textContent = txt;
    el.className = 'g-val' + (met ? ' met' : '');
  }

  // Coalition ring: ten states around the pool; links appear as they commit.
  function renderRing () {
    const keys = Object.keys(D.STATES);
    const cx = 105, cy = 89, R = 62, LR = 76;
    let links = '', nodes = '';
    keys.forEach((k, i) => {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / keys.length);
      const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      const c = S.states[k].commit;
      if (c === 1) links += '<line class="link hedge" x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
      if (c === 2) links += '<line class="link" x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
      nodes += '<circle class="node c' + c + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5">' +
        '<title>' + D.STATES[k].name + ' · ' + COMMIT_LABELS[c] + '</title></circle>';
      const lx = cx + LR * Math.cos(a), ly = cy + LR * Math.sin(a);
      const anchor = Math.abs(Math.cos(a)) < 0.3 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
      nodes += '<text class="' + (c === 2 ? 'c2-label' : '') + '" x="' + lx.toFixed(1) + '" y="' + (ly + 3).toFixed(1) + '" text-anchor="' + anchor + '">' + k + '</text>';
    });
    const ring = $('#gRing');
    ring.className = 'g-ring';
    ring.innerHTML =
      '<svg viewBox="0 0 210 178" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Coalition ring">' +
      '<circle class="rim" cx="' + cx + '" cy="' + cy + '" r="' + R + '"/>' +
      links + nodes +
      '<circle class="core' + (S.pooled ? ' pooled' : '') + '" cx="' + cx + '" cy="' + cy + '" r="7"/>' +
      '<text class="core-label" x="' + cx + '" y="' + (cy + 20) + '">' + (S.pooled ? 'POOLED' : 'POOL') + '</text>' +
      '</svg>';
  }

  // Tooltip text for a courtable country tile.
  function pickText (k) {
    const d = D.STATES[k];
    const st = S.states[k];
    const pct = Math.round(courtChance(st) * 100);
    return d.name + ' · ' + COMMIT_LABELS[st.commit] + ' → ' + COMMIT_LABELS[st.commit + 1] + ' · ' + pct + '% chance · brings ' +
      d.ef + ' EF, $' + d.cap + 'B, ' + d.talent + 'k researchers' +
      (d.langs.length ? ', ' + d.langs.join('/') : '') + ' once In. ' + d.blurb;
  }

  function renderHUD () {
    const sc = score();
    if (S.turn !== lastHdrTurn) {
      lastHdrTurn = S.turn;
      decodeIn($('#gTurnLabel'), 'Month ' + S.turn + ' of 16', { step: 1, tick: 28 });
    } else {
      $('#gTurnLabel').textContent = 'Month ' + S.turn + ' of 16';
    }

    renderRing();
    renderBoil();
    renderStack();

    // Compute: 1 chip = 1 EF. Unpooled compute shows as dashed ghost chips.
    slotRow('#gPicto-compute', 5, Math.min(5, Math.round(sc.computeRaw)), 3, 'chip', !S.pooled);
    setVal('#gVal-compute', (S.pooled ? '~' + sc.compute.toFixed(1) : '0') + ' / ' + S.efTarget + ' EF', sc.compute >= D.TRACKS.compute.goal);
    $('#gNote-compute').innerHTML = (!S.pooled && sc.computeRaw > 0)
      ? 'Pooled training compute. <span class="warn">dashed = unpooled; POOL to make it count</span>'
      : '1 chip = 1 EF (<span class="gloss" tabindex="0" data-tip="A measure of computing speed: one exaFLOP is 10^18 (a quintillion) operations per second. AI-training clusters are rated in exaFLOPS.">exaFLOPS</span> of training compute) &middot; goal 3 &middot; US &asymp; ' + S.efTarget;

    // Capital: 1 coin = $4B, goal at the 5th coin ($20B).
    slotRow('#gPicto-capital', 8, Math.min(8, Math.round(sc.capital / 4)), 5, 'coin');
    setVal('#gVal-capital', '$' + Math.round(sc.capital) + 'B / goal $' + D.TRACKS.capital.goal + 'B', sc.capital >= D.TRACKS.capital.goal);

    // Talent: 1 dot = 5k researchers, goal near the 8th (36k).
    slotRow('#gPicto-talent', 12, Math.min(12, Math.round(sc.talent / 5)), 8, 'dotp');
    setVal('#gVal-talent', Math.round(sc.talent) + 'k / goal ' + D.TRACKS.talent.goal + 'k', sc.talent >= D.TRACKS.talent.goal);

    // Languages: the story site's 24-cell grid, live.
    let cells = '';
    D.ALL_LANGS.forEach(l => {
      let c = 'g-slot cell';
      if (sc.langSet.has(l)) c += ' fill';
      else if (D.BASE_PARTIAL.indexOf(l) !== -1) c += ' partial';
      else c += ' risk';
      cells += '<span class="' + c + '" title="' + l + '"></span>';
    });
    $('#gPicto-langs').innerHTML = cells;
    setVal('#gVal-langs', sc.langs + ' / 24 covered', sc.langs >= D.TRACKS.langs.goal);

    // turn rail
    const rail = $('#gRail');
    rail.innerHTML = '';
    for (let i = 1; i <= 16; i++) {
      const d = document.createElement('span');
      d.className = 'g-dot' + (i < S.turn ? ' done' : '') + (i === S.turn ? ' now' : '') + (i >= 13 ? ' window' : '');
      d.title = D.MONTHS[i - 1] + (i >= 13 ? ' (Act window)' : '');
      rail.appendChild(d);
    }

    // states: the ring's legend by name
    const list = $('#gStates');
    list.innerHTML = '';
    Object.keys(D.STATES).forEach(k => {
      const st = S.states[k];
      const el = document.createElement('div');
      el.className = 'g-state c' + st.commit;
      el.innerHTML = '<i></i><b>' + k + '</b> <span>' + esc(D.STATES[k].name) + '</span><em>' + COMMIT_LABELS[st.commit] + '</em>';
      el.title = D.STATES[k].blurb;
      list.appendChild(el);
    });

    // labs
    const labs = $('#gLabs');
    labs.innerHTML = '';
    Object.keys(D.LABS).forEach(k => {
      const l = S.labs[k];
      const el = document.createElement('span');
      el.className = 'g-lab' + (l.anchored ? ' anchored' : '') + (l.gone ? ' gone' : '');
      el.innerHTML = buildingSvg(k, l.anchored) +
        '<span class="g-lab-name">' + esc(D.LABS[k].name) + '</span>' +
        '<span class="g-lab-state">' + (l.anchored ? 'anchored' : l.gone ? 'lost' : D.STATES[D.LABS[k].home].name) + '</span>';
      el.title = D.LABS[k].name + ' (' + D.STATES[D.LABS[k].home].name + ')' +
        (l.anchored ? ': anchored to the coalition.' : l.gone ? ': taken by the Godfather offer.' : ': fund once ' + D.STATES[D.LABS[k].home].name + ' is at least Hedging.');
      labs.appendChild(el);
    });
  }

  // A decision card: number key, readable title, cost/odds badge on the right,
  // and the description always visible underneath (no hover needed).
  // lockReason: empty string = available; otherwise the card is locked and the
  // reason leads its description.
  function choiceRow (n, title, badge, desc, lockReason, onClick, mods) {
    const b = document.createElement('button');
    b.type = 'button';
    const locked = !!lockReason;
    b.className = 'g-choice' + (mods ? ' ' + mods : '') + (locked ? ' is-locked' : '');
    if (locked) b.setAttribute('aria-disabled', 'true');
    b.dataset.key = n;
    const sub = (locked ? '<span class="lock">Locked: ' + esc(lockReason) + '</span> ' : '') + esc(desc || '');
    const keyChip = (n === '' || n === null || n === undefined) ? '' : '<b>' + n + '</b>';
    b.innerHTML =
      '<span class="g-choice-head">' + keyChip + '<span class="g-choice-title">' + esc(title) + '</span>' +
      (badge ? '<span class="g-choice-badge">' + esc(badge) + '</span>' : '') + '</span>' +
      (sub ? '<span class="g-choice-sub">' + sub + '</span>' : '');
    b.title = locked ? lockReason : (desc || '');
    b.addEventListener('click', () => { if (!locked) onClick(); });
    wireRail(b, relsFor(title));
    return b;
  }

  // Common lock reasons, in the order players hit them.
  function lockWhy (cost, extraOk, extraWhy) {
    if (S.actionsLeft <= 0) return 'No moves left this month. Hit Next to continue.';
    if (cost && S.influence < cost) return 'Not enough influence: costs ' + cost + ', you have ' + S.influence + '.';
    if (extraOk === false) return extraWhy;
    return '';
  }

  // ---------- undo: one month deep, with fated dice ----------

  let undoStack = [];

  function pushUndo () {
    undoStack.push({ s: JSON.stringify(S), logN: $('#gLog').children.length });
  }

  function doUndo () {
    const u = undoStack.pop();
    if (!u) return;
    S = JSON.parse(u.s);
    // Re-link the live event choice (functions do not survive serialization).
    if (S.eventChoice) S.eventChoice = (D.EVENTS[S.turn] && D.EVENTS[S.turn].choice) || null;
    const log = $('#gLog');
    while (log.children.length > u.logN && log.removeChild) log.removeChild(log.lastChild);
    pendingCourt = false;
    pendingFund = false;
    renderAll();
  }

  // Deterministic roll per game, month, subject and attempt: undo cannot reroll fate.
  function detRoll (tag, salt) {
    let h = S.seed ^ Math.imul(S.turn + 1, 2654435761) ^ Math.imul((salt || 0) + 1, 40503);
    for (let i = 0; i < tag.length; i++) h = Math.imul(h ^ tag.charCodeAt(i), 16777619);
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // 8-bit overworld tiles for the courting grid: land, coast, water.
  const TILES = {
    CA: ['BbbGGGbbGGGbbbGGGcbB','bbGgggGbGggGbbGggGbb','bGgwgggGgwggGGgwggGb','bGggggwgggggwgggggGb','bbGggggggggGGGgggGbb','bbGgggggggGbbbGggGbb','bbbGgggggGbbbbbGGGbb','bbbbGggggGbcbbbbbbbb','bbbbbGggGbbbbbbBbbbb','bbcbbBGGbbbbbbbbbbbc','bbbbbbcbbbbbbbBbbbbb','bbbbBbbbbbcbbbbbbbbb'],
    GB: ['BbbbbbbbbbbbbbbbbcbB','bbbbcbbbbGGGbbbbbbbb','bbbbbbbbcGggGbbbbbBb','bbbbbbbbBbGgGbbbbbbb','bbbGGGbbbGgggGbbcBbb','bbGggGbBbGgggGbbbbbb','bbbGgGbcGggggGbbBbbb','bbbGGbBbGgggggGbbbbb','bbbbbbbbbGggggGBbbbb','bbcbbBbbbbGGGGbbbbbc','bbbbbbcbbbbbbbBbbbbb','bbbbBbbbbbcbbbbbbbbb'],
    FR: ['BbbbbbbbbbbbbbbbbcbB','bbbbcbbbbBbbbbbbbbbb','bbbbbbbGGGGGGbbbbbBb','bbbbbGGggggggGGbbbbb','bbGGGggggggggggGcBbb','bbGGgggggggggggGbbbb','bbbbGgggggggggGbBbbb','bbbbbGggggggGGbbbbbb','bbbbbbGgggGGbbbBbbbb','bbcbbBbGGGbbbbbbbbbc','bbbbbbcbbbbbbbBbbbbb','bbbbBbbbbbcbbbbbbbbb'],
    DE: ['BbbbbbbbbbbbbbbbbcbB','bbbbcbbGGGGGGbbbbbbb','bbbbbbGggggggGbbbbBb','bbbbbbGggggggGbbbbbb','bbbbbbbGggggggGbcBbb','bbbcbbbGggggggGbbbbb','bbbbbbGggggggGbbBbbb','bbbbbbBGgggggGbbbbbb','bbbbbbbGggggGbbBbbbb','bbcbbBbbGGGGGbbbbbbc','bbbbbbcbbbbbbbBbbbbb','bbbbBbbbbbcbbbbbbbbb'],
    ES: ['BbbbbbbbbbbbbbbbbcbB','bbbbcbbbbBbbbbbbbbbb','bbbbbbbbcbbbbbbbbbBb','bbbbGGGGGGGGGGGGbbbb','bbbGggggggggggggGBbb','bbbGggggggggggggGbbb','bbbbGgggggggggGGBbbb','bbbbGgggggggGGbbbbbb','bbbbbGggggGGbbbBbbbb','bbcbbBGGGGbbbbbbbbbc','bbbbbbcbbbbbbbBbbbbb','bbbbBbbbbbcbbbbbbbbb'],
    SE: ['BbbbbbbbbGGGbbbbbcbB','bbbbcbbbGwgwGbbbbbbb','bbbbbbbbGgwgGbbbbbBb','bbbbbbbbGwgGcbbbbbbb','bbbbbbbGgggGbbbbcBbb','bbbcbbbGggGbbbbbbbbb','bbbbbbGgggGbbbbbBbbb','bbbbbbGggGbcbbbbbbbb','bbbbbbbGgGbbbbbBbbbb','bbcbbBbGggGbbbbbbbbc','bbbbbbcbGGGbbbBbbbbb','bbbbBbbbbbcbbbbbbbbb'],
    CH: ['gggggggggggggggggggg','gggggggggggggggggggg','gggggggggggggggggggg','ggggggwggggggwgggggg','gggggmwmggggmwmggggg','ggggmmmmmggmmmmmgggg','gggmmmmmmmmmmmmmmggg','gggggggggggggggggggg','gggggggggggggggggggg','gggggggggggggggggggg','gggggggggggggggggggg','gggggggggggggggggggg'],
    JP: ['BbbbbbbbbbbbbbbbbcbB','bbbbcbbbbBbbbbGGGbbb','bbbbbbbbcbbbbGggGbBb','bbbbbbbbBbbbGgGGbbbb','bbbbbbbbbbGGgGbbcBbb','bbbcbbbBGGgGGbbbbbbb','bbbbbbbGGgGbbbbbBbbb','bbbbbGGbbGGcbbbbbbbb','bbbbGGGbbbbbbbbBbbbb','bbcGGBbbbbbbbbbbbbbc','bbbbbbcbbbbbbbBbbbbb','bbbbBbbbbbcbbbbbbbbb'],
    KR: ['GGGGGGGGGGGGGGGGGGGG','GGGGGGGGggggggGbbbbb','bbbbbbbbGggggGbbbbBb','bbbbbbbbBGggGbbbbbbb','bbbbbbbbbGggGbbbcBbb','bbbcbbbBbGgGbbbbbbbb','bbbbbbbcGggGbbbbBbbb','bbbbbbBbbGGGbbbbbbbb','bbbbbbbbbbbbbbbBbbbb','bbcbbBbbbGGbbbbbbbbc','bbbbbbcbbbbbbbBbbbbb','bbbbBbbbbbcbbbbbbbbb'],
    SG: ['GGGGGGGGGGGGGGGGGGGG','bbbGGGggggggggGGGbbb','bbbbbbGGggggGGbbbbBb','bbbbbbbbGGGGcbbbbbbb','bbbbbbbbbbbbbbbbcBbb','bbbcbbbBbbbbbbbbbbbb','bbbbbbbGGGGGGGbbBbbb','bbbbbbGgrgrgrGbbbbbb','bbbbbbbGGGGGGbbBbbbb','bbcbbBbbbbbbbbbbbbbc','bbbbbbcbbbbbbbBbbbbb','bbbbBbbbbbcbbbbbbbbb']
  };
  const TILE_PX = {
    G: '#4E7A3C', g: '#94C06A', b: '#A9CCE8', B: '#C6DFF1', c: '#8FB9DD',
    w: '#FBF9F3', m: '#A39A8C', r: '#C24A38'
  };
  function tileSvg (key) {
    const rows = TILES[key];
    if (!rows) return '';
    let rects = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (TILE_PX[ch]) {
          let x2 = x;
          while (x2 + 1 < row.length && row[x2 + 1] === ch) x2++;
          rects += '<rect x="' + x + '" y="' + y + '" width="' + (x2 - x + 1) + '" height="1" fill="' + TILE_PX[ch] + '"/>';
          x = x2 + 1;
        } else x++;
      }
    });
    return '<svg class="g-tile" viewBox="0 0 20 12" shape-rendering="crispEdges" aria-hidden="true">' + rects + '</svg>';
  }

  // Section header above the decision list: pips show the move budget.
  function movesHeader (txt, withPips) {
    const el = document.createElement('div');
    el.className = 'g-moves';
    let pips = '';
    if (withPips) {
      const total = S.actionsTotal || ACTIONS_PER_TURN;
      for (let i = 0; i < total; i++) pips += '<i class="' + (i < S.actionsLeft ? 'on' : 'off') + '"></i>';
    }
    el.innerHTML = pips + '<span>' + esc(txt) + '</span>';
    el.title = 'Influence is the political currency your moves cost (the price on each choice). You gain 2 at the start of every month; Hold banks an extra 1.';
    return el;
  }

  // New choice lists (a fresh month or an opened submenu) fade in with a
  // stagger: 0.3s per card, 0.12s apart. Re-renders within a list do not.
  function staggerIn (bar) {
    const key = (S.over ? 'over' : S.turn) + ':' + (pendingCourt ? 'c' : pendingFund ? 'f' : 'm');
    if (key === lastMenuKey) return;
    lastMenuKey = key;
    if (!canAnimate || reducedMotion() || !bar.querySelectorAll) return;
    bar.querySelectorAll('.g-choice, .g-country').forEach((el, i) => {
      el.classList.add('cin');
      el.style.animationDelay = (i * 0.12) + 's';
    });
  }


  // Lab HQ buildings: shared shell, home-flag banner, windows light on anchor.
  const LAB_FLAGS = {
    mistral: ['#0057FF', '#F7F3E9', '#BE1234'],
    cohere:  ['#BE1234', '#F7F3E9', '#BE1234'],
    deepl:   ['#2A241E', '#BE1234', '#E2A93B']
  };
  const BUILDING = [
    '..KKKKKKKKKK....',
    '..KwwwwwwwwK....',
    '..K123wwwwwK....',
    '..K123wwwwwK....',
    '..K123wwwwwK....',
    '..KwwwwwwwwK..a.',
    '..KooKooKooK.aa.',
    '..KooKooKooKaaa.',
    '..KwwwwwwwwKKKK.',
    '..KooKooKooKwwK.',
    '..KooKooKooKwwK.',
    '..KwwwwwwwwKooK.',
    '..KooKooKooKooK.',
    '..KooKooKooKwwK.',
    '..KwwwwwwwwKwwK.',
    '..KwwwddwwwKooK.',
    '..KwwwddwwwKwwK.',
    'KKKKKKKKKKKKKKKK'
  ];
  function buildingSvg (key, lit) {
    const flag = LAB_FLAGS[key] || ['#888', '#888', '#888'];
    const colors = {
      K: '#181410', w: '#D8D2C4', d: '#2A2832', a: '#9BA4B2',
      o: lit ? '#E2A93B' : '#4A4550',
      1: flag[0], 2: flag[1], 3: flag[2]
    };
    let rects = '';
    BUILDING.forEach((r, y) => {
      let x = 0;
      while (x < r.length) {
        const ch = r[x];
        if (colors[ch]) {
          let x2 = x;
          while (x2 + 1 < r.length && r[x2 + 1] === ch) x2++;
          rects += '<rect x="' + x + '" y="' + y + '" width="' + (x2 - x + 1) + '" height="1" fill="' + colors[ch] + '"/>';
          x = x2 + 1;
        } else x++;
      }
    });
    return '<svg class="g-lab-hq" viewBox="0 0 16 18" shape-rendering="crispEdges" aria-hidden="true">' + rects + '</svg>';
  }


  // Which rail panels a choice touches; hovering or focusing the choice
  // highlights those panels and dims the rest.
  function relsFor (title) {
    const t = (title || '').toLowerCase();
    if (/court|summit/.test(t)) return ['coalition'];
    if (/pool/.test(t)) return ['cluster', 'ledger'];
    if (/fund|anchor|lab/.test(t)) return ['labs', 'ledger'];
    if (/hedge|cloud/.test(t)) return ['cluster', 'water'];
    if (/hold/.test(t)) return ['water'];
    if (/sign|hang|washington/.test(t)) return ['coalition', 'water'];
    return [];
  }
  function railFocus (rels) {
    const side = document.querySelector('.g-side');
    if (!side) return;
    const on = !!(rels && rels.length);
    side.classList.toggle('focusing', on);
    side.querySelectorAll('.g-panel').forEach(p => {
      p.classList.toggle('rel', on && rels.indexOf(p.dataset.panel) !== -1);
    });
  }
  function wireRail (el, rels) {
    if (!rels.length) return;
    el.addEventListener('mouseenter', () => railFocus(rels));
    el.addEventListener('mouseleave', () => railFocus(null));
    el.addEventListener('focus', () => railFocus(rels));
    el.addEventListener('blur', () => railFocus(null));
  }

  function renderActions () {
    const bar = $('#gActions');
    bar.innerHTML = '';
    if (S.over) return;

    const sc = score();

    if (pendingRed) {
      bar.appendChild(movesHeader('Washington, on the line', false));
      bar.appendChild(choiceRow(1, 'Sign now, on negotiated terms', 'ends the game',
        'Capitulate early and on purpose: managed access with carve-outs instead of whatever tier the Act assigns you later. The coalition as it stands today is what you bring to the table.',
        '', () => {
          pendingRed = false;
          logLine('You sign before being asked twice. Washington is gracious in the way winners are.', 'bad');
          dispatch('Washington', 'The line is warm and friendly. Of course there are terms. There were always going to be terms; calling first only means you get to read them sitting down.', 'The call you were not supposed to make');
          concludeGame('negotiated', score());
        }, 'ev'));
      bar.appendChild(choiceRow(0, 'Hang up', '', 'Put the receiver down and keep building.', '', () => {
        pendingRed = false;
        logLine('You put the receiver down. The dial tone sounds like the future clearing its throat.');
        renderAll();
      }, 'quiet'));
      staggerIn(bar);
      return;
    }

    if (pendingCourt) {
      bar.appendChild(movesHeader('Courting · pick a country · 1 influence each' +
        (S.warm > 0 ? ' · summit warmth +20% active' : ''), false));
      const grid = document.createElement('div');
      grid.className = 'g-countries';
      let n = 1;
      Object.keys(D.STATES).forEach(k => {
        const st = S.states[k];
        if (st.commit >= 2) return;
        const d = D.STATES[k];
        const pct = Math.round(courtChance(st) * 100);
        const lock = lockWhy(1);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'g-country c' + st.commit + (lock ? ' is-locked' : '');
        if (n <= 9) b.dataset.key = n;
        b.title = lock ? lock : pickText(k);
        b.innerHTML =
          tileSvg(k) +
          '<span class="g-country-name">' + (n <= 9 ? '<b>' + n + '</b> ' : '') + esc(d.name) + '</span>' +
          '<span class="g-country-meta">' + COMMIT_LABELS[st.commit] + ' → ' + COMMIT_LABELS[st.commit + 1] + ' · ' + pct + '% chance</span>' +
          '<span class="g-country-brings">' + d.ef + ' EF · $' + d.cap + 'B · ' + d.talent + 'k' +
            (d.langs.length ? ' · ' + d.langs.join('/') : '') + '</span>';
        if (!lock) b.addEventListener('click', () => doCourt(k));
        wireRail(b, ['coalition']);
        grid.appendChild(b);
        n++;
      });
      bar.appendChild(grid);
      bar.appendChild(choiceRow(0, 'Back', '', 'Close courting without spending anything.', '',
        () => { pendingCourt = false; renderAll(); }, 'quiet'));
      staggerIn(bar);
      return;
    }

    if (pendingFund) {
      bar.appendChild(movesHeader('Pick one lab to anchor · 0 backs out', false));
      let n = 1;
      fundableLabs().forEach(k => {
        const l = D.LABS[k];
        bar.appendChild(choiceRow(n++, 'Fund ' + l.name, '(+$' + l.cap + 'B, +' + l.talent + 'k) · 2 influence',
          'Anchored via ' + D.STATES[l.home].name + ': +$' + l.cap + 'B capital, +' + l.talent + 'k researchers, and it survives the Godfather offer. At least one anchored lab is required for the best ending.',
          lockWhy(2), () => doFund(k)));
      });
      bar.appendChild(choiceRow(0, 'Back', '', 'Close the list without spending anything.', '',
        () => { pendingFund = false; renderActions(); }, 'quiet'));
      staggerIn(bar);
      return;
    }

    bar.appendChild(movesHeader(S.actionsLeft > 0
      ? 'Your moves · pick up to ' + S.actionsLeft + ' more · ' + S.influence + ' influence in hand (moves cost it)'
      : 'No moves left · hit Next · your ' + S.influence + ' influence carries over', true));
    let n = 1;
    // Event choice, if pending (free of the move budget; costs influence).
    if (S.eventChoice) {
      const evLock = S.influence < S.eventChoice.cost
        ? 'Not enough influence: costs ' + S.eventChoice.cost + ', you have ' + S.influence + '.'
        : '';
      bar.appendChild(choiceRow(n++, S.eventChoice.label, S.eventChoice.cost + ' influence · extra, uses no move',
        (S.eventChoice.brief || 'A one-time offer.') + ' It lapses when the month ends.',
        evLock, takeEventChoice, 'ev'));
    }
    bar.appendChild(choiceRow(n++, 'Court a state', '1 influence', 'Persuade a capital one step up the ladder: Out → Hedging → In. Only In states add their compute, capital, talent and languages to the ledger. Country cards appear here; each shows your odds, which are its disposition toward the coalition, raised by story events, by every failed approach, and by Summit warmth (+20% for two months).',
      lockWhy(1), () => { pendingCourt = true; renderAll(); }));
    if (!S.pooled) {
      bar.appendChild(choiceRow(n++, 'Pool compute', '2 influence · needs 2 In',
        'One-time treaty: member compute becomes a single cluster, for current and future members. ' +
        (sc.computeRaw > 0 ? sc.computeRaw.toFixed(1) + ' EF is sitting unpooled right now.' : 'Nothing to pool yet; bring states In first.'),
        lockWhy(2, sc.inCount >= 2, 'Needs two states fully In; you have ' + sc.inCount + '. Court states to In first.'),
        doPool));
    }
    const fundable = fundableLabs();
    bar.appendChild(choiceRow(n++, 'Fund a lab' + (fundable.length ? ': ' + fundable.map(k => D.LABS[k].name).join(', ') : ''), '2 influence',
      'Anchor a lab whose home state is at least Hedging: it adds capital and researchers, and is safe from the Godfather offer (month 12). Unanchored labs are lost then, for good.',
      lockWhy(2, fundable.length > 0, 'No lab is fundable yet: a lab unlocks once its home state is at least Hedging (Mistral via France, Cohere via Canada, DeepL via Germany).'),
      () => { if (fundable.length === 1) doFund(fundable[0]); else { pendingFund = true; renderActions(); } }));
    bar.appendChild(choiceRow(n++, 'Hedge public cloud', '1 influence',
      'Migrate a slice of public-sector cloud off the US hyperscalers. With 4 or more slices when the Act lands, a Vassal verdict softens into Survived. You have ' + (S.hedges || 0) + '.',
      lockWhy(1), doHedge));
    if (S.summitUnlocked) {
      const sumLock = S.actionsLeft !== (S.actionsTotal || ACTIONS_PER_TURN)
        ? 'Needs a whole untouched month: make it your first move, before spending any action.'
        : (S.influence < 1 ? 'Not enough influence: costs 1, you have ' + S.influence + '.' : '');
      bar.appendChild(choiceRow(n++, 'Summit', '1 influence · whole month',
        'Consumes both moves this month. Every courting attempt gets +20% odds for two months, and one Out capital moves to Hedging.',
        sumLock, doSummit));
    }
    bar.appendChild(choiceRow(n++, 'Hold', 'gain 1 influence',
      'Spend a move doing nothing visible; bank +1 influence for a bigger month later.',
      lockWhy(0), doHold));
    bar.appendChild(choiceRow(n++, 'Call Washington', 'ends the game',
      'The back channel, always open. Sign early on negotiated terms: managed access with carve-outs instead of whatever tier the Act assigns you later. You bring only the coalition you have today. Asks for confirmation first.',
      '', () => { pendingRed = true; renderAll(); }, 'quiet'));
    const util = document.createElement('div');
    util.className = 'g-utilrow';
    util.appendChild(choiceRow('', 'Undo last move', '', '',
      undoStack.length ? '' : 'Nothing to take back yet this month.', doUndo, 'util'));
    util.appendChild(choiceRow('', 'Next', '', '', '', nextTurn,
      'util' + (S.actionsLeft <= 0 ? ' go' : '')));
    bar.appendChild(util);
    staggerIn(bar);
  }

  function renderAll () {
    renderHUD();
    renderActions();
    const bar = $('#gActions');
    if (bar.scrollIntoView) bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------- actions ----------

  function spend (actions, influence) {
    S.actionsLeft -= actions;
    S.influence -= influence;
  }

  function courtChance (st) {
    return Math.max(0.15, Math.min(0.9, 0.3 + st.ease * 0.5 + (S.warm > 0 ? 0.2 : 0)));
  }

  function doCourt (k) {
    pendingCourt = false;
    pushUndo();
    spend(1, 1);
    const st = S.states[k];
    st.tries = (st.tries || 0) + 1;
    const p = courtChance(st);
    const pct = Math.round(p * 100);
    if (detRoll(k, st.tries) < p) {
      st.commit += 1;
      logLine('Courting ' + D.STATES[k].name + ' (odds ' + pct + '%): they move to ' + COMMIT_LABELS[st.commit] + '.', 'good');
      if (st.commit === 2 && S.pooled) logLine(D.STATES[k].name + '’s compute joins the pooled cluster.', 'good');
      if (st.commit === 2 && !S.pooled && D.STATES[k].ef >= 0.5) logLine(D.STATES[k].name + '’s ' + D.STATES[k].ef.toFixed(1) + ' EF sits idle until you POOL.', 'bad');
    } else {
      st.ease = Math.min(0.9, st.ease + 0.08); // doors open a little each time
      logLine('Courting ' + D.STATES[k].name + ' (odds ' + pct + '%): warm words, no commitment. Next time: ' + Math.round(courtChance(st) * 100) + '%.', 'bad');
    }
    renderAll();
  }

  function doPool () {
    pushUndo();
    spend(1, 2);
    S.pooled = true;
    logLine('The pooling agreement is signed. Every member’s compute now counts as one cluster, present and future.', 'good');
    renderAll();
  }

  function doFund (k) {
    pendingFund = false;
    pushUndo();
    spend(1, 2);
    S.labs[k].anchored = true;
    logLine(D.LABS[k].name + ' is anchored to the coalition. Capital and researchers follow.', 'good');
    renderAll();
  }

  function doHedge () {
    pushUndo();
    spend(1, 1);
    S.hedges = (S.hedges || 0) + 1;
    logLine('Another slice of public-sector cloud migrates off the US hyperscalers. Slow, unglamorous, load-bearing.', 'good');
    renderAll();
  }

  function doSummit () {
    pushUndo();
    // "Whole month": consume every move this turn, including any bonus action
    // (the Paris event grants a 3rd), not just the base two.
    spend(S.actionsTotal || ACTIONS_PER_TURN, 1);
    S.warm = 2;
    const out = Object.keys(S.states).filter(k => S.states[k].commit === 0);
    if (out.length) {
      const k = out[Math.floor(detRoll('summit', out.length) * out.length)];
      S.states[k].commit = 1;
      logLine('The summit runs eleven hours. ' + D.STATES[k].name + ' moves to Hedging, and every other capital warms.', 'good');
    } else {
      logLine('The summit runs eleven hours. Every capital warms.', 'good');
    }
    renderAll();
  }

  function doHold () {
    pushUndo();
    spend(1, -1);
    logLine('You bank the month. Influence accrues to those who wait. Sometimes.');
    renderAll();
  }

  function takeEventChoice () {
    const c = S.eventChoice;
    if (!c || S.influence < c.cost) return;
    pushUndo();
    S.influence -= c.cost;
    S.eventChoice = null;
    c.apply(S);
    logLine(c.note, 'good');
    renderAll();
  }

  // ---------- turn flow ----------

  function nextTurn () {
    if (S.over) return;
    undoStack = []; // the month closes; no taking back across time
    // The road not taken: an untaken event offer lapses, with consequences shown.
    if (S.eventChoice) {
      const c = S.eventChoice;
      logLine('The road not taken: ' + (c.declined || 'the offer lapses.'), 'bad');
      S.declined.push(c.declinedShort || c.label);
    }
    S.turn += 1;
    S.actionsLeft = ACTIONS_PER_TURN + (S.bonusActions || 0);
    S.actionsTotal = S.actionsLeft;
    S.bonusActions = 0;
    S.influence += S.turn === 1 ? 0 : INFLUENCE_PER_TURN;
    if (S.warm > 0) S.warm -= 1;
    S.eventChoice = null;
    pendingCourt = false;
    pendingFund = false;
    stopArt(); // freeze last month's vignettes on their current frame
    monthRule();

    if (S.turn >= S.actTurn) { theActLands(); return; }

    const ev = D.EVENTS[S.turn];
    if (S.turn === 9) eventOttawa();
    else if (S.turn === 11) eventParis();
    else if (S.turn === 12) eventPentagon();
    else if (ev) {
      dispatch(ev.city, ev.prose, ev.title, ev.fx, ev.cast);
      if (ev.auto) ev.auto(S);
      if (ev.choice) S.eventChoice = ev.choice;
    } else if (S.turn >= 13) {
      const f = D.WINDOW_FILLERS[S.windowIdx++ % D.WINDOW_FILLERS.length];
      dispatch(f.city, f.prose, null, f.fx);
    } else {
      const f = D.FILLERS[S.fillerIdx++ % D.FILLERS.length];
      dispatch(f.city, f.prose, null, f.fx);
    }
    renderAll();
  }

  function eventOttawa () {
    const euIn = D.EU_STATES.filter(k => S.states[k].commit === 2).length;
    if (euIn >= 2) {
      if (S.states.CA.commit < 1) S.states.CA.commit = 1;
      S.states.CA.ease += 0.2;
      dispatch('Ottawa', 'A Canadian delegation arrives unannounced. They have read your pooling draft and brought their own edits, which is how Canadians say yes. Canada moves to Hedging.', 'The visitor', { phrase: 'how Canadians say yes', type: 'glitch' });
    } else {
      dispatch('Ottawa', 'A Canadian delegation arrives, counts the European members on one hand with fingers to spare, and flies home. They will move when Europe proves serious. Two EU states in would do it.', 'The visitor', { phrase: 'fingers to spare', type: 'glitch' });
    }
    renderAll();
  }

  function eventParis () {
    if (S.states.FR.commit === 2) {
      S.influence += 2;
      S.bonusActions = 0; S.actionsLeft += 1; S.actionsTotal += 1;
      dispatch('Paris', 'France stops asking who leads and starts acting like the answer. The Elysee opens its rolodex and its airframe: two influence banked, and an extra action this month while the President makes your calls with you.', 'The raise', { phrase: 'acting like the answer', type: 'glitch' });
    } else {
      dispatch('Paris', 'The Elysee watches, sympathetic and uncommitted. With France inside, this month would have gone very differently.', 'The raise', { phrase: 'sympathetic and uncommitted', type: 'glitch' });
    }
    renderAll();
  }

  function eventPentagon () {
    const ev = D.EVENTS[12];
    dispatch(ev.city, ev.prose, ev.title, ev.fx, ev.cast);
    const lost = [];
    Object.keys(D.LABS).forEach(k => {
      if (!S.labs[k].anchored) { S.labs[k].gone = true; lost.push(D.LABS[k].name); }
    });
    if (lost.length) logLine('Lost to the Godfather offer: ' + lost.join(', ') + '.', 'bad');
    else logLine('Every anchor lab was already yours. The offer finds no takers.', 'good');
    renderAll();
  }

  // ---------- endgame ----------

  function theActLands () {
    S.over = true;
    const sc = score();
    dispatch('Washington', 'At midnight on a Friday, the Digital Liberty Act is published. Aligned, managed-access, restricted: every state on your list now has a tier, and every tier has a price. Your phone begins to ring in every language you have.', 'The Digital Liberty Act', { phrase: 'Aligned, managed-access, restricted', type: 'redact' });
    concludeGame(null, sc);
  }

  // Shared ending renderer. key === null means "derive from the scorecard";
  // a forced key (the red phone) skips the derivation but keeps the audit.
  function concludeGame (forcedKey, sc) {
    S.over = true;

    const goalRows = [
      ['Compute',   (S.pooled ? '~' + sc.compute.toFixed(1) : '0') + ' EF', sc.compute >= D.TRACKS.compute.goal, D.TRACKS.compute.goal + ' EF'],
      ['Capital',   '$' + Math.round(sc.capital) + 'B',                     sc.capital >= D.TRACKS.capital.goal, '$' + D.TRACKS.capital.goal + 'B'],
      ['Talent',    Math.round(sc.talent) + 'k',                            sc.talent >= D.TRACKS.talent.goal,  D.TRACKS.talent.goal + 'k'],
      ['Languages', sc.langs + ' of 24',                                    sc.langs >= D.TRACKS.langs.goal,    String(D.TRACKS.langs.goal)]
    ];
    const goals = goalRows.filter(r => r[2]).length;

    let key = forcedKey;
    if (!key) {
      if (sc.inCount < 3) key = 'fragmentation';
      else if (goals === 4 && sc.labsAnchored >= 1) key = 'airbus';
      else if (goals >= 3) key = 'survived';
      else key = 'vassal';
    }

    // Hedged cloud pays off at the verdict: enough slices soften vassalage.
    let hedgeSaved = false;
    if (key === 'vassal' && (S.hedges || 0) >= 4) { key = 'survived'; hedgeSaved = true; }

    const e = D.ENDINGS[key];
    const stats = sc.inCount + ' states in, ' + (S.pooled ? sc.compute.toFixed(1) : '0') + ' EF pooled, $' + Math.round(sc.capital) + 'B, ' + Math.round(sc.talent) + 'k researchers, ' + sc.langs + ' languages, ' + sc.labsAnchored + ' lab' + (sc.labsAnchored === 1 ? '' : 's') + ' anchored, ' + (S.hedges || 0) + ' cloud slices hedged' + (hedgeSaved ? ' (the hedged cloud is what kept the lights on)' : '') + '.';

    const end = $('#gEnd');
    end.hidden = false;
    decodeIn($('#gEndTitle'), e.title, { step: 1, tick: 60, pool: '█▓▒░' });
    decodeIn($('#gEndProse'), e.prose.replace('{STATS}', ''), { step: 2, tick: 16 });

    // Goal-by-goal verdict.
    let goalsHtml = '<div class="g-end-section">The four goals</div>';
    goalRows.forEach(r => {
      goalsHtml += '<div class="g-end-goal ' + (r[2] ? 'met' : 'miss') + '">' +
        r[0] + ': ' + r[1] + ' · ' + (r[2] ? 'goal met' : 'missed (needed ' + r[3] + ')') + '</div>';
    });
    $('#gEndGoals').innerHTML = goalsHtml;

    // What was left on the table: lapsed offers, lost labs, the absent states.
    const left = S.declined.slice();
    Object.keys(D.LABS).forEach(k => { if (S.labs[k].gone) left.push(D.LABS[k].name + ', lost to the Godfather offer'); });
    const absent = Object.keys(D.STATES)
      .filter(k => S.states[k].commit < 2)
      .map(k => ({ k, w: D.STATES[k].ef * 20 + D.STATES[k].cap + D.STATES[k].talent / 2 }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 3)
      .map(o => {
        const d = D.STATES[o.k];
        return d.name + ' stayed out (' + d.ef + ' EF, $' + d.cap + 'B, ' + d.talent + 'k)';
      });
    const leftAll = left.concat(absent);
    $('#gEndLeft').innerHTML = leftAll.length
      ? '<div class="g-end-section">Left on the table</div>' + leftAll.map(t => '<div class="g-end-left">' + esc(t) + '</div>').join('')
      : '';
    $('#gEndStats').textContent = 'FIG. 16 · your run: ' + stats;

    // The player's own founding document, with a copy-as-text button.
    const members = Object.keys(D.STATES).filter(k => S.states[k].commit === 2).map(k => D.STATES[k].name);
    const labs = Object.keys(D.LABS).filter(k => S.labs[k].anchored).map(k => D.LABS[k].name);
    const docLines = [
      'THE COALITION INSTRUMENT - AS EXECUTED',
      'month ' + Math.min(S.turn, 16) + ' of 16 - verdict: ' + e.title,
      '',
      'ARTICLE I - MEMBERS (' + members.length + ')',
      '  ' + (members.length ? members.join(', ') : 'none came in'),
      '',
      'ARTICLE II - THE POOL',
      '  ' + (S.pooled ? '~' + sc.compute.toFixed(1) + ' EF pooled, jointly owned' : 'never pooled') +
        (labs.length ? '; anchor labs: ' + labs.join(', ') : '; no labs anchored'),
      '',
      'ARTICLE III - THE LEDGER',
      '  $' + Math.round(sc.capital) + 'B capital - ' + Math.round(sc.talent) + 'k researchers - ' +
        sc.langs + ' of 24 languages - ' + (S.hedges || 0) + ' cloud slices hedged',
      '',
      'signed, the convener'
    ];
    const docText = docLines.join('\n');
    const docEl = $('#gEndDoc');
    if (docEl) {
      docEl.innerHTML =
        '<div class="g-instrument"><pre>' + esc(docText) + '</pre>' +
        '<button type="button" class="g-copydoc" id="gCopyDoc">copy as text</button></div>';
      const cb = $('#gCopyDoc');
      if (cb && cb.addEventListener) cb.addEventListener('click', () => {
        const done = () => { cb.textContent = 'copied'; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(docText).then(done, done);
        } else { done(); }
      });
    }
    renderHUD();
    $('#gActions').innerHTML = '';
    const again = choiceRow('', 'Play again', '', 'A fresh sixteen months, a new Act date, new dice.', '', newGame);
    $('#gActions').appendChild(again);
    end.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- input ----------

  document.addEventListener('keydown', e => {
    if (e.key >= '0' && e.key <= '9') {
      const b = $('#gActions').querySelector('button[data-key="' + e.key + '"]');
      if (b && !b.disabled) b.click();
    }
  });

  // Import your read: story checkpoints (same-tab session) seed the game.
  function importRead () {
    const lines = [];
    if (typeof sessionStorage === 'undefined') return lines;
    let picks = {};
    try { picks = (JSON.parse(sessionStorage.getItem('afa_sim_v1') || '{}').picks) || {}; } catch (e) { return lines; }
    const p = id => picks['scene-' + id];
    if (p('berlin') === 'negotiate') { S.states.DE.ease += 0.15; lines.push('Imported from your reading: Berlin negotiated a slow walk. Germany leans closer.'); }
    if (p('berlin') === 'refuse-bloc') { S.states.DE.commit = 1; S.states.DE.ease += 0.25; lines.push('Imported from your reading: Berlin refused the act. Germany starts Hedging.'); }
    if (p('brussels') === 'eu-coalition') { S.states.FR.ease += 0.1; S.states.ES.ease += 0.1; lines.push('Imported: the case was framed as an EU coalition. Paris and Madrid lean in.'); }
    if (p('brussels') === 'eu-allies') { ['FR','ES','JP','KR','SG'].forEach(k => { S.states[k].ease += 0.1; }); lines.push('Imported: the case was framed for the allies. Doors open from Madrid to Singapore.'); }
    if (p('tokyo') === 'build-own') { S.states.JP.ease += 0.1; lines.push('Imported: Tokyo tried building alone. They remember who offered help.'); }
    if (p('tokyo') === 'coalition-model') { S.states.JP.commit = 1; lines.push('Imported: Tokyo chose the coalition model. Japan starts Hedging.'); }
    if (p('stockholm') === 'defense-commercial') { S.capBonus += 2; lines.push('Imported: the defense-plus-commercial wedge. +$2B head start.'); }
    if (p('stockholm') === 'full-stack') { S.capBonus += 3; lines.push('Imported: the full sovereign stack was chosen. +$3B head start.'); }
    if (p('ottawa') === 'eu-canada') { S.states.CA.commit = 1; lines.push('Imported: Ottawa joined early. Canada starts Hedging.'); }
    if (p('ottawa') === 'five-eyes-minus-us') { S.states.CA.commit = 1; S.states.GB.ease += 0.2; lines.push('Imported: the Five Eyes (minus one) framing. Canada starts Hedging; London listens.'); }
    if (p('paris') === 'co-leads') { S.states.FR.commit = 1; lines.push('Imported: France co-leads. France starts Hedging.'); }
    if (p('paris') === 'leads') { S.states.FR.commit = 1; S.influence += 1; lines.push('Imported: France leads. France starts Hedging and lends you a phone line (+1 influence).'); }
    return lines;
  }

  newGame();
  (function () {
    const lines = importRead();
    if (lines.length) {
      lines.forEach(t => logLine(t, 'good'));
      renderAll();
    }
  })();
  buildLogo($('#gLogo'));

  // The gauge ticks, the racks blink, the marked phrases slip, each on its
  // own quiet clock (browser only; static under reduced motion).
  if (canAnimate && !reducedMotion()) {
    setInterval(renderBoil, 600);
    setInterval(renderStack, 420);
  }
})();
