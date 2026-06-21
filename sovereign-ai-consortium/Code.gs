// Sovereign AI Consortium Decision Tree — Apps Script backend
// Sheet and Doc IDs are set as Script Properties during deployment.

var SS_KEY  = 'SOVEREIGN_AI_SS_ID';
var DOC_KEY = 'SOVEREIGN_AI_DOC_ID';

// Default IDs (used when Script Properties are not set). These point at the
// Sheet and Doc already created for this project. Replace if you fork it.
var DEFAULT_SS_ID  = '1mCEMWKQ1ZegQPJUhwcUDMOLFlmaalbI99Y0Rgd7HE9Y';
var DEFAULT_DOC_ID = '1F9rda3cfMJU4SaLLlA-aPjTIlaOlC3iX0MWOeqgjx50';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function doGet(e) {
  // Auto-initialize properties on first load if not yet set
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(SS_KEY)) {
    var ssId = DEFAULT_SS_ID;
    var docId = DEFAULT_DOC_ID;
    if (typeof getConfiguredProperties === 'function') {
      var cfg = getConfiguredProperties();
      if (cfg.ssId)  ssId  = cfg.ssId;
      if (cfg.docId) docId = cfg.docId;
    }
    if (ssId)  props.setProperty(SS_KEY,  ssId);
    if (docId) props.setProperty(DOC_KEY, docId);
  }

  // Machine-readable JSON endpoint: ?api=data  ->  full tree as JSON
  if (e && e.parameter && e.parameter.api === 'data') {
    return ContentService
      .createTextOutput(JSON.stringify(getData()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Maintenance: strip cross-section leads_to so each section is self-contained.
  // ?action=cleanleads&dry=1 previews; ?action=cleanleads writes the change.
  if (e && e.parameter && e.parameter.action === 'cleanleads') {
    var dry = !!(e.parameter.dry && e.parameter.dry !== '0');
    return ContentService
      .createTextOutput(JSON.stringify(cleanLeadsToIntraSection(dry)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Sovereign AI Consortium — Decision Tree')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty(SS_KEY);
  if (!id) throw new Error('Spreadsheet not configured. Contact the administrator.');
  return SpreadsheetApp.openById(id);
}

function sheetToObjects(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  return values.slice(1)
    .map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
      return obj;
    })
    .filter(function(o) { return o[headers[0]]; });
}

var CACHE_KEY = 'tree_data_v1';
var CACHE_TTL = 600; // seconds

// Cached read. First call rebuilds from the sheets (~4s); subsequent calls
// (across all users) return instantly until a write invalidates the cache.
function getData() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(CACHE_KEY);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }

  var data = getDataRaw();
  try {
    var json = JSON.stringify(data);
    if (json.length < 95000) cache.put(CACHE_KEY, json, CACHE_TTL); // cache cap is 100KB
  } catch (e) {}
  return data;
}

function getDataRaw() {
  var ss = getSpreadsheet();
  getOrCreateNotesSheet(ss);
  getOrCreateSessionsSheet(ss);
  return {
    branches:     sheetToObjects(ss, 'Branches'),
    nodes:        sheetToObjects(ss, 'Nodes'),
    options:      sheetToObjects(ss, 'Options'),
    criticalPath: sheetToObjects(ss, 'CriticalPath'),
    notes:        sheetToObjects(ss, 'Notes'),
    sessions:     sheetToObjects(ss, 'Sessions')
  };
}

function invalidateCache() {
  try { CacheService.getScriptCache().remove(CACHE_KEY); } catch (e) {}
}

// ---------------------------------------------------------------------------
// Sessions — each person's saved path of choices, all in one sheet
//   columns: session_name | author | node_id | option_id | updated
// ---------------------------------------------------------------------------

function getOrCreateSessionsSheet(ss) {
  var sheet = ss.getSheetByName('Sessions');
  if (!sheet) {
    sheet = ss.insertSheet('Sessions');
    sheet.appendRow(['session_name', 'author', 'node_id', 'option_id', 'updated']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#0d1b2a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSessions() {
  var ss = getSpreadsheet();
  getOrCreateSessionsSheet(ss);
  return sheetToObjects(ss, 'Sessions');
}

// payload: { session_name, author, selections: { nodeId: optionId, ... } }
// Replaces all rows for this session_name with the current selections.
function saveSession(payload) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSessionsSheet(ss);
  var name = String(payload.session_name || '').trim();
  if (!name) throw new Error('A session name is required.');

  // Remove existing rows for this session (case-insensitive match on name)
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]).toLowerCase() === name.toLowerCase()) sheet.deleteRow(i + 1);
  }

  // Append one row per selected option
  var now = new Date().toISOString();
  var sel = payload.selections || {};
  var rows = [];
  Object.keys(sel).forEach(function(nodeId) {
    var v = sel[nodeId];
    var opts = Array.isArray(v) ? v : (v ? [v] : []);
    opts.forEach(function(optId) { if (optId) rows.push([name, payload.author || '', nodeId, optId, now]); });
  });
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
  }
  invalidateCache();
  return getSessions();
}

function deleteSession(sessionName) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateSessionsSheet(ss);
  var name = String(sessionName || '').toLowerCase();
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]).toLowerCase() === name) sheet.deleteRow(i + 1);
  }
  invalidateCache();
  return getSessions();
}

// ---------------------------------------------------------------------------
// Notes (post-its) — stored in their own sheet, keyed by target_id
//   columns: id | target_id | target_type | text | author | updated
// ---------------------------------------------------------------------------

function getOrCreateNotesSheet(ss) {
  var sheet = ss.getSheetByName('Notes');
  if (!sheet) {
    sheet = ss.insertSheet('Notes');
    sheet.appendRow(['id', 'target_id', 'target_type', 'text', 'author', 'updated']);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#0d1b2a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getNotes() {
  var ss = getSpreadsheet();
  getOrCreateNotesSheet(ss);
  return sheetToObjects(ss, 'Notes');
}

function saveNote(note) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateNotesSheet(ss);
  if (!note.id) {
    note.id = 'n' + new Date().getTime() + Math.floor(Math.random() * 1000);
  }
  note.updated = new Date().toISOString();
  upsertRow(sheet, note, ['id', 'target_id', 'target_type', 'text', 'author', 'updated']);
  invalidateCache();
  return note;
}

function deleteNote(id) {
  var ss = getSpreadsheet();
  var sheet = getOrCreateNotesSheet(ss);
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(id)) { sheet.deleteRow(i + 1); break; }
  }
  invalidateCache();
  return true;
}

function getLinks() {
  var props = PropertiesService.getScriptProperties();
  return {
    ssId:  props.getProperty(SS_KEY),
    docId: props.getProperty(DOC_KEY)
  };
}

// ---------------------------------------------------------------------------
// CRUD — each write triggers a doc regeneration
// ---------------------------------------------------------------------------

function saveBranch(branch) {
  var ss = getSpreadsheet();
  upsertRow(ss.getSheetByName('Branches'), branch, ['id','name','description']);
  invalidateCache();
  syncDocFromSheet();
  return true;
}

function saveNode(node) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Nodes');
  ensureColumn(sheet, 'multi');
  upsertRow(sheet, node, ['id','branch_id','question','description','multi']);
  invalidateCache();
  syncDocFromSheet();
  return true;
}

function saveOption(option) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Options');
  ensureColumn(sheet, 'persona');
  upsertRow(sheet, option, ['id','node_id','label','what_it_means','key_tradeoffs','leads_to','persona']);
  invalidateCache();
  syncDocFromSheet();
  return true;
}

// Append a header column to a sheet if it doesn't already have it.
function ensureColumn(sheet, name) {
  var lastCol = Math.max(1, sheet.getLastColumn());
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (header.indexOf(name) === -1) sheet.getRange(1, lastCol + 1).setValue(name);
}

// Reorder phases (branches): rewrite the Branches sheet rows in the given id order.
function reorderBranches(orderedIds) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Branches');
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return true;
  var header = values[0];
  var rows = values.slice(1).filter(function(r) { return String(r[0]) !== ''; });
  var byId = {};
  rows.forEach(function(r) { byId[String(r[0])] = r; });
  var newRows = [];
  (orderedIds || []).forEach(function(id) { if (byId[id]) { newRows.push(byId[id]); delete byId[id]; } });
  rows.forEach(function(r) { if (byId[String(r[0])]) { newRows.push(r); delete byId[String(r[0])]; } });
  if (newRows.length) sheet.getRange(2, 1, newRows.length, header.length).setValues(newRows);
  invalidateCache();
  syncDocFromSheet();
  return true;
}

function deleteItem(type, id) {
  var ss = getSpreadsheet();
  if (type === 'branch') {
    // remove the section, its questions, and those questions' choices
    var data = getDataRaw();
    var nodeIds = data.nodes.filter(function(n) { return n.branch_id === id; }).map(function(n) { return String(n.id); });
    deleteRowsWhere(ss.getSheetByName('Options'), function(r) { return nodeIds.indexOf(String(r[1])) >= 0; });
    deleteRowsWhere(ss.getSheetByName('Nodes'),   function(r) { return String(r[1]) === String(id); });
    deleteRowsWhere(ss.getSheetByName('Branches'), function(r) { return String(r[0]) === String(id); });
  } else if (type === 'node') {
    // remove the question and its choices
    deleteRowsWhere(ss.getSheetByName('Options'), function(r) { return String(r[1]) === String(id); });
    deleteRowsWhere(ss.getSheetByName('Nodes'),   function(r) { return String(r[0]) === String(id); });
  } else {
    deleteRowsWhere(ss.getSheetByName('Options'), function(r) { return String(r[0]) === String(id); });
  }
  invalidateCache();
  syncDocFromSheet();
  return true;
}

// Delete every data row (skipping the header) for which pred(row) is true.
function deleteRowsWhere(sheet, pred) {
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (pred(values[i])) sheet.deleteRow(i + 1);
  }
}

// Rewrite every option's leads_to to keep only targets inside its own section.
// Cross-section links are dropped; option-id targets resolve to their question.
// Pass dry=true to preview without writing.
function cleanLeadsToIntraSection(dry) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Options');
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return { changed: 0, details: [] };
  var header = values[0];
  var idIdx = header.indexOf('id'), nodeIdx = header.indexOf('node_id'), leadsIdx = header.indexOf('leads_to');
  if (leadsIdx < 0) return { changed: 0, details: ['no leads_to column'] };

  var data = getDataRaw();
  var nodeById = {}; data.nodes.forEach(function(n) { nodeById[n.id] = n; });
  var optById = {}; data.options.forEach(function(o) { optById[o.id] = o; });
  function resolveNode(tok) { tok = String(tok).trim(); if (nodeById[tok]) return tok; if (optById[tok]) return optById[tok].node_id; return null; }

  var changes = [];
  for (var i = 1; i < values.length; i++) {
    var oid = String(values[i][idIdx]); if (!oid) continue;
    var nodeId = String(values[i][nodeIdx]);
    var sec = nodeById[nodeId] ? nodeById[nodeId].branch_id : String(nodeId).charAt(0);
    var lt = String(values[i][leadsIdx] || '');
    if (!lt.trim()) continue;
    var kept = [];
    lt.split(/[,;]/).forEach(function(tok) {
      var rn = resolveNode(tok);
      if (rn && nodeById[rn] && nodeById[rn].branch_id === sec && rn !== nodeId && kept.indexOf(rn) < 0) kept.push(rn);
    });
    var nv = kept.join(', ');
    if (nv !== lt.trim()) { values[i][leadsIdx] = nv; changes.push(oid + ': "' + lt + '" -> "' + nv + '"'); }
  }
  if (changes.length && !dry) { sheet.getDataRange().setValues(values); invalidateCache(); syncDocFromSheet(); }
  return { changed: changes.length, dryRun: !!dry, details: changes };
}

function upsertRow(sheet, obj, cols) {
  var values = sheet.getDataRange().getValues();
  var row = cols.map(function(c) { return obj[c] !== undefined ? obj[c] : ''; });
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(obj[cols[0]])) {
      sheet.getRange(i + 1, 1, 1, cols.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

// ---------------------------------------------------------------------------
// Doc generation
// ---------------------------------------------------------------------------

function syncDocFromSheet() {
  var docId = PropertiesService.getScriptProperties().getProperty(DOC_KEY);
  if (!docId) return false;
  // Never let a doc-generation hiccup block a sheet save.
  try {
    var doc = DocumentApp.openById(docId);
    generateDoc(doc, getData());
    return true;
  } catch (err) {
    Logger.log('syncDocFromSheet failed: ' + err);
    return false;
  }
}

function generateDoc(doc, data) {
  var body = doc.getBody();
  body.clear();

  // Title block
  body.appendParagraph('Building a Sovereign AI Consortium')
    .setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('A Decision Tree for Founders, Governments, and Member Institutions')
    .setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  body.appendParagraph('');

  // How to use
  body.appendParagraph('How to Use This Decision Tree')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(
    'This document maps the major choices involved in standing up a sovereign AI consortium. ' +
    'The choices are grouped into branches. Each branch contains decision nodes. Each node poses one question, ' +
    'lists the realistic options, and points to the next decision it unlocks.'
  );
  ['Option (branch): the path you can take at that fork.',
   'What it means: the practical commitment behind the option.',
   'Key tradeoffs: what you gain and what you give up.',
   'Leads to: the downstream node that the choice forces you to confront next.']
    .forEach(function(txt) {
      body.appendListItem(txt).setGlyphType(DocumentApp.GlyphType.BULLET);
    });
  body.appendParagraph(
    'Recommended order: settle the political branch first. Product and compute follow, ' +
    'then funding, talent, security, and legal.'
  );
  body.appendParagraph('');

  // Branches
  data.branches.forEach(function(branch) {
    var branchNodes = data.nodes.filter(function(n) { return n.branch_id === branch.id; });

    body.appendParagraph('Branch ' + branch.id + '. ' + branch.name)
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
    if (branch.description) body.appendParagraph(branch.description);
    body.appendParagraph('');

    branchNodes.forEach(function(node) {
      var opts = data.options.filter(function(o) { return o.node_id === node.id; });

      body.appendParagraph(node.id + '.  ' + node.question)
        .setHeading(DocumentApp.ParagraphHeading.HEADING2);
      if (node.description) body.appendParagraph('Decision: ' + node.description);
      body.appendParagraph('');

      if (opts.length > 0) {
        var table = body.appendTable();
        var hdr = table.appendTableRow();
        ['Option (branch)', 'What it means', 'Key tradeoffs', 'Leads to'].forEach(function(h) {
          var cell = hdr.appendTableCell(h);
          cell.setBackgroundColor('#1a1a2e');
          try { cell.editAsText().setForegroundColor('#ffffff').setBold(true); } catch (e) {}
        });
        opts.forEach(function(o) {
          var r = table.appendTableRow();
          r.appendTableCell(o.label        || '');
          r.appendTableCell(o.what_it_means || '');
          r.appendTableCell(o.key_tradeoffs  || '');
          r.appendTableCell(o.leads_to       || '');
        });
        body.appendParagraph('');
      }
    });
  });

  // Critical path
  body.appendParagraph('Critical Path Summary')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(
    'If you resolve nothing else, resolve these in order. ' +
    'Each one gates the choices after it, and reversing them later is expensive.'
  );
  body.appendParagraph('');

  var sorted = (data.criticalPath || []).slice().sort(function(a, b) {
    return Number(a.step) - Number(b.step);
  });
  sorted.forEach(function(cp) {
    body.appendListItem(
      cp.step + '. ' + cp.title + ' (' + cp.node_id + '): ' + cp.description
    ).setGlyphType(DocumentApp.GlyphType.NUMBER);
  });

  body.appendParagraph('');
  body.appendParagraph(
    'A starting point, not a finished blueprint. Each node deserves its own working group and a written rationale. ' +
    'The value of the tree is forcing the order: control before product, product before funding, and trust woven through all of it.'
  );
  body.appendParagraph('');
  body.appendParagraph(
    'Auto-generated from the Decision Tree spreadsheet. To edit, use the web app or update the spreadsheet directly.'
  ).editAsText().setForegroundColor('#888888').setItalic(true).setFontSize(9);
}
