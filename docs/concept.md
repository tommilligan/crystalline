# Concept

> **Origin:** this exercise was created by Bob Darius (GSK/Sanofi) — see the README's
> ["Origin"](../README.md#origin) section for the full story and a link to his write-up.

Crystal Ball is a one-page decision-making framework run as a facilitated team exercise,
traditionally drafted on a physical whiteboard. It has five columns, each representing a
phase of the process. The columns must (conceptually) be worked through **in order** the
first time, because the core discipline of the tool is: **don't evaluate ideas until you've
stopped generating them.**

See `assets/original-whiteboard-example.png` for a real, worked example from a pharma/QC
context (deciding what to do with OD test samples).

## The five phases / columns

| # | Column | Colour (original) | Purpose |
|---|--------|--------------------|---------|
| 1 | **Situation** | Red | The team defines the problem/need accurately and reaches consensus on it, before any solutioning starts. Time-boxed (~15–20 min in Bob Darius's original facilitator notes). |
| 2 | **Options** | Blue (drawn as clouds) | Pure idea generation. No idea is bad. Judgement is explicitly suspended — this is the "no hats other than the creative one" phase, borrowed directly from Six Thinking Hats. |
| 3 | **Evaluation** | White/grey | Only after ideation is exhausted, each option is assessed for its **Enabler** (what helps/supports this option) and its **Blocker** (what limits or risks it). |
| 4 | **Costs / Benefits** | White | Each option is scored across three cost dimensions (People, Time, Money) and three benefit dimensions (Quality, Service, Price). Scores sum to a total per option, giving a rough quantitative ranking alongside the qualitative Enabler/Blocker notes. |
| 5 | **Decision** | Green | The chosen option is recorded, along with a specific countermeasure for its main blocker, then signed and dated. |

## Scoring scale

Originally the physical board used an inverted scale for costs (5 = low cost, 1 = high cost)
which is easy to misread. The agreed convention going forward, to be used consistently across
**both** costs and benefits:

> **1 = bad, 5 = good** — for every dimension, without exception.

This means a *low* cost should be entered as a high score (e.g. "cheap in Money" = 5), and a
*high* quality benefit is also a high score (e.g. "great Quality" = 5). The UI should make this
legend persistently visible next to the scoring inputs, since it's the single most common point
of confusion when other people pick up the tool.

## Process notes (facilitator's own shorthand)

These are Bob Darius's own informal facilitator notes for running the exercise, and should map
directly onto UI affordances:

- **Problem. Gain consensus.** (15–20 min time-box)
- **Ideas. No idea is bad.**
- **Pro/con**
- **Score** (optional)
- **Make decision**
- **Notes on how to overcome cons** — i.e. a countermeasure for the chosen option's blocker
- **Note dissent if objections** — a place to record disagreement even after a decision is made
- **Sign and date**
- **Decision made**

## Worked example (from the source image)

- **Situation**: Reintegrate OD test samples back into final product (already filled + sealed)
- **Options generated**: 5, ranging from "return all samples to lot" to "stop OD testing entirely"
- **Scores**: 31, 31, 29, 35, 33
- **Decision**: Option 4 — use OD samples for stability/retains/QC release testing — won with the highest score (35)
- **Blocker countermeasure**: a one-time SOP change with training, to offset the "more work to implement" blocker
- **Sign-off**: Approved By + Date fields, left blank on the template until the process concludes
