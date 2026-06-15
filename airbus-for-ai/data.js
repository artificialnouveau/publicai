// Airbus for AI, the negotiation game: data.
// States, labs, events and endings. Numbers mirror the illustrative
// per-member tables used by the story site's coalition simulator.

window.GAME_DATA = (function () {

  // Turn 1 = Jan 2026 ... Turn 16 = Apr 2027.
  const MONTHS = [
    'Jan.2026', 'Feb.2026', 'Mar.2026', 'Apr.2026', 'May.2026', 'Jun.2026',
    'Jul.2026', 'Aug.2026', 'Sep.2026', 'Oct.2026', 'Nov.2026', 'Dec.2026',
    'Jan.2027', 'Feb.2027', 'Mar.2027', 'Apr.2027'
  ];

  // commitment: 0 = Out, 1 = Hedging, 2 = In.
  // ease: baseline odds modifier for COURT (higher = easier to move).
  const STATES = {
    FR: { name: 'France',      cap: 3.0, ef: 0.2, talent: 10, langs: ['FR'],             ease: 0.70, blurb: 'Wants to lead, not to follow.' },
    DE: { name: 'Germany',     cap: 2.0, ef: 1.0, talent: 12, langs: ['DE'],             ease: 0.45, blurb: 'The compute. Will not cross China.' },
    ES: { name: 'Spain',       cap: 0.6, ef: 0.3, talent: 4,  langs: ['ES'],             ease: 0.65, blurb: 'Eager, underfunded.' },
    SE: { name: 'Sweden',      cap: 0.6, ef: 0.5, talent: 3,  langs: ['SV','DA','FI'],   ease: 0.60, blurb: 'Brings the Nordics with it.' },
    CH: { name: 'Switzerland', cap: 0.8, ef: 0.1, talent: 5,  langs: ['IT','DE','FR'],   ease: 0.50, blurb: 'Neutral until it is profitable not to be.' },
    GB: { name: 'UK',          cap: 4.5, ef: 0.5, talent: 14, langs: [],                 ease: 0.40, blurb: 'The capital. Feels the Atlantic pull.' },
    CA: { name: 'Canada',      cap: 2.0, ef: 0.4, talent: 8,  langs: ['FR'],             ease: 0.50, blurb: 'Will move once Europe proves serious.' },
    JP: { name: 'Japan',       cap: 2.0, ef: 0.7, talent: 9,  langs: [],                 ease: 0.40, blurb: 'Burned once by its own model.' },
    KR: { name: 'South Korea', cap: 1.5, ef: 0.3, talent: 6,  langs: [],                 ease: 0.50, blurb: 'Watches Japan before it moves.' },
    SG: { name: 'Singapore',   cap: 1.0, ef: 0.1, talent: 3,  langs: [],                 ease: 0.55, blurb: 'Small, rich, exposed.' }
  };

  const EU_STATES = ['FR', 'DE', 'ES', 'SE'];

  const LABS = {
    mistral: { name: 'Mistral', home: 'FR', cap: 2, talent: 3 },
    cohere:  { name: 'Cohere',  home: 'CA', cap: 2, talent: 3 },
    deepl:   { name: 'DeepL',   home: 'DE', cap: 2, talent: 3 }
  };

  // Scorecard targets (US level, displayed) and goal lines (credible minimum,
  // used by the endings).
  const TRACKS = {
    compute:  { label: 'Compute',   target: 5,   goal: 3,  unit: ' EF',  fmt: v => '~' + v.toFixed(1) },
    capital:  { label: 'Capital',   target: 109, goal: 20, unit: 'B',    fmt: v => '$' + Math.round(v) },
    talent:   { label: 'Talent',    target: 60,  goal: 36, unit: 'k',    fmt: v => String(Math.round(v)) },
    langs:    { label: 'Languages', target: 24,  goal: 7,  unit: '',     fmt: v => String(Math.round(v)) }
  };
  const BASE_LANGS = ['EN', 'FR', 'ES']; // frontier models already cover these
  // The 24 official EU languages in the story site's grid order, and the
  // 8 with partial frontier coverage today (same data as the language chart).
  const ALL_LANGS = ['EN','FR','ES','DE','IT','NL','PT','PL','SV','DA','FI','EL',
                     'CS','HU','RO','BG','HR','SK','SL','LT','LV','ET','MT','GA'];
  const BASE_PARTIAL = ['DE','IT','NL','PT','PL','SV','DA','FI'];

  // Scripted events, keyed by turn. Fields:
  //   city, title, prose; choice {label, cost, note, apply}; auto(fn) applied on arrival.
  const EVENTS = {
    1: {
      city: 'Dublin',
      title: 'The layoffs',
      cast: [{ n: 'The Laid-off', c: 'four thousand researchers, briefly free agents' }],
      fx: { phrase: 'severance under NDA', type: 'glitch' },
      prose: 'OpenAI clears out its European offices floor by floor. Brown cardboard boxes, security escorts, severance under NDA. Some of the best policy and research people on the continent are suddenly, briefly, available.',
      choice: {
        label: 'Recruit the laid-off (+4k talent)',
        cost: 1,
        brief: 'One-time window, this month only. +4k researchers straight onto the ledger.',
        note: 'Your people meet them at the door, contracts in hand. Four thousand researchers stay on this side of the Atlantic.',
        declined: 'By Friday the laid-off have signed with the US labs’ London offices. Four thousand researchers, gone west after all.',
        declinedShort: 'the Dublin recruits (+4k talent)',
        apply: s => { s.talentBonus += 4; }
      }
    },
    3: {
      city: 'Brussels',
      title: 'The speech',
      cast: [{ n: 'The Commissioner', c: 'true believer, twice ignored' }],
      fx: { phrase: 'dependency numbers', type: 'glitch' },
      prose: 'The Commissioner throws out her prepared remarks and tells the room what the dependency numbers actually mean. Some of the crowd walks out. The ones who stay are the ones you can work with. SUMMIT is now available: spend a whole month to warm every hedging capital at once.',
      auto: s => { s.summitUnlocked = true; }
    },
    4: {
      city: 'Berlin',
      title: 'The condition',
      cast: [{ n: 'The German Chancellor', c: 'cornered ally, 1.0 EF in his gift' }],
      fx: { phrase: 'no China-controls clause, ever', type: 'glitch' },
      prose: 'Berlin calls back at 5am. The Chancellor will engage, but he has one condition: the coalition takes no China-controls clause, ever. His economy cannot survive one. Accept, and Germany starts hedging toward you.',
      choice: {
        label: 'Accept the condition (Germany starts hedging)',
        cost: 1,
        brief: 'Germany moves to Hedging now and stays easier to court all game. Germany is the single biggest compute prize (1.0 EF).',
        note: 'No China clause. The Chancellor moves Germany to the hedging column and stops returning Washington’s calls.',
        declined: 'Berlin reads your silence as a China clause in waiting. The Chancellor keeps Washington on speed dial.',
        declinedShort: 'Berlin’s condition (easy path to 1.0 EF)',
        apply: s => { if (s.states.DE.commit < 1) s.states.DE.commit = 1; s.states.DE.ease += 0.25; }
      }
    },
    6: {
      city: 'Tokyo',
      title: 'The hallucination',
      cast: [{ n: 'The Japanese Prime Minister', c: 'iron politician, burned by her own model' }],
      fx: { phrase: 'never happened', type: 'glitch' },
      prose: 'Japan’s sovereign model invents a Chinese export squeeze that never happened. Markets sell off before anyone checks the source. The Prime Minister goes on television twice in one week. A government that proud does not ask for help, but it would accept some.',
      choice: {
        label: 'Send a stabilization team (Japan starts hedging)',
        cost: 1,
        brief: 'Japan moves to Hedging and becomes much easier to court (0.7 EF, $2B, 9k researchers if they come In).',
        note: 'Your engineers spend three weeks in Nagatacho. Nothing is announced. Japan starts taking your calls first.',
        declined: 'Tokyo stabilizes alone, and remembers who did not call.',
        declinedShort: 'Tokyo’s open door (0.7 EF, 9k)',
        apply: s => { if (s.states.JP.commit < 1) s.states.JP.commit = 1; s.states.JP.ease += 0.3; }
      },
      auto: s => { s.states.JP.ease += 0.1; }
    },
    7: {
      city: 'Stockholm',
      title: 'The liferaft',
      cast: [{ n: 'The Swedish VC', c: 'kingmaker, streaming fortune, guilty conscience' }],
      fx: { phrase: 'a wedge, not a solution', type: 'glitch' },
      prose: 'Ek’s people pass a single sheet of paper around a room overlooking the frozen Baltic. A multilateral defense company, Helsing at the center, private capital up front. It is a wedge, not a solution. But wedges open doors.',
      choice: {
        label: 'Back the Helsing plan (+$6B capital)',
        cost: 2,
        brief: 'The single biggest capital injection in the game: +$6B now, and Sweden and Switzerland both become easier to court.',
        note: 'The raise closes in nine days. Defense money is the first money that has ever moved at your speed. Stockholm and Zurich both noticed.',
        declined: 'The round closes oversubscribed without you. Defense money found another table.',
        declinedShort: 'the Helsing raise (+$6B)',
        apply: s => { s.capBonus += 6; s.states.SE.ease += 0.2; s.states.CH.ease += 0.2; }
      }
    },
    8: {
      city: 'Monroe, LA',
      title: 'Hyperion',
      cast: [{ n: 'The Electrician', c: 'union local, sees everything, says nothing' }],
      fx: { phrase: 'calling it Hyperion', type: 'glitch' },
      prose: 'Photographs circulate of a building in Louisiana that pulls more power than a mid-sized country. They are calling it Hyperion. Twenty-seven billion dollars, a few thousand union electricians, and no one you can call. There is nothing to decide this month. That is the point.',
      auto: s => { s.efTarget = 5.5; }
    },
    9: {
      city: 'Ottawa',
      title: 'The visitor',
      prose: null, // built dynamically: depends on EU membership
      auto: null
    },
    11: {
      city: 'Paris',
      title: 'The raise',
      prose: null, // built dynamically: depends on France
      auto: null
    },
    12: {
      city: 'Washington',
      title: 'The Godfather offer',
      cast: [{ n: 'The President', c: 'the godfather, trillion-dollar budget' }],
      fx: { phrase: 'size undisclosed', type: 'glitch' },
      prose: 'The heads of the frontier labs take turns shaking the President’s hand. A strategic investment, size undisclosed, one condition. Every lab you have not anchored is now a defense contractor with a trillion-dollar patron. They will not be returning your calls.',
      auto: null // handled in engine: removes unanchored labs
    }
  };

  // Quiet months draw one of these (in order, cycling).
  const FILLERS = [
    { city: 'Brussels',  prose: 'A working group produces a forty-page annex on procurement language. Somewhere in it, three useful sentences. Your staff finds them.' },
    { city: 'Frankfurt', prose: 'Another European founder announces, with regret and a fresh Delaware C-corp, that the future is being built elsewhere.' },
    { city: 'Dublin',    prose: 'The empty desks at the old OpenAI office have been bought by a fintech. The whiteboards still have the diagrams on them.' },
    { city: 'Geneva',    prose: 'A polite note from the Swiss: they are watching with great interest. The Swiss are always watching with great interest.' },
    { city: 'Warsaw',    prose: 'A ministry quietly migrates its document stack to a US hyperscaler. The press release calls it modernization.', fx: { phrase: 'modernization', type: 'glitch' } },
    { city: 'The Hague', prose: 'Your counterparts ask, off the record, what happens if the Americans simply turn it off. You give the honest answer: nobody knows.', fx: { phrase: 'nobody knows', type: 'glitch' } }
  ];

  // Tension fillers once the Act window opens (turn 13+, if the Act has not landed).
  const WINDOW_FILLERS = [
    { city: 'Washington', prose: 'A draft of something called the Digital Liberty Act is circulating. Nobody who has read it will describe it on the record. Everybody who has read it has stopped sleeping.', fx: { phrase: 'Digital Liberty Act', type: 'redact' } },
    { city: 'Berlin',     prose: 'Comms with Washington have gone quiet. Not hostile. Quiet. The Chancellor’s office asks if your timeline can move up. It cannot. You say it can.', fx: { phrase: 'gone quiet', type: 'glitch' } },
    { city: 'Paris',      prose: 'The Elysee wants to know, hour by hour, who is in. The list you send is the list there is.', fx: { phrase: 'the list there is', type: 'glitch' } }
  ];

  const ENDINGS = {
    fragmentation: {
      title: 'FRAGMENTATION',
      prose: 'The Act lands on a continent of bilateral deals. Each capital signs separately, each extracts one face-saving concession, and by summer the only argument left is over who folded first. The frog never noticed the water. {STATS}'
    },
    vassal: {
      title: 'VASSAL STABILITY',
      prose: 'The coalition exists. It has a flag, a secretariat, and no machine room. When the Act lands, your members get the managed-access tier and a yearly audit from the Department of Commerce. You bought a seat at the table. The table is in Washington. {STATS}'
    },
    survived: {
      title: 'THE COALITION SURVIVED',
      prose: 'When the Act lands, the call assembles in minutes, and this time nobody asks whether anyone signed. They ask when the pooled cluster comes online. There is a real number to give. The leverage is thin, but it is leverage, and eighteen months ago there was none. {STATS}'
    },
    negotiated: {
      title: 'NEGOTIATED VASSALAGE',
      prose: 'You called first, so the terms are real: managed access with carve-outs, audits with notice, a seat at someone else\u2019s table. Your members keep their clouds and lose the argument. It is comfortable. It is someone else\u2019s comfort. {STATS}'
    },
    airbus: {
      title: 'AIRBUS FOR AI',
      prose: 'The Act lands and bounces. Your members answer with one voice, one cluster, one anchored lab, and a hiring pipeline that runs toward Europe for the first time in a decade. In Washington someone asks who authorized this. Nobody did. That was the whole idea. {STATS}'
    }
  };


  return { MONTHS, STATES, EU_STATES, LABS, TRACKS, BASE_LANGS, ALL_LANGS, BASE_PARTIAL, EVENTS, FILLERS, WINDOW_FILLERS, ENDINGS };
})();
