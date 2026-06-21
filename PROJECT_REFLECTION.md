# AI Tarot Card Design Studio — Project Reflection

A web tool for generating tarot card designs with AI and then refining them through
real design controls. The core loop is **generate → inspect → tweak → branch → compare**,
with every edit recorded as a node on a git-like timeline you can rewind, fork, and
copy edits between.

---

## Why this theme and this specific approach

I picked **Theme 2: Creative & Generative Tools** because it lines up directly with my
background working on design tools at Figma. I wanted to use that experience to explore a
question I find genuinely interesting: **how do human users refine a design that an AI
generated?** Most "AI design" demos stop at the generation step — you type a prompt, you
get an image, and that's the end of the interaction. The output is a dead end. I wanted to
build the opposite: a tool where the AI generation is the *starting point*, not the
finished product, and where a human can keep iterating on top of it with precise,
designer-grade controls.

The specific approach that fell out of that goal was to treat the AI's output as a
**structured design document, not a picture.** Instead of asking the model for an image,
the app asks it for a `Blueprint` — a fully-typed object describing palette, typography,
frame style, background texture, symbolism, mood, and which illustration to use
(`src/types/blueprint.ts`). The frontend renders that blueprint to canvas with its own
drawing code (`src/renderer/stub.ts`, using Konva). Because every visual property lives in
a named field, every property is something a human can grab and adjust afterward. The AI
gives you a strong, coherent starting card; the controls let you make it yours.

The second thing I wanted to explore was **editing as a sequence you can replay.** I was
curious about letting users pick specific edits and replay or move them within a timeline
of edits — so the app models history the way a version-control system does. Each edit
appends a node; you can preview any past node, fork a branch from any point, and even copy
a single edit (the diff between a node and its parent) onto a different branch.

---

## What makes the idea interesting or non-obvious

**The AI never draws anything.** The non-obvious move is that the model's job is selection
and specification, not illustration. It chooses one of 20 pre-rendered Major Arcana
illustrations by `id` and fills in a structured style spec around it
(`GENERATE_CARD_SYSTEM` in `src/ai/client.ts`). This sidesteps the usual problems with
generative image output — inconsistency, un-editability, slow round-trips — and guarantees
that whatever the AI produces maps cleanly onto controls the UI already knows how to drive.

**Generated output is deliberately scoped to be editable.** This was the big design
decision (more below): the AI is forced to return values that fit a fixed schema, so the
moment a card is generated it's already decomposed into the exact knobs the product
surfaces. The "AI base" and the "human refinement layer" speak the same language by
construction.

**History is a first-class, branchable structure.** The timeline isn't an undo stack — it's
a tree. You can branch from any node (not just the tip), run up to four branches side by
side in a 2×2 grid for comparison, and transfer an individual edit from one branch to
another by replaying its diff. That turns "exploring alternatives" into something
non-destructive and visual rather than a sequence of undos you can't get back.

**Live preview without polluting history.** Dragging a slider updates the canvas in real
time but does *not* create a timeline node; the new node is committed only on release
(`updateLiveBlueprint` for the live pass vs. `patchBlueprint` on commit). So the history
stays meaningful — one node per intentional edit, not one per pixel of slider travel.

---

## Key design decisions and tradeoffs

### 1. Scoped, sanitized AI output (the central decision)

The most important decision was constraining AI output to a strict format that maps onto
specific, surfaced design properties. The system prompt hands the model an exact JSON shape
and an enumerated set of legal values for fonts, frame styles, corner motifs, textures,
patterns, and weights. Then, critically, **the client re-validates every field at runtime**
rather than trusting the model (`sanitize()` in `src/ai/client.ts`): each enum is checked
against a `Set` of allowed values and falls back to a safe default if it's wrong, every
number is clamped to its valid range, and every color is regex-checked as a hex string.

- **Why:** This is what makes the "iterate on the AI's base" loop actually work. If the AI
  could emit arbitrary values, the renderer and the controls couldn't agree on what's
  legal, and a single bad field could break a card. Locking the vocabulary means the human
  refinement layer and the AI generation layer are always compatible.
- **Tradeoff:** It caps the AI's creative range — it can only choose from the fonts,
  frames, and illustrations the app already supports. I traded open-ended novelty for
  reliability and editability, which is the right call for a refinement-focused tool but
  would be wrong for a pure "wow me" generator.
- **vs. the original plan:** The engineering plan called for "one repair retry" on bad
  JSON. I went further and made sanitization deterministic — bad fields degrade gracefully
  to defaults instead of triggering a second slow API call. Faster, and it can't fail
  twice.

### 2. Curated illustration catalog instead of generated imagery

The PRD flagged icon/symbol sourcing as the highest-impact open question (Risk R1). I
resolved it by generating 20 Major Arcana illustrations up front (see
`ILLUSTRATION_BRIEF.md`), storing them as static PNGs in `public/illustrations/`, and
having the AI *pick* one rather than make one.

- **Tradeoff:** You can only make the 20 archetypes I pre-generated — a custom "card of
  broken clocks" isn't possible. In exchange I got consistent, high-quality art, instant
  rendering, and a clean separation between the fixed illustration and the fully-editable
  frame/type/color/symbol layers around it. For a demo about *refinement*, predictable art
  beats unpredictable art.
- The smaller, programmatic **symbols** (sun, moon, star, flame, etc.) are still drawn
  parametrically in Konva (`drawSymbol`), so they remain scalable, recolorable, and
  movable — the parts meant to be edited stay vector.

### 3. Konva over raw Canvas

I used Konva for rendering and hit-testing. The interaction model — selecting a title, a
frame, a symbol, the background — depends on knowing what's under the cursor, and
hand-rolling hit-testing on raw Canvas would have eaten most of the time budget. Konva's
object model gave me selection essentially for free. The cost is a dependency and some
indirection, which is well worth it here.

### 4. Where I deliberately cut scope

Working within a few hours, I prioritized the differentiating loop (generate → timeline →
branch → transfer) over breadth of controls, and consciously simplified a few things the
PRD spec'd more richly:

- **On-canvas direct manipulation was reduced to click-to-select.** The PRD wanted
  drag-to-move symbols, corner-drag-to-scale, and an opacity ring directly on the canvas. I
  shipped click-to-select with hit-testing plus panel sliders for position/scale/opacity
  (`CardCanvas` hit-test → `ControlsPanel` symbol controls). The selection overlay is drawn
  (`drawSelectionOnLayer`), but the dragging handles themselves were the cut — they're
  polish on top of an interaction model that already works.
- **Preview vs. revert collapsed into one action.** Clicking a timeline node makes it
  active and continues from there; I didn't build a separate non-destructive "preview"
  mode. History is still never truncated, so nothing is lost.
- **Cross-timeline transfer is simplified.** It computes the diff between a node and its
  parent and replays it onto the target branch's active node (`transferEdit` +
  `diffBlueprints`). I skipped the explicit target-*node* picker, the "moved" marker, and a
  dedicated conflict UI — `deepMerge` just applies the diff. The core idea (an edit is a
  portable diff) is fully there; the surrounding ceremony isn't.

### 5. Layout pivot during the build

The plan put the timelines in a stacked right-hand column. While building, that felt
cramped for horizontally-scrolling node strips, so I moved the timeline to a **full-width
horizontal panel along the bottom** (`feat(layout)` commit; `App.tsx` →
`TimelinePanel.tsx`), with one scrollable row per branch. This is a good example of letting
the implementation correct the plan once real content was on screen.

### 6. Demo-grade API key handling

The app calls `claude-haiku-4-5` directly from the browser with a `VITE_` env key, and
falls back to a mock client when no key is present (`src/ai/index.ts`). That's fine for a
local demo but would expose the key on any shared deployment — the documented next step
(Risk R2 in the plan) is a ~20-line serverless proxy, which I deferred as out of scope for
the timebox.

---

## How I'd extend this with more time

- **Multiplayer.** This is the most natural extension given the Figma framing — multiple
  people branching and refining the same deck live, with presence and shared timelines. The
  blueprint-and-diff model is already a decent foundation for it, since edits are
  serializable diffs.
- **A richer visual representation of the timeline.** Right now branches are a stack of
  horizontal strips. I'd render the real *tree* — showing where each branch forked from its
  parent, the lineage between nodes, and where transferred edits originated — so the
  history reads as a graph rather than parallel lines.
- **Iterating with AI throughout the process, not just at the start.** Today the AI is
  heaviest at generation. I'd thread it through the whole refinement loop: select an element
  and say "make this more ominous," ask it to suggest the next edit, or "re-imagine just the
  frame." The `reimagineCard` and `generateSymbol` hooks already exist
  (`src/ai/client.ts`) — this is about surfacing them as in-context, per-element actions.
- **Restoring the full on-canvas direct manipulation** (drag/scale/opacity-ring handles)
  that I scoped down, since that's where the tool would feel most like a real design app.
- **Persistence and export** (PNG/share links), both explicitly out of scope for the demo
  but obvious for any real use.

---

## Approximately how long I spent

About **3.5 hours of actual work**, spread asynchronously across 3 days. The commit history
reflects that working style — a focused initial push through the milestones (M0 scaffold →
M1 rendering → M2 branching → M3 selection → M4 transfer), then later sessions to swap in
the illustration catalog, add runtime sanitization, and pivot the timeline layout.

---

## Stack at a glance

React + TypeScript (strict mode) · Zustand for state · Konva for canvas rendering and
hit-testing · Vite · `claude-haiku-4-5` for blueprint generation · deployed to GitHub
Pages. The `Blueprint` type is the single source of truth that the renderer, controls,
timeline, branches, and diff engine all read from and write to.
