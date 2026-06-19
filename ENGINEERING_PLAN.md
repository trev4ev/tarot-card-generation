# Engineering Plan — AI Tarot Card Design Studio

**Source:** `tarot-card-app-PRD.md` (Draft, demo application)
**Audience:** Implementing engineering team (assumes 3 engineers working in parallel)
**Plan type:** From-scratch build, contract-first, milestone-sequenced

---

## 1. How to read this plan

This is a fully client-side app. The architectural reality that shapes everything: **almost every feature reads from or writes to a single data structure — the Card Blueprint.** The renderer consumes it, the controls mutate it, the timeline stores sequences of it, branches hold timelines of it, and cross-timeline transfer computes diffs between instances of it.

That has one dominant consequence for how we parallelize: **we lock the Blueprint schema and a handful of interface contracts on day one, then work fans out into independent streams.** We do *not* let three engineers start building features against an unsettled schema — that guarantees rework.

The sequencing strategy is **walking skeleton first**: get the full loop (prompt → AI → blueprint → render → edit → timeline) working on a single ugly card as early as possible (M1), which retires integration risk. We then prioritize the product's differentiating features — the **timeline and branching loop (M2)** — on top of just a couple of core controls, before layering in the richer per-element controls (M3) and cross-timeline transfer (M4). We add capability in depth-first slices, not by building each subsystem to 100% in isolation.

---

## 2. Day-1 decisions (resolve before any feature work)

The PRD's "Open Questions" are not optional — three of them gate the parallel streams and must be answered in the first working session. Recommended answers below; the team should ratify or override, but must decide.

| # | Question | Recommended decision | Why it's blocking |
|---|---|---|---|
| Q4 | Canvas: raw API vs. library | **Konva.js** | Hit-testing, per-element selection, and drag/scale handles are the bulk of the interaction work. Konva gives us object model + hit detection for free. Raw Canvas means hand-building hit-testing, which adds days. This decision unblocks the entire interaction stream. |
| Q3 | AI output format | **Strict structured JSON** via system prompt + client-side schema validation + one repair retry | The renderer can only consume a typed blueprint. Natural-language parsing is unreliable. Validation/repair now lives in the AI client module on the frontend. |
| Q1 | Fonts | **Curated static list of ~10 self-hosted fonts** | Avoids licensing/loading complexity; fixes the font dropdown options so the renderer and Title controls can be built against a known enum. |
| Q2 | Icon/symbol source | **Spike required (see Risk R1).** Default: curated SVG set (~40–60 symbols) with parametric fallback shapes | Highest impact on visual quality *and* complexity. The blueprint's symbol representation depends on this answer, so it must be settled before the schema is frozen. |
| API key | How to handle the Anthropic API key | **`.env` file (gitignored) for local dev; one serverless function if ever deployed** | Calling the API directly from the browser is fine on localhost. If the demo gets a shared URL, the key must move server-side (a single ~20-line Vercel/Netlify/Cloudflare Worker function — not a real backend). See Risk R2. |

> **Action:** Q2 gets a timeboxed spike at the very start of M0 because it feeds the schema. The other three are straight decisions.

---

## 3. The central contract: Card Blueprint

Everything depends on this. It is owned collectively in M0, stewarded by one engineer thereafter, and changes to it after M0 require a team sign-off because they ripple across every stream.

A concrete starting shape (TypeScript) so streams can build against real types immediately:

```ts
type Blueprint = {
  id: string;                    // unique per node
  identity: { name: string; archetype: string; number: number | null; suit: string | null };
  palette: { background: string; primaryAccent: string; secondaryAccent: string; text: string; border: string };
  typography: {
    fontFamily: FontEnum; titleSize: number; titleWeight: WeightEnum;
    bodySize: number; bodyWeight: WeightEnum; letterSpacing: number;
    titleCase: 'upper' | 'title' | 'asGenerated'; titleAlign: 'left' | 'center' | 'right';
    titlePosition: 'top' | 'bottom' | 'overlay';
  };
  frame: { style: FrameEnum; thickness: number; cornerMotif: MotifEnum; color: string | null; innerMargin: number };
  background: { baseColor: string; texture: TextureEnum; textureDensity: number; pattern: PatternEnum; patternOpacity: number };
  symbols: Array<{ id: string; kind: string; x: number; y: number; scale: number; opacity: number; flipX: boolean; flipY: boolean }>;
  footer: { text: string; fontFamily: FontEnum; size: number; visible: boolean };
  layout: { /* title / illustration area / footer arrangement */ };
  mood: number;                  // scalar driving vignette / glow / saturation
};
```

Two derived contracts come straight off this:

- **Timeline node** = `{ blueprint: Blueprint; parentId: string | null; label: string; timestamp: number }`. Labels are auto-generated from the diff against the parent.
- **Diff** = the structured delta between two blueprints (path + old value + new value). This is the unit that cross-timeline transfer moves around, and it's what auto-generates timeline labels. Define the diff format in M0 alongside the schema — do not defer it, because the timeline (M1) already needs it for labels.

---

## 4. Interface contracts that enable parallelism

Lock these in M0. Once they exist as typed stubs, the three streams stop blocking each other.

| Contract | Shape | Consumed by |
|---|---|---|
| **Blueprint + Diff types** | Section 3 | Everyone |
| **Renderer API** | `render(blueprint, stage)`, `hitTest(x, y) → ElementRef \| null`, `renderThumbnail(blueprint) → dataURL` | Interaction, Timeline, Branching |
| **AI client module** | `generateCard(prompt) → Blueprint`; `generateSymbol(description, context) → Symbol`; `reimagineCard(blueprint, instruction) → Blueprint` — thin wrappers around direct Anthropic API calls with schema validation + one repair retry | Generation flow, symbol add/replace |
| **State store** | selectors (`activeBlueprint`, `timeline`, `branches`, `selection`) + actions (`applyEdit`, `appendNode`, `revertTo`, `branchFrom`, `transferEdit`) | Controls, Timeline, Branching, Transfer |

**Stub strategy (critical for unblocking):**
- A **mock AI client** returns canned blueprints from fixtures instantly — streams never block on real AI calls or an internet connection. Swap in the real client by changing one import. Build this in M0.
- A **renderer stub** draws a flat placeholder card but implements the real interface (including a crude hit-test). Interaction scaffolding can start before pixel-quality rendering lands.
- A set of **fixture blueprints** (3–4 hand-authored cards) is the shared dev data every stream works from.

---

## 5. Workstreams & ownership

Three streams, mapped to ~3 engineers. Compression to 2 is covered in Section 9.

**Stream B — Rendering** *(Eng 1)*
The heaviest visual stream. Blueprint → canvas rendering for every element (palette, typography, frame/corner motifs, background textures, patterns, symbols, mood/aura effects), hit-testing, on-canvas handles geometry, thumbnail rendering. Owns the Renderer API contract and the icon/symbol assets.

**Stream C — State, Data & Platform** *(Eng 2)*
Repo/tooling/CI setup, fixture blueprints, the AI client module (prompt design, JSON schema validation, repair retry, API key via `.env`), mock AI client for local dev, plus all data logic: blueprint store, timeline model (append/preview/revert), branch model (multi-timeline, 4-branch cap), diff engine (compute diff, apply diff, label generation), and cross-timeline transfer logic incl. conflict detection. Mostly pure, self-contained logic. Owns the State store, Diff, and AI client contracts.

> Combining platform setup and data logic in one stream works because platform setup front-loads into M0 and is then done — it doesn't compete with the ongoing data work.

**Stream D — UI & Interaction** *(Eng 3)*
Layout shell (3 regions, 2×2 grid, single non-scrolling screen), the context-aware controls panel (global + per-element control sets), canvas interaction wiring (hover/click/drag/deselect), timeline view UI, branch panel UI (labels/rename/collapse/placeholders). The glue stream — depends on B (hit-testing) and C (state).

> Schema stewardship is co-owned in M0; thereafter Eng 2 holds the pen since the store and diff engine are the most schema-sensitive.

---

## 6. Dependency graph

```
                         ┌──────────────────────┐
                         │  Blueprint + Diff     │  ← M0, blocks everything
                         │  schema (CONTRACT)    │
                         └──────────┬───────────┘
               ┌───────────────┬────┴───────────────────┐
               ▼               ▼                        ▼
         Renderer (B)    State/Data/Platform (C)    Layout shell (D)
         independent          independent           needs schema only
               │               │                        │
               │               ▼                        ▼
               │    AI client module + fixtures    Global controls (D)
               │               │                        │
               │               └──────────┬─────────────┘
               │                          ▼
               │         Generation flow + timeline     ◄── M1
               │         (C store + D prompt/controls)
               │                          │
               │                          ▼
               │         Branching + multi-canvas       ◄── M2
               │         (C multi-timeline + B thumbnails + D layout)
      hit-testing                         │
               │              ┌───────────┴──────────────┐
               ▼              ▼                          ▼
  Per-element selection + context panel      Cross-timeline transfer ◄── M4
  (B hit-testing + C selection + D panel)    (C diff engine + D timeline UI)
         ◄── M3
```

**Reading it:** B, C, D are fully independent once the schema is frozen. With no backend, the AI client module is a pure frontend concern owned by C — a thin wrapper around direct Anthropic API calls with client-side validation, swappable for the mock client in tests. D is the dependent stream: it front-loads layout + global controls (schema only) in M0/M1, builds timeline/branch UI in M2 against C's state, then adds the contextual per-element panel in M3 once B's hit-testing lands.

---

## 7. Milestones & sequencing

Sizes are T-shirt estimates (S/M/L) relative to team velocity, not calendar commitments — calibrate after M0. Each milestone has a hard Definition of Done that proves something end-to-end.

### M0 — Contracts & skeleton  *(blocks all parallel work; keep it short)*
The only sequential bottleneck. Get everyone in a room, settle Section 2 decisions, freeze the schema, ship the stubs.
- Repo, tooling, lint + typecheck script (C)
- Day-1 decisions ratified; icon spike done (all)
- Blueprint + Diff types committed (all, Eng 2 holds pen)
- API key in `.env` + gitignore; confirm direct Anthropic API calls work from the browser locally (C)
- Mock AI client + fixture blueprints (C)
- Renderer stub implementing the real interface (B)
- State store skeleton with typed actions/selectors (C)
- App shell renders one quadrant; a fixture blueprint draws a placeholder card (D)

**DoD:** a hardcoded fixture blueprint renders a (deliberately ugly) placeholder card on one canvas, served through the app shell, with the mock AI client returning fixtures instantly. Contracts compile.

### M1 — Vertical slice: one real card, full loop  *(retires integration risk)*
Single canvas, single timeline, no branches, global controls only.
- Real AI client module wired in: `generateCard(prompt)` calls Anthropic directly, validates JSON, retries once on bad output, returns a Blueprint (C)
- Real rendering of core elements: palette, title, footer, frame, background base, mood scalar (B — size L, ongoing)
- Generation flow: prompt input → AI client → blueprint → render → node 0 (D + C)
- Global controls (prompt, mood slider, 5 palette pickers, frame dropdown) editing blueprint → re-render (D)
- Timeline append on each edit, with diff-generated labels; preview vs. revert (C + D)

**DoD:** type a prompt, get a real generated card, change palette/mood/frame, see it re-render, see each edit appended to the timeline, click a past node to preview, revert and continue. The whole core loop works on one card.

### M2 — Timeline & branching: the core product loop
The differentiating features come next, built on top of M1's timeline and the global controls only — element-level selection is deliberately deferred to M3. Branching does not depend on per-element editing: it works entirely from the timeline, the multi-canvas layout, and the global controls already in hand.
- Fuller timeline view: thumbnails, auto-generated change labels, active-node highlight, auto-scroll to tip (C + B thumbnails + D)
- 2×2 canvas grid; up to 4 cards visible; fixed ~1:1.75 aspect; quadrant scaling (D)
- Branch from any timeline node (tip or mid-chain) → new independent timeline + new canvas (C + D)
- Multiple stacked timelines in the right column; Main on top, branches in creation order (C + D)
- Focus switching: clicking a canvas re-points the shared controls panel + focus highlight. At this stage the panel still shows only the global control set, re-pointed to the focused card (D)
- Branch labels with rename, collapse-to-thumbnail, placeholder quadrants with "Branch from…" (D)
- 4-branch cap enforced (C)
- Render scoping so up to 4 live canvases don't re-render needlessly (B + C — see Risk R4)

**DoD:** generate a card, branch from a node, get a second independent card+timeline, edit each independently with the global controls, switch focus and confirm the panel follows, preview/revert within a branch, rename/collapse branches, hit the 4-branch cap gracefully. The generate → tweak → branch → compare loop is fully playable with the core controls.

### M3 — Selection & per-element editing: the richer controls
Now that the core loop works, add depth. This is where Konva and hit-testing pay off. All of this runs per focused card, so it slots onto the multi-canvas world from M2 without rework.
- Hit-testing + element refs for symbol/title/footer/frame/background (B)
- Hover handles (bounding box, scale handle, opacity ring, edge/body highlights) (B + D)
- Click-select → context panel swaps from global to the selected element's control set (D)
- All per-element control tables from the PRD: Symbol, Title, Footer, Border/Frame, Background (D)
- Direct manipulation: drag-to-move, corner-drag-to-scale, opacity-ring-drag — with panel/canvas two-way sync (B + D)
- AI symbol operations: Replace, Add another — calls `generateSymbol()` on the AI client (C + D)
- Background textures + pattern overlays + frame styles/corner motifs rendered (B)

**DoD:** on any focused card, select an element, edit it via the contextual panel, drag/scale/adjust opacity on-canvas with the panel staying in sync, add and replace symbols via AI, click empty canvas to return to global controls. Per-element edits append to the timeline and branch like any other edit.

### M4 — Cross-timeline edit transfer
- Copy edit: capture a node's diff vs. its parent (C)
- Target picker: choose target timeline + node (D)
- Apply diff → new node in target timeline (C)
- Move edit: same as copy + cosmetic "moved" marker on source (C + D)
- Conflict handling: inline error when a diff references a parameter absent in the target (`"This edit couldn't be applied — [param] is incompatible…"`) (C + D)

**DoD:** copy an edit from one branch onto a node in another and see it apply as a new node; move an edit and see the source marked; trigger and surface a clean conflict error.

### M5 — Visual polish & hardening
- Full texture/pattern/frame/corner-motif fidelity; mood/aura effects (vignette, glow, saturation) (B)
- Collapsible control sections; auto-scroll timelines to active node; empty-state polish (D)
- Performance pass on multi-canvas rendering (B + C)
- Bug bash, conflict/edge-case sweep, prompt-quality tuning (all)

**DoD:** demo-ready. The single-screen layout holds, four branches render smoothly, the visual quality clears the bar set in the icon spike.

---

## 8. Risks & mitigations

**R1 — Icon/symbol rendering (highest).** The PRD flags this as the biggest lever on quality and complexity, and it feeds the schema. *Mitigation:* timeboxed spike at the very start of M0 comparing (a) curated static SVG set, (b) AI-generated SVGs, (c) parametric placeholder shapes. Default to a curated SVG set with parametric fallback. Freeze the symbol representation in the schema only after this lands.

**R2 — API key exposure if the demo gets a shared URL.** Calling the Anthropic API directly from the browser is safe on localhost but exposes the key in any deployed environment — it's visible in DevTools request headers to anyone with the URL. *Mitigation:* add a single serverless proxy function (Vercel/Netlify/Cloudflare Worker, ~20 lines) before any shared deployment. This is an hour of work, not a new workstream — the AI client module's fetch URL just changes from `api.anthropic.com` to the proxy. In the meantime, set a spend limit on the dev key in the Anthropic console.

**R3 — AI returning invalid/unstable JSON.** *Mitigation:* strict JSON schema in the system prompt, client-side validation in the AI client module, one repair retry, and a safe fallback blueprint. The mock AI client means no stream is ever blocked on AI flakiness during development.

**R4 — Hit-testing complexity if raw Canvas is chosen.** *Mitigation:* adopt Konva (Q4) so selection/handles come from the object model. If the team overrides to raw Canvas, add ~M-size to Stream B and start hit-testing in M0, not M2.

**R5 — Performance with 4 live canvases re-rendering on every edit.** *Mitigation:* scope re-renders to the focused/edited card; render thumbnails off the blueprint, not by snapshotting live canvases; layer-cache static elements (frame/background) in Konva. Bake this into the store/renderer interface in M0 rather than retrofitting in M5.

**R6 — Diff engine edge cases for transfer.** *Mitigation:* keep the diff format explicit (path/old/new) from M0; write a small number of focused tests covering apply-clean, apply-conflict, and round-trip (compute → apply) — these are the one set of bugs that are genuinely invisible during normal demo use. The PRD explicitly waives auto-resolution, so scope conflict handling to detect-and-report only.

**R7 — Schema churn after M0.** *Mitigation:* contract-first M0, single steward (Eng 2), team sign-off for post-M0 changes. The vertical slice in M1 surfaces most schema gaps early while they're cheap.

---

## 9. Staffing scenarios

**3 engineers (ideal):** Streams B/C/D as written. B and D are the long poles.

**2 engineers:** One owns State/Data/Platform + AI client (C); one owns Rendering + UI/Interaction (B+D). Expect M3 and M4 to serialize rather than overlap. Cut M4 (cross-timeline transfer) first if timeboxed — it's the most self-contained feature to drop for a demo.

---

## 10. Code quality approach

This is a demo, not a production system — a full test suite would be over-engineering. Quality comes from three lighter-weight practices that compound well.

**TypeScript strict mode as the primary safety net.** Enable `strict: true` from day one. The Blueprint type is the single source of truth for the whole app; if it compiles, most categories of cross-stream bugs are already caught. Enums for `FrameStyle`, `TextureType`, `FontFamily`, etc. eliminate entire classes of typos and invalid states at zero runtime cost and give the team confidence to move fast.

**Clear module boundaries and precise naming over inline comments.** Each stream owns a clean module: the AI client, the state/diff engine, the renderer, and the UI layer. Functions should be named precisely enough that a reader understands what they do without comments — `applyDiffToBlueprint(diff, target)` rather than `apply(d, t)`. Reserve comments for genuinely non-obvious decisions (why a specific Konva layering choice was made, why the repair retry is capped at one). A new engineer reading the code should be able to trace the generate → edit → timeline → branch flow without a guide.

**A small number of targeted tests on the diff engine only.** The diff compute/apply/conflict logic is the one place where bugs are genuinely invisible during normal demo use — a silent wrong value propagates through the timeline without any obvious visual symptom. Write a handful of focused tests covering: applying a clean diff, applying a conflicting diff, and round-tripping (compute → apply → same blueprint). Everything else is verified through normal use of the running app.

The **mock AI client and fixture blueprints** serve double duty as the primary dev tool and de-facto manual harness. Swapping in the real AI client and confirming the same flow works end-to-end is the integration check.

---

## 11. First-week checklist

1. Hold the decisions session; ratify Q1/Q3/Q4, settle the API key `.env` approach, and kick off the Q2 icon spike.
2. Freeze the Blueprint + Diff TypeScript types and merge them.
3. Stand up repo, lint + typecheck script, confirm direct Anthropic API calls work from the browser locally, build mock AI client + fixture blueprints.
4. Ship the renderer stub and state-store skeleton against the real interfaces.
5. Confirm the M0 DoD (ugly placeholder card renders through the shell), then green-light the B/C/D fan-out toward the M1 vertical slice.
