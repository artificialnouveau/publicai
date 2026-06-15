// ============================================================
// CAST MARKERS, two symbolic, non-representational marks per character:
//   1. a flag (national figures) or a role glyph (the few without a nation)
//   2. a faction pip + colour for which bloc they sit in
// No avatars, no faces, no initials. Shared by the story (index.html) and the
// game (airbus-for-ai/game.html). All SVG inner-markup is authored for a fixed
// viewBox so callers just wrap it: flags "0 0 18 12", pips "0 0 10 10".
// ============================================================
(function () {
  'use strict';

  var FACT = {
    state:   { c: '#0057FF', l: 'STATE' },
    capital: { c: '#B8860B', l: 'CAPITAL' },
    lab:     { c: '#1d1a15', l: 'LAB' },
    press:   { c: '#BE1234', l: 'PRESS' },
    labor:   { c: '#2B6E4F', l: 'LABOR' },
    coalition:{ c: '#6b6256', l: 'COALITION' }
  };

  // Keyed by the story's character `art` keys.
  var MARK = {
    editor:      { role: 'news',  fac: 'press' },
    researcher:  { role: 'chip',  fac: 'labor' },
    aaron:       { role: 'law',   fac: 'lab' },
    chancellor:  { flag: 'DE',    fac: 'state' },
    pieter:      { flag: 'DE',    fac: 'state' },
    execpres:    { flag: 'EU',    fac: 'state' },
    japanpm:     { flag: 'JP',    fac: 'state' },
    proghead:    { flag: 'JP',    fac: 'lab' },
    swedishvc:   { flag: 'SE',    fac: 'capital' },
    estonian:    { flag: 'EE',    fac: 'capital' },
    skype:       { flag: 'EE',    fac: 'capital' },
    electrician: { flag: 'US',    fac: 'labor' },
    saul:        { flag: 'CA',    fac: 'state' },
    nasr:        { flag: 'CA',    fac: 'state' },
    frenchpres:  { flag: 'FR',    fac: 'state' },
    patrick:     { role: 'brief', fac: 'lab' },
    uspres:      { flag: 'US',    fac: 'state' },
    coalition:   { role: 'rings', fac: 'coalition' }
  };

  // Game dispatch cast names -> story keys.
  var NAME2KEY = {
    'The Commissioner': 'execpres',
    'The Electrician': 'electrician',
    'The German Chancellor': 'chancellor',
    'The Japanese Prime Minister': 'japanpm',
    'The Laid-off': 'researcher',
    'The President': 'uspres',
    'The Swedish VC': 'swedishvc'
  };

  // --- flags (viewBox 0 0 18 12) ---
  function band3(a, b, c) { return '<rect width="18" height="12" fill="' + a + '"/><rect y="4" width="18" height="4" fill="' + b + '"/><rect y="8" width="18" height="4" fill="' + c + '"/>'; }
  function vband3(a, b, c) { return '<rect width="18" height="12" fill="' + b + '"/><rect width="6" height="12" fill="' + a + '"/><rect x="12" width="6" height="12" fill="' + c + '"/>'; }
  function euStars() {
    var s = '';
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6;
      s += '<circle cx="' + (9 + 3.7 * Math.sin(a)).toFixed(1) + '" cy="' + (6 - 3.7 * Math.cos(a)).toFixed(1) + '" r="0.7" fill="#FFCC00"/>';
    }
    return s;
  }
  function usFlag() {
    var s = '<rect width="18" height="12" fill="#fff"/>';
    [0, 3.4, 6.8, 10.3].forEach(function (y) { s += '<rect y="' + y + '" width="18" height="1.7" fill="#B22234"/>'; });
    s += '<rect width="8" height="6.8" fill="#3C3B6E"/>';
    for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) s += '<circle cx="' + (1.7 + c * 2.4) + '" cy="' + (2 + r * 2.8) + '" r="0.5" fill="#fff"/>';
    return s;
  }
  function flag(code) {
    switch (code) {
      case 'DE': return band3('#1a1a1a', '#DD0000', '#FFCE00');
      case 'EE': return band3('#0072CE', '#16140f', '#F6F2E9');
      case 'FR': return vband3('#0055A4', '#FFFFFF', '#EF4135');
      case 'JP': return '<rect width="18" height="12" fill="#fff"/><circle cx="9" cy="6" r="3.3" fill="#BC002D"/>';
      case 'SE': return '<rect width="18" height="12" fill="#006AA7"/><rect x="5.2" width="2.1" height="12" fill="#FECC00"/><rect y="4.95" width="18" height="2.1" fill="#FECC00"/>';
      case 'EU': return '<rect width="18" height="12" fill="#003399"/>' + euStars();
      case 'US': return usFlag();
      case 'CA': return '<rect width="18" height="12" fill="#fff"/><rect width="4.4" height="12" fill="#D52B1E"/><rect x="13.6" width="4.4" height="12" fill="#D52B1E"/>'
        + '<path d="M9 2.5 L9.5 4.1 L11 3.6 L10.4 5.2 L11.9 5.5 L10.3 6.6 L11 7.1 L9.6 7.3 L9.8 8.9 L9 8 L8.2 8.9 L8.4 7.3 L7 7.1 L7.7 6.6 L6.1 5.5 L7.6 5.2 L7 3.6 L8.5 4.1 Z" fill="#D52B1E"/>';
    }
    return '';
  }

  // --- role glyphs for the few without a nation (viewBox 0 0 18 12) ---
  function glyph(g) {
    var k = '#1d1a15';
    switch (g) {
      case 'news': return '<rect x="2.5" y="2.2" width="13" height="7.6" rx="0.6" fill="none" stroke="' + k + '" stroke-width="0.9"/><rect x="3.8" y="3.5" width="3.6" height="2.8" fill="' + k + '" opacity="0.85"/><line x1="8.2" y1="3.9" x2="14" y2="3.9" stroke="' + k + '" stroke-width="0.8"/><line x1="8.2" y1="5.3" x2="14" y2="5.3" stroke="' + k + '" stroke-width="0.8"/><line x1="3.8" y1="7.4" x2="14" y2="7.4" stroke="' + k + '" stroke-width="0.8"/><line x1="3.8" y1="8.6" x2="11" y2="8.6" stroke="' + k + '" stroke-width="0.8"/>';
      case 'chip': {
        var s = '<rect x="5.5" y="3" width="7" height="6" rx="0.4" fill="none" stroke="' + k + '" stroke-width="0.9"/><rect x="7.6" y="5" width="2.8" height="2" fill="' + k + '"/>';
        for (var i = 0; i < 3; i++) { var x = 6.6 + i * 2; s += '<line x1="' + x + '" y1="1.8" x2="' + x + '" y2="3" stroke="' + k + '" stroke-width="0.7"/><line x1="' + x + '" y1="9" x2="' + x + '" y2="10.2" stroke="' + k + '" stroke-width="0.7"/>'; }
        return s;
      }
      case 'law': return '<line x1="9" y1="2.6" x2="9" y2="9.2" stroke="' + k + '" stroke-width="0.9"/><line x1="5" y1="3.6" x2="13" y2="3.6" stroke="' + k + '" stroke-width="0.9"/><path d="M5 3.6 L3.5 6.4 H6.5 Z" fill="none" stroke="' + k + '" stroke-width="0.8"/><path d="M13 3.6 L11.5 6.4 H14.5 Z" fill="none" stroke="' + k + '" stroke-width="0.8"/><line x1="6.6" y1="9.2" x2="11.4" y2="9.2" stroke="' + k + '" stroke-width="0.9"/>';
      case 'brief': return '<rect x="3.5" y="4.2" width="11" height="5.8" rx="0.6" fill="none" stroke="' + k + '" stroke-width="0.9"/><path d="M7 4.2 V3.3 a0.9 0.9 0 0 1 0.9 -0.9 h2.2 a0.9 0.9 0 0 1 0.9 0.9 V4.2" fill="none" stroke="' + k + '" stroke-width="0.9"/><line x1="3.5" y1="6.7" x2="14.5" y2="6.7" stroke="' + k + '" stroke-width="0.8"/>';
      case 'rings': return '<circle cx="7" cy="6" r="2.6" fill="none" stroke="' + k + '" stroke-width="0.9"/><circle cx="11" cy="6" r="2.6" fill="none" stroke="' + k + '" stroke-width="0.9"/>';
    }
    return '';
  }

  // --- faction pips (viewBox 0 0 10 10) in colour `col` ---
  function pip(fk, col) {
    switch (fk) {
      case 'state':   return '<rect x="2.4" y="2.4" width="5.2" height="5.2" fill="' + col + '"/>';
      case 'capital': return '<rect x="2.6" y="2.6" width="4.8" height="4.8" transform="rotate(45 5 5)" fill="' + col + '"/>';
      case 'lab':     return '<path d="M5 1.8 L8.4 8 L1.6 8 Z" fill="' + col + '"/>';
      case 'press':   return '<circle cx="5" cy="5" r="3" fill="' + col + '"/>';
      case 'labor':   return '<path d="M5 1.7 L8 3.4 L8 6.6 L5 8.3 L2 6.6 L2 3.4 Z" fill="' + col + '"/>';
      case 'coalition': return '<circle cx="5" cy="5" r="2.7" fill="none" stroke="' + col + '" stroke-width="1.4"/>';
    }
    return '';
  }

  window.CastMarks = {
    has: function (key) { return !!MARK[key]; },
    key: function (name) { return NAME2KEY[name]; },
    faceInner: function (key) { var m = MARK[key]; return m ? (m.flag ? flag(m.flag) : glyph(m.role)) : ''; },
    facOf: function (key) { var m = MARK[key]; return m ? m.fac : null; },
    color: function (key) { var m = MARK[key]; return m ? FACT[m.fac].c : '#0057FF'; },
    label: function (key) { var m = MARK[key]; return m ? FACT[m.fac].l : ''; },
    pipInner: pip
  };
})();
