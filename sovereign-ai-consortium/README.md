# Sovereign AI Consortium Decision Tree

A collaborative decision tree for thinking through the choices involved in building a sovereign AI consortium. It is a Google Apps Script web app that reads from (and writes back to) a Google Sheet, and regenerates a Google Doc summary.

## Links

- **App (UI):** https://script.google.com/macros/s/AKfycbwWaeyvCrk8hhVbWFRDvyEo6HadUCezVEb5q1TldETWcqU7jpLGTgrP9tfJiPbkYOKlZw/exec
- **Spreadsheet (decision tree data):** https://docs.google.com/spreadsheets/d/1mCEMWKQ1ZegQPJUhwcUDMOLFlmaalbI99Y0Rgd7HE9Y/edit?gid=402048757#gid=402048757
- **Document (generated summary):** https://docs.google.com/document/d/1F9rda3cfMJU4SaLLlA-aPjTIlaOlC3iX0MWOeqgjx50/edit
- **JSON API (machine-readable):** add `?api=data` to the app URL to get the full tree as JSON.

## What it does

The tree is organised as a collapsible outline:

- **Sections** (A, B, C, ...): the major themes (Political and Governance, Product and Technology, Compute and Infrastructure, Funding and Economic Model, Talent and Research, Security/Safety/Compliance, Legal/Ethical/Data Sovereignty, Outcomes and Real-World Players).
- **Questions** within each section, each with its **choices**. Sections are self-contained: a choice only links to other questions inside the same section, so the flow never jumps between sections.
- **Bringing it together:** a final section that combines the decision from each section into the overall plan.

Features:

- **My session** (pick and save your own path by name) and **Collaborative** (see how everyone's saved choices compare, with pick counts).
- **Multiple choice** per question when marked "Allow multiple".
- **Personas:** each choice can be tagged with a persona (Doomer, Accelerationist, Boomer, Open-source diehard, Safetyist, Sovereigntist, Pragmatist). Each section, and the overall profile, shows the persona your picks add up to.
- **Post-it notes** on questions and choices.
- **Editing:** add, edit, and delete sections, questions, and choices directly in the app. Deletes cascade (deleting a question removes its choices; deleting a section removes its questions and their choices).
- **Hide header** for a taller view, plus Expand all / Collapse all.

All edits are written back to the spreadsheet, and the Google Doc is regenerated to stay in sync.

## How the data is structured

The spreadsheet has these tabs:

- **Branches:** `id`, `name`, `description` (one row per section).
- **Nodes:** `id`, `branch_id`, `question`, `description`, `multi` (`yes` allows multiple choices). One row per question.
- **Options:** `id`, `node_id`, `label`, `what_it_means`, `key_tradeoffs`, `leads_to`, `persona`. One row per choice. `leads_to` points to the next question in the same section (or is blank to end there).
- **Notes:** post-it notes attached to a question or choice.
- **Sessions:** saved choices per person (`session_name`, `author`, `node_id`, `option_id`, `updated`).

You can edit the spreadsheet directly, or use the in-app controls. The app caches reads for performance and invalidates the cache on every write.

## Project files

- `Code.gs` - Apps Script backend: serves the app, reads/writes the sheet, regenerates the Doc, and exposes `?api=data`.
- `Index.html` - page structure.
- `JavaScript.html` - the front-end app (the collapsible outline, sessions, notes, editing).
- `Stylesheet.html` - styles.
- `appsscript.json` - Apps Script manifest.

## Development and deployment

This project is managed with [clasp](https://github.com/google/clasp).

```sh
# push local changes to Apps Script
clasp push -f

# publish the new version to the live deployment
clasp redeploy AKfycbwWaeyvCrk8hhVbWFRDvyEo6HadUCezVEb5q1TldETWcqU7jpLGTgrP9tfJiPbkYOKlZw -d "your message"
```

The Sheet and Doc IDs are stored as Script Properties (with defaults in `Code.gs`). The app is deployed with access set to anyone with the link, in IFRAME mode.
