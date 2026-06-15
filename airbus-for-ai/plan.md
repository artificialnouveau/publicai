# Airbus for AI: a minimalist text game

Proposal for a playable companion to the Airbus for AI story.

**Status: v0.1 is built.** Play it at `airbus-for-ai/game.html` (on the local server: http://localhost:8000/airbus-for-ai/game.html). Files: `game.html` (shell and styles), `game.js` (engine), `data.js` (states, events, endings). The open questions at the bottom still stand; the build follows the v0.1 scope below.

## Premise

The story's eleven chapters all orbit one question: can the middle powers assemble a credible alternative before Washington weaponizes the stack? The game hands the player that question directly. You are the convener (a composite of the Virkkunen and Macron roles): you have roughly sixteen months of story time, a phone, and ten reluctant states. The Digital Liberty Act is coming. You do not know exactly when.

The tone is the story's tone: terse diplomatic dispatches, bad news arriving at 5am, decisions made with partial information. Text first, numbers underneath.

## Player fantasy

Not a wargame and not a tycoon game. The fantasy is being the only person in the room who has read the briefing: you see the dependency data (the same FIG. 01-15 charts from the site) and have to convert it into commitments before the window closes. Every mechanic should feel like statecraft: persuasion, sequencing, and accepting that you cannot save everyone.

## Core loop (one turn = one month, Jan 2026 to Apr 2027)

1. A dispatch arrives: one or two paragraphs of in-world prose (datelined like the story chapters) describing an event.
2. The scorecard updates: the event moves numbers, visibly.
3. The player takes two actions from a small verb set.
4. The world reacts: a one-line consequence per action, then the next month begins.

Sixteen turns. A full run takes 15 to 25 minutes.

### The verb set (kept deliberately small)

- COURT a state: spend influence for a chance to raise that state's commitment one level (Out, Hedging, In). Success odds depend on its exposure and recent events.
- POOL: convert states that are In into pooled compute and capital on the scorecard (the EuroHPC move).
- FUND a lab: anchor Mistral, Cohere, or DeepL to the coalition before the Godfather offer locks them to Washington.
- HEDGE: migrate a slice of public-sector cloud off US hyperscalers; slow, but reduces endgame exposure.
- SUMMIT: spend a whole turn (both actions) for a trust bump across all Hedging states; the Brussels speech as a mechanic.
- HOLD: pass, bank one influence.

### Resources

- Influence: the action currency, gained each turn, bonus from successful events.
- Trust per state: hidden, hinted at in dispatch wording rather than shown as a number (text-game discipline: read, don't read off).
- The four scorecard tracks, identical to the site's coalition scorecard: Compute (of 5 EF), Capital (of $109B), Talent (of 60k), Languages (of 24).

### The event deck (drawn from the chapters)

| Story beat | Game event |
|---|---|
| Dublin layoffs (ch. 1, 9) | Talent windfall: a one-turn window to recruit cheaply; ignore it and talent drains to the US track. |
| Berlin ultimatum (ch. 2) | Germany jumps to Hedging but demands the coalition exclude any China-controls clause; accept or lose the bump. |
| Brussels speech (ch. 3) | Unlocks SUMMIT. |
| Tokyo hallucination (ch. 4) | Japan's trust crashes; COURT Japan is half-price for two turns (they need a partner) but pooled-model quality risk rises. |
| Stockholm / Helsing (ch. 5) | Defense wedge: FUND Helsing to convert private capital into coalition capital, at the cost of a US relations penalty. |
| Hyperion (ch. 6) | Pure dread: the US compute bar visibly grows. No action; the point is watching it. |
| Ottawa scramble (ch. 7) | Canada arrives asking to join, but only if at least two EU states are already In. |
| Paris raise (ch. 8) | France co-leads: unlock a second action slot for one turn if France is In. |
| Pentagon money (ch. 10) | The Godfather offer: any unanchored lab is removed from the FUND list, permanently. |
| Digital Liberty Act (ch. 2, 10) | The endgame trigger: lands randomly between turns 12 and 16. |

### Endings (computed from the scorecard when the Act lands)

- Fragmentation: fewer than 3 states In. Everyone signs separately. The window closed.
- Vassal stability: coalition exists but compute under 2 EF; you bought managed access, not sovereignty.
- The coalition survived: 3 of 4 tracks past 50% of target; the Ether call happens with leverage.
- Airbus for AI: all 4 tracks past 60% and a lab anchored; the final dispatch is the chapter 11 call, rewritten as a founding meeting.

Each ending renders as a final dispatch in story prose plus the player's FIG. 16: their run's scorecard, in the exact visual language of the site.

## Visualizations (reuse, don't invent)

The game uses the site's existing figure system, no new chart styles:

- The scorecard: the four tb-bar tracks, updating each turn. This is the main HUD.
- The globe: the existing right-rail globe with coalition arcs; states light up as they move Out, Hedging, In.
- Dispatch charts: events can attach an existing FIG (e.g. the Hyperion event shows FIG. 02 capital flow) as a popup, exactly like the story's numbered footnotes.
- The timeline rail: a 16-dot turn counter in the scroll-rail style, with the unknown Act window shaded.

## UI sketch

```
+--------------------------------------------------------------+
|  AIRBUS FOR AI                                  TURN 07/16   |
|  ----------------------------------------------------------  |
|  Apr.16.2027 / Berlin                                        |
|  Merz has stopped returning calls from Washington. His       |
|  office asks, quietly, what pooling would actually require.  |
|                                                              |
|  COMPUTE  [######------------]  1.5 / 5 EF                   |
|  CAPITAL  [##----------------]  $9B / $109B                  |
|  TALENT   [#########---------]  27k / 60k                    |
|  LANGUAGE [####--------------]  6 / 24                       |
|                                                              |
|  Actions remaining: 2          Influence: 3                  |
|  > 1. COURT Germany   2. POOL   3. FUND DeepL   4. HEDGE     |
+--------------------------------------------------------------+
```

Rendering: plain HTML in the site's mono/serif type system, not a canvas terminal. Choices are numbered buttons; keyboard 1-9 works.

## Scope

### v0.1 (the playable proof, ~2-3 sessions of work)
- game.html + game.js + data.js inside airbus-for-ai/, reusing ../styles.css.
- 16 turns, 6 events (Dublin, Berlin, Tokyo, Helsing, Pentagon, the Act), 10 states from the existing MEMBER_* tables in scripts.js.
- Scorecard bars and dispatch log only; no globe, no popups.
- All four endings.

### v0.2
- Globe integration, FIG popups on events, the timeline rail, hidden-trust dispatch wording, a shareable end-card ("My coalition reached 3.8 EF").

### Explicitly out of scope
- Saving, difficulty modes, sound, mobile-first layout (inherit the site's responsive behavior and accept it).

## Open questions for you

1. Should the player be a named character from the story (Virkkunen?) or an unnamed convener? Named is more evocative, unnamed is more replayable.
2. How punishing should the Act timing be? A random turn 12-16 rewards replays; a fixed turn 14 is fairer for first-time players.
3. Should failed runs end with the real data (the actual 2026 numbers) as a "this is where we are today" gut punch? It blurs fiction and advocacy, which might be exactly the point of the site, or a step too far.
4. Does this live at airbus-for-ai/game.html linked from the story's outro, or as a standalone page pitched separately?


## Field notes: europe2031.ai (June 2026)

What they do well, worth stealing:
- Distribution formats: a Spotify/podcast version and a download-as-PDF. Both are cheap for us (the story reads aloud well; the PDF is a print stylesheet away) and make the piece shareable into policy circles that do not read scrolly websites.
- A standalone summary analysis with real substance on "how we got here." Our summary.html should carry that weight: the causal chain, not just the pitch.
- Scenario crispness. Their hinges are concrete and falsifiable: what happens when a frontier open-source model drops, where pressure lands on ASML, the US rationing AI access by country. Each hinge names the actor, the trigger, and the consequence. Our chapters should hit that same specificity.

What they get wrong, which is our opening:
- Their narrative is the most likely path, and it is a ditch. It is a well-argued downer: it shows exactly what European dependence will look like, and at best it scares people. It does not tell an effective story about how Europe gets OUT. That story is ours to execute. Everything on our site (the Instrument in chapter 12, the coalition builder, the game's Airbus ending) is the way-out scenario; we should say so explicitly and engineer every page toward it.

Two hinges we are missing and should write:
1. The compute surge hinge: the moment a coalition member (or the bloc) commits to a massive compute investment. Named actor (the EU summit or the French-German pair), a number (an InvestAI-scale tranche directed into one pooled cluster rather than 27 national ones), a trigger (the Act's first compliance deadline), and a consequence (the first pooled training run gets a date). Candidate placement: a new beat between chapters 9 and 10, or an artifact (a leaked budget line) inside the Paris chapter. In the game, this is a late-window event that converts capital into EF for the first time.
2. The coalition-pulls-together hinge: now partially embodied by the Coalition Instrument artifact in chapter 12 (three articles, signable before the Act's deadline). To make it a true hinge it needs a cost and a refusal: one named state walking out of the Ether call, so the signing means something. In the game, this is the existing POOL treaty; the story should mirror its terms (Article II is the POOL mechanic in prose).

Both hinges share a discipline: name who moves, what it costs them, and what becomes possible the next morning.
