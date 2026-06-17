# Public AI Creative Fellowship

Static site for the interactive digital experiences produced during the [MetaGov Public AI Creative Fellowship](https://metagov.org/join/jobs/public-ai-creative-fellowship), 2025-2026, by [Ahnjili ZhuParris](https://artificialnouveau.com).

Live at [artificialnouveau.com/publicai/](https://www.artificialnouveau.com/publicai/).

## Projects

| Path | What it is |
| --- | --- |
| [`index.html`](index.html), [`summary.html`](summary.html), [`research.html`](research.html) | A near-future scenario, twelve chapters across six cities, that traces what an "Airbus for AI" coalition would look like. Built from the Bennett School brief (Tan, Jackson, Berjon, Coyle, Sept 2025). Includes 11 live-data charts and an interactive coalition designer. |
| [`sideprojects/moreaiineedit/`](sideprojects/moreaiineedit/) | A satirical 90s-web catalog of real, absurd AI products. Tiered pricing, usefulness-vs-desirability chart, mystery box. |
| [`sideprojects/ai-governance-game/`](sideprojects/ai-governance-game/) | A retro-styled 36-quarter policy strategy game. Pick a stance, balance Big Tech, citizens, military, and climate factions. |
| [`sideprojects/ai-perspectives-survey.html`](sideprojects/ai-perspectives-survey.html) | An interactive survey that maps the respondent onto an archetype spectrum from accelerationist to doomer. |
| [`educational-resources/`](educational-resources/) | An index page collecting the four projects above for classroom and workshop use. |

## Structure

```
index.html, summary.html, research.html     The Airbus for AI story, summary, and research notes (repo root)
scripts.js, styles.css, cast-markers.js     Story behaviour and styling
publicaisite/                               Landing page (fellowship overview, project cards)
educational-resources/                      Index page for classroom/workshop use
fonts/                                      Embedded YoungSerif variable font; other typefaces load from Google Fonts
airbus-for-ai/                              Interactive coalition-designer game (game.html) and source manuscript
sideprojects/
  moreaiineedit/                            Satirical catalog
  ai-governance-game/                       Strategy game
  ai-perspectives-survey.html               Archetype survey
  archived-airbus-for-ai/                   Original source materials for the story
```

No build step. All files are static HTML, CSS, and JavaScript served from the repo root. Hosting is GitHub Pages with the custom domain `artificialnouveau.com`.

## Run it locally

No build, no dependencies. Just serve the repo root over HTTP.

```bash
git clone git@github.com:artificialnouveau/publicai.git
cd publicai
python3 -m http.server 8000
```

Then open one of:

- `http://localhost:8000/` (the story + interactive designer)
- `http://localhost:8000/publicaisite/` (landing page)
- `http://localhost:8000/sideprojects/moreaiineedit/`
- `http://localhost:8000/sideprojects/ai-governance-game/`
- `http://localhost:8000/educational-resources/`

Hit Ctrl-C in the terminal to stop the server.

### Alternatives if you don't have Python 3

```bash
# Node (npm)
npx http-server -p 8000

# Or the VS Code "Live Server" extension: right-click index.html -> "Open with Live Server"
```

Hot reload isn't necessary because there's no build step; just refresh the browser after editing a file. The HuggingFace live-data chart will call the public HuggingFace API on first load and cache the result in `sessionStorage`, so it works offline after the first successful fetch.

## Credits

- Fellowship convener: [MetaGov](https://metagov.org/).
- Project partner: [Public AI](https://publicai.co/about).
- Fellowship lead: [Joshua Tan](https://metagov.org/people/joshua-tan) (MetaGov, Public AI).
- Creative Technologist Fellow: [Ahnjili ZhuParris](https://artificialnouveau.com).
- Creative Fellow: [Andy Reischling](https://www.andrewreischling.com/).
- Source brief: Tan, J., Jackson, B., Berjon, R. and Coyle, D. (2025). *Airbus for AI: A global strategy for public value creation.* Bennett School of Public Policy, University of Cambridge. [PDF](https://publicai.co/airbus-for-ai.pdf).
