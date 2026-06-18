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

function getData() {
  var ss = getSpreadsheet();
  return {
    branches:     sheetToObjects(ss, 'Branches'),
    nodes:        sheetToObjects(ss, 'Nodes'),
    options:      sheetToObjects(ss, 'Options'),
    criticalPath: sheetToObjects(ss, 'CriticalPath')
  };
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
  syncDocFromSheet();
  return true;
}

function saveNode(node) {
  var ss = getSpreadsheet();
  upsertRow(ss.getSheetByName('Nodes'), node, ['id','branch_id','question','description']);
  syncDocFromSheet();
  return true;
}

function saveOption(option) {
  var ss = getSpreadsheet();
  upsertRow(ss.getSheetByName('Options'), option, ['id','node_id','label','what_it_means','key_tradeoffs','leads_to']);
  syncDocFromSheet();
  return true;
}

function deleteItem(type, id) {
  var ss = getSpreadsheet();
  var names = { branch: 'Branches', node: 'Nodes', option: 'Options' };
  var sheet = ss.getSheetByName(names[type]);
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(id)) { sheet.deleteRow(i + 1); break; }
  }
  syncDocFromSheet();
  return true;
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
  var doc = DocumentApp.openById(docId);
  generateDoc(doc, getData());
  return true;
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
          cell.getParagraphs()[0].editAsText()
            .setForegroundColor('#ffffff')
            .setBold(true);
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
