# Public AI Creative Fellowship

Static site for the interactive digital experiences produced during the [MetaGov Public AI Creative Fellowship](https://metagov.org/join/jobs/public-ai-creative-fellowship), 2025-2026, by [Ahnjili ZhuParris](https://artificialnouveau.com).

Live at [artificialnouveau.com/publicai/](https://www.artificialnouveau.com/publicai/).

## Projects

| Path | What it is |
| --- | --- |
| [`airbus-for-ai/`](airbus-for-ai/) | A near-future scenario, 11 chapters across 5 capitals, that traces what an "Airbus for AI" coalition would look like. Built from the Bennett School brief (Tan, Jackson, Berjon, Coyle, Sept 2025). Includes 11 live-data charts and an interactive coalition designer. |
| [`moreaiineedit/`](moreaiineedit/) | A satirical 90s-web catalog of real, absurd AI products. Tiered pricing, usefulness-vs-desirability chart, mystery box. |
| [`ai-governance-game/`](ai-governance-game/) | A retro-styled 36-quarter policy strategy game. Pick a stance, balance Big Tech, citizens, military, and climate factions. |
| [`ai-perspectives-survey.html`](ai-perspectives-survey.html) | An interactive survey that maps the respondent onto an archetype spectrum from accelerationist to doomer. |
| [`educational-resources/`](educational-resources/) | An index page collecting the four projects above for classroom and workshop use. |

## Structure

```
index.html                Landing page (fellowship overview, project cards)
airbus-for-ai/            Story site + interactive coalition designer
moreaiineedit/            Satirical catalog
ai-governance-game/       Strategy game
ai-perspectives-survey.html
educational-resources/    Index page
fonts/                    Embedded font files (Spectral, JetBrains Mono)
airbus-for-ai-v1/         Archived v1 of the story (kept for reference)
```

No build step. All files are static HTML, CSS, and JavaScript served from the repo root. Hosting is GitHub Pages with the custom domain `artificialnouveau.com`.

## Local preview

```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000/airbus-for-ai/` (or the project of choice).

## Credits

Fellowship: MetaGov.
Creative Technologist: Ahnjili ZhuParris.
Bennett brief: Tan, J., Jackson, B., Berjon, R. and Coyle, D. (2025). *Airbus for AI: A global strategy for public value creation.* Bennett School of Public Policy, University of Cambridge. [PDF](https://publicai.co/airbus-for-ai.pdf).
