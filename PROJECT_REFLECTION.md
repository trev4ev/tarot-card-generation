# AI Tarot Card Design Studio — Project Reflection

A web tool for generating tarot card designs with AI and refining them through design
controls. Core loop: **generate → inspect → tweak → branch → compare**, with every edit
recorded as a node on a git-like timeline you can rewind, fork, and copy edits between.

---

## Why this theme and approach

I chose **Theme 2: Creative & Generative Tools** to draw on my background building design
tools at Figma. The question I wanted to explore: how do users refine a design the AI
generated? Most AI design demos stop at generation — type a prompt, get an image, done. I
wanted the generation to be a starting point, with precise controls for iterating on top of
it.

That led to treating the AI's output as a **structured design document, not a picture.**
The app asks the model for a typed `Blueprint` — palette, typography, frame, background,
symbols, and which illustration to use (`src/types/blueprint.ts`). The frontend renders
that blueprint to canvas with its own Konva drawing code (`src/renderer/stub.ts`). Because
every visual property is a named field, every property is something a human can adjust
afterward.

I also wanted editing to be a sequence you can replay, so history is modeled like
version control: each edit appends a node, you can branch from any node, and you can copy a
single edit (the diff between a node and its parent) onto another branch.

---

## What makes it interesting

- **The AI never draws.** It selects one of 19 pre-rendered Major Arcana illustrations by
  `id` and fills in a structured style spec around it (`GENERATE_CARD_SYSTEM` in
  `src/ai/client.ts`). This avoids the usual problems with generated imagery —
  inconsistency, un-editability, slow round-trips — and guarantees the output maps onto
  controls the UI already drives.
- **Generated output is scoped to be editable.** The AI is constrained to a fixed schema,
  so a freshly generated card is already decomposed into the exact knobs the product
  exposes. The AI base and the human refinement layer use the same vocabulary.
- **History is a branchable tree, not an undo stack.** Branch from any node, run multiple
  branches side by side to compare, and transfer an edit between branches by replaying its
  diff.
- **Live preview doesn't pollute history.** Dragging a slider or a symbol updates the canvas
  in real time via a separate `liveBlueprint`, and only commits a new timeline node on
  release (`updateLiveBlueprint` vs. `updateSymbol`/`patchBlueprint`). One node per
  intentional edit, not one per frame of drag.

---

## Key design decisions and tradeoffs

**Scoped, sanitized AI output (the central decision).** The system prompt gives the model
an exact JSON shape and enumerated legal values for fonts, frames, motifs, textures, and
patterns. The client then re-validates every field at runtime (`sanitize()` in
`src/ai/client.ts`): each enum is checked against an allowed set and falls back to a default
if wrong, numbers are clamped, colors are regex-checked. This is what makes the refinement
loop work — the renderer and controls always agree on what's legal. Tradeoff: it caps the
AI's range to what the app supports. Right call for a refinement tool, wrong one for an
open-ended generator. (The plan called for one repair retry; deterministic sanitization is
faster and can't fail twice.)

**Curated illustrations instead of generated imagery.** I generated 19 Major Arcana
illustrations up front (`ILLUSTRATION_BRIEF.md`), stored as static PNGs, and have the AI
pick one. Tradeoff: you can only use those 19 archetypes, in exchange for consistent art,
instant rendering, and a clean split between the fixed illustration and the editable
frame/type/color/symbol layers. The smaller symbols (sun, moon, star, etc.) are still drawn
parametrically in Konva, so they stay scalable, recolorable, and movable.

**Konva over raw Canvas.** Selection depends on hit-testing, and Konva's object model gave
that essentially for free. Cost is a dependency; worth it.

**On-canvas direct manipulation.** Symbols can be dragged directly on the card: mousedown
hit-tests the symbol, drag updates `liveBlueprint` live, release commits a node and leaves
the symbol selected for fine-tuning via panel sliders (`CanvasGrid.tsx`). A small drag
threshold distinguishes a click (select) from a drag (move).

**Cross-timeline transfer, simplified.** An edit is the diff between a node and its parent;
transferring replays that diff onto a target branch (`transferEdit` + `diffBlueprints`),
done by dragging a timeline chip onto another branch. I skipped the spec'd "moved" marker
and a dedicated conflict UI — `deepMerge` applies the diff directly.

**Cuts and changes from the plan.** Mood was removed in favor of an always-on vignette;
title position is fixed at the top; the timeline uses text chips rather than thumbnails;
and the canvas shows only existing branches side by side (inactive ones dimmed) instead of
a 2×2 grid with placeholder slots.

**Demo-grade API key handling.** The app calls `claude-haiku-4-5` directly from the browser
with a `VITE_` env key and falls back to a mock client when none is set (`src/ai/index.ts`).
Fine for a local demo; a shared deployment would need a serverless proxy to hide the key.

---

## How I'd extend it

- **Multiplayer** — multiple people branching and refining the same deck live. The
  blueprint-and-diff model is a reasonable foundation, since edits are serializable diffs.
- **A richer timeline visualization** — render the actual branch tree (fork points,
  lineage, transfer origins) instead of parallel chip rows.
- **AI throughout the loop, not just at generation** — select an element and say "make this
  more ominous," or have it suggest the next edit. The `reimagineCard` and `generateSymbol`
  hooks already exist (`src/ai/client.ts`); this is about surfacing them per-element.
- **Persistence and export** (PNG/share links), both out of scope for the demo.

---

## Time spent

About **3.5 hours of work**, spread asynchronously across 3 days.

---

## Stack

React + TypeScript (strict) · Zustand · Konva · Vite · `claude-haiku-4-5` for blueprint
generation · GitHub Pages. The `Blueprint` type is the single source of truth read and
written by the renderer, controls, timeline, branches, and diff engine.
