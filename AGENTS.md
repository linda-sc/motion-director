# MotionDirector — working guide

A Voidpet tool for directing **premium-blend** 2D motion (anime-quality posed keyframes +
Disney/Illumination motion mechanics) to hand off to anime studios. Output is director's
intent — poses, arcs, timing — not rigged sprites. Built at a hackathon; now a company tool.

## Run it
`npm run dev` → http://127.0.0.1:8787 (dev server live-reloads on file change).

## How the rig actually works (important, non-obvious)
- A pose = **18 node coordinates** (head, neck, chest, stomach, hips, L/R shoulder/elbow/hand,
  L/R hip/knee/foot). Everything else (Polyman's polygon limbs/torso/head) is *derived* from
  those nodes — see `renderAnimePuppet` in `src/app.js`. The JSON only stores the nodes + paths.
- **Keyframes** = held full-body extreme poses (`holdMs` + per-segment easing).
- **motionPaths** = per-vertex arcs that move a node over a segment (own timing/anchor/offsets).
- ⚠️ Between two keyframes the body does NOT auto-interpolate. `poseForFrame` holds the anchor
  pose and only moves parts that have a motionPath. Auto-generated connectors are tagged
  `source:"layout-keyframe"`; director-drawn paths are `source:null`.
- Clips save/load as `.motion.json` snapshots via **File → Load** (`loadNamedAnimation` →
  `restoreSnapshot`). That's how a generated clip gets into the app.

## The generation + checking loop (core orchestration)
Codex acts as a junior animator; the human owns taste, the machine owns coherence:
1. **Generate** a keyframe pose (or 2–3) as structured JSON conforming to the `.motion.json` schema.
2. **Render** it on the verifier fixture `tools/pose-grid.html` — a labelled coordinate grid
   showing the **skeleton + joint dots** (the JSON truth) overlaid on the **actual Polyman**
   (the shipped artifact). Screenshot it.
3. **Check** against `hackathon/rubric.md`: Tier 0 (coherence + asymmetry, hard gate) first,
   then craft scoring. Read exact coordinates off the grid.
4. **Correct** the coordinates and re-render. Loop until Tier 0 passes and craft is acceptable.
5. **Human** judges taste / energy; **machine** never judges taste, only coherence.

Why the overlay: Polyman catches failures the skeleton hides (limb-width overlap, degenerate
derived polygons); the skeleton gives precise joint coordinates. Keep both.

## Conventions
- No dependencies. Vanilla ES modules, one big `src/app.js`. Match the surrounding style.
- Author/read poses in **skeleton** terms (node coords); verify coherence on **Polyman**.
- Favor **asymmetry** — never mirror L/R limbs (twinning reads stiff).

## Workstreams (parallel)
- **A — app features**: auto-interpolate between keyframes, grid UI. (Build interpolation first —
  it lets the gen loop emit keyframes only and skip hand-authoring connector paths.)
- **B — generation/checking loop**: this is the AI pipeline above.
- Isolate concurrent work with `git worktree add ../MotionDirector-features -b feat/interp-grid`.

## Map
- `src/app.js` — the app (rig, render, playback, save/load).
- `src/motion-format.js` — export clip schema.
- `tools/pose-grid.html` — pose verifier (skeleton + Polyman on a labelled grid).
- `hackathon/animation-protocol.md` — the full generate + review playbook (keyframe economy,
  pose-grid still review, live-app motion review). Read before authoring/reviewing a clip.
- `hackathon/` — brief, rubric, demo notes, strategy. `hackathon/export-logs.sh` — bundle session logs.
- `demos/` — example clips (`.motion.json` + standalone preview); load these to exercise review.
