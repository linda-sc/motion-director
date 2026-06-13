# Animation generation + review protocol

How Claude authors a motion clip and then proves it reads well. This is the operational
playbook behind CLAUDE.md's "generation + checking loop." It scores against
[rubric.md](rubric.md) and verifies on [`tools/pose-grid.html`](../tools/pose-grid.html)
(stills) and the **live app** (motion over time).

Division of labour, unchanged: **the human owns taste, the machine owns coherence.** The
machine never judges whether a motion is good — only whether it is *coherent, un-twitchy,
and faithful to the authored extremes.*

---

## 0. The core principle (read this first)

> **The director authors EXTREMES — poses the animation passes through and holds. The tool
> owns everything BETWEEN them — arc, anticipation, overshoot, follow-through — expressed as
> per-segment timing, never as extra keyframes.**

This is the premium-blend bet: keyframes carry the *posed* (Eastern) quality; the easing/arc
engine carries the *motion mechanics* (Western). If you author the mechanics as keyframes,
the engine re-derives the same mechanic on top of a pose that already **is** the mechanic —
double application → twitch, overshoots where there should be none, anchors that don't land.

**The anti-pattern (what "too many keyframes" looks like).** Authoring a jump as
`calm · anticipation(crouch) · launch · apex · falling · landing-compress · settle` is the
anime mindset: seven held extremes. But four of those are *mechanics*, not extremes:

| Authored cel | What it actually is | Where it belongs |
|---|---|---|
| anticipation (crouch) | wind-up | anticipation easing on `calm → apex` |
| launch | start of the up-travel | the `calm → apex` segment itself |
| falling | raw interpolation | the `apex → settle` segment itself |
| landing compress | squash/overshoot | overshoot + settle easing on `apex → settle` |

So the jump is really **three extremes**: `calm → apex (held) → settle`. Anticipation is
timing on segment 1; overshoot/squash is timing on segment 2. Add a 4th key only if a beat
(e.g. a guaranteed landing squash) must be *held* regardless of timing — rare.

---

## The pipeline at a glance

Two loops. The first makes a clip **correct**; the second makes it **compelling**. Finish the
first before starting the second.

### Coherence loop (machine-checkable — Claude owns this end-to-end)
1. **Brief** — describe the motion in plain English.
2. **Generate poses** — turn the brief into key poses. Expect to *over*-produce (the anime
   instinct: too many held extremes). That's fine — pruning is step 6. Language→key-poses is
   the LLM's strength.
3. **Mock up on the grid** — render each pose on `tools/pose-grid.html` (skeleton + Polyman).
4. **Tweak to coherent** — read coordinates off the labels; fix until Tier 0 passes (limb
   lengths within ±35%, no degenerate Polyman, reads as the named beat).
5. **Bias for asymmetry + strong silhouettes** — break L/R twinning; push dynamic extremes.
6. **Prune** — for each keyframe ask: *does the motion pause or change direction here?* If it
   only connects the previous and next pose along the same arc, **delete it** (the engine
   passes through it anyway). Objective test — see §3.
7. **Re-check the survivors** — fewer keyframes, longer segments, cleaner arcs.
8. **Add timing/easing per continuous motion** — ease/overshoot belong to ONE continuous
   motion (a segment between direction-changes), opt-in, with headroom — never blanket.
   ⚠️ **Prerequisite:** overshoot/anticipation only work once the engine lands *exactly* on
   directed keyframes (see "Engine prerequisite"). Until that's fixed, drive each segment with
   a shaped ease curve (bezier kept in [0,1]) — it lands faithfully and still gives arcs +
   ease-in/out, just no overshoot excursion.

Verify with the §3 self-eval: fidelity ≤3px, zero twitch, coherence, legibility.

### 9 → 10: coherence is the floor, not the goal
A clip can pass every coherence gate and still be lifeless. Noticing that is the handoff into
the **artistry loop** (below).

> **Worked example (the anxious jump).** v1 = 7 hand-keyed poses, overshoot on → 5/7 anchors
> off by up to 59px, all 6 segments twitch. Prune drops `launch` + `falling` (pure mid-arc).
> v2 = 5 keyframes, shaped ease, overshoot off → every anchor 0px, zero twitch — but the same
> self-eval then flags twinned legs at the apex and one 62%-stretched limb. Coherence solved;
> artistry queued. See `demos/anxious-jump-before.html` and `…-after.html`.

---

## 1. Generate

1. Decide the **distinct held extremes** — the frame-worthy poses a director would pin on a
   wall. Use the fewest that tell the beat. If you're tempted to add a key that is "between
   and slightly beyond" two others, that's a mechanic — leave it to segment timing.
2. Author each extreme as **18-node skeleton coordinates** (see CLAUDE.md "How the rig works")
   conforming to the `.motion.json` schema. Author in node terms; verify on Polyman.
3. **Favor asymmetry** — never mirror L/R limbs (twinning reads stiff).
4. Set **segment timing**, not poses, for the mechanics: anticipation %, overshoot %, easing
   curve, and a hold on each anchor. Leave **headroom** (see the headroom rule in §4).

---

## 2. Review a still — the pose-grid loop (coherence of one pose)

For each authored extreme, before trusting it:

1. Render it on [`tools/pose-grid.html`](../tools/pose-grid.html) — labelled coordinate grid,
   skeleton + joint dots (the JSON truth) over the actual Polyman (the shipped artifact).
   Screenshot it.
2. Check **Tier 0 first** (hard gate): coherence (limb lengths within ±35%, no degenerate
   Polyman polygons, the pose reads as the named beat) + asymmetry.
3. Read exact coordinates off the grid labels, correct, re-render. Loop until Tier 0 passes.

The skeleton gives precise coordinates; Polyman catches failures the skeleton hides (limb
overlap, degenerate derived polygons). Keep both.

---

## 3. Review the motion — the live-app loop (coherence over time)

A screenshot can't show twitch, a soft anchor, or a dead stop. To review *motion*, drive the
running app and read the rendered pose at every frame.

**Load the clip** (its `.motion.json` snapshot) one of two ways:
- File → Load in the app (`loadNamedAnimation` → `restoreSnapshot`), or
- inject + reload (what the harness uses):
  ```js
  // in the preview page
  const p = await (await fetch('/demos/<clip>.motion.json')).json();
  localStorage.setItem('motion-director-state-v1', JSON.stringify({ version: 1, ...p.snapshot }));
  location.reload();
  ```

**Read the pose at a frame** — no debug hook needed. The timeline cels are ordered buttons;
clicking cel *i* calls `setFrame(i)`. The stage joint dots carry the node name and **world
coordinates** (the same space as the keyframe JSON):
```js
const cells = [...document.querySelectorAll('.frame-cell')].filter(b => !b.classList.contains('is-anchor-add'));
function poseAt(f) {
  cells[f].click();                                   // setFrame(f), stops playback
  const pose = {};
  document.querySelectorAll('#stage circle[data-node]').forEach(c =>
    pose[c.getAttribute('data-node')] = { x: +c.getAttribute('cx'), y: +c.getAttribute('cy') });
  return pose;
}
```
Anchor frames are the cels with class `is-anchor`; cel `aria-label` tells you `keyframe` vs
`hold` vs `motion`. (For direct `poseForFrame(f)` access without the DOM, temporarily expose
it on `window` — but remove the hook before committing.)

### The three over-time assertions

Run these for the lead extremity of each beat (e.g. the active hand/foot), plus a spot-check
of the others:

1. **Anchors land exactly.** `poseAt(anchorFrame)` must equal the authored keyframe within
   **~3px**. A soft anchor means a mechanic (overshoot/anticipation easing on the connectors)
   is bleeding into a *directed* pose — the posed extreme, the thing we must not lose, is
   being smeared. Flag and fix the timing, not the pose.

2. **No unintended reversals (twitch detector).** Within a segment, the lead extremity should
   move **monotonically along its dominant axis** (the axis with the larger anchor-to-anchor
   delta). A local reversal that isn't bounded by a keyframe is overshoot/anticipation firing
   where the director didn't ask. Allowed only when the segment explicitly opts into overshoot
   *and* has headroom.

3. **Density / mechanic-placement.** Count distinct held extremes vs keyframe count. If a
   mechanic (wind-up, overshoot, mid-travel pose) is present as its own cel rather than as
   segment timing, fail before scoring craft — it will twitch no matter how the timing is set.

---

## 4. Score — rubric.md, plus two gates this protocol adds

Tier 0 (coherence + asymmetry) and the craft dimensions live in [rubric.md](rubric.md). This
protocol adds two checks that catch the over-keyframing failure. **(Proposed — fold into
rubric.md when adopted; until then, apply them here.)**

- **Keyframe-economy gate (Tier 0, hard).** Fail if a keyframe encodes a mechanic the timing
  system owns. Heuristic for any three consecutive keys A, B, C: if B is a *wind-up* (opposite
  to C's direction from A) or an *overshoot* (beyond C) for the lead extremity, B is a mechanic
  → collapse into A→C timing. "More keyframes than distinct held extremes" → fail.
- **Easing-headroom rule (coherence).** A segment must be long enough for its easing config:
  `main action ≥ ~3 frames` *after* carving out anticipation% + overshoot%. At 12fps an
  18% + 18% curve needs ≥ ~8 frames or it is all artifact. Flag short segments as
  "no headroom → twitchy."
- **Reframed anticipation/overshoot dimensions.** Reward the mechanic being expressed as
  **segment easing**, not a discrete cel. Score 0 if it only exists because it was hand-posed
  (the engine can't reason about it and stacks on top).

---

## 5. Done gate

Stop when **all** hold:
- Tier 0 passes: coherence + asymmetry + keyframe economy + easing headroom.
- All anchors land within ~3px of their authored pose.
- No unintended reversals (no twitch).
- Craft dimensions in rubric.md are acceptable and the blend gate holds (full motion *and*
  poster-worthy extremes).

Then the **human judges taste / energy.** The machine never does.

---

## Engine prerequisite (blocks step 8)

Diagnosed 2026-06-13, then **corrected** after tracing it. `pathProgressForTime` is **correct
by design**: with overshoot on it settles at progress `settle = 1 − overshootTime` (≈0.82) and
treats progress `1.0` as the overshoot extreme *beyond* the pose — exactly how a director draws
an arc (settle-diamond, then the arrow-tip past the pose). Director-drawn paths already extend
past the pose, so they work.

The bug is **usage**: `layoutGeneratedArcPath` builds the auto-generated connector path *ending
at the keyframe* (`[start, mid, end]`, `end` = the key). So progress 1.0 = the key (no overshoot
headroom) and the settle point (0.82) lands **short** — the connector reaches the pose at ~65%
of the segment then retreats and ends ~4–26px short (more on far-traveling limbs once the IK
solver amplifies). With `overshootTime = 0`, `settle = 1.0`, so it lands exactly — which is why
the clean-ease v2 is 0px.

**Fix (small, verified):** extend the *generated* connector past the key by
`overshootTime / settle` of its length along the incoming direction, so the settle fraction
lands on the key and the bulge overshoots past it. (Verified in-app: settle error 26px → 1px,
with a real 32px overshoot bulge.) Do **not** touch `pathProgressForTime` or director-drawn
arcs. This unblocks step 8's Western mechanics.

## The artistry loop (the frontier — in design)

Coherence is machine-checkable; artistry mostly isn't. But the Disney principles in
[rubric.md](rubric.md) are codified *proxies* for appeal, and most are measurable from the pose
data or critiquable from the render. The loop **maximizes the proxies; the human supplies the
irreducible charm.** Precondition: the clip already passes the coherence loop.

1. **Name the intent as checkable targets** — turn the vibe into concrete beats with tests
   (e.g. "anxious" = the landing keeps residual asymmetric motion, not a clean stop).
2. **Compute structural artistry metrics** from `poseForFrame` (same way §3 computes twitch):
   arc curvature, asymmetry index, follow-through lag, velocity profile, silhouette spread,
   hold-to-motion ratio. Turns fuzzy "artistry" into a vector to optimize.
3. **Perceptual critique on the render** — read the filmstrip in director language for what the
   numbers miss (twinning, dead hangs, mushy silhouettes). The "Opus as motion critic" idea.
4. **Edit one change-family → re-render → re-measure** — keep if a metric improved and coherence
   didn't regress; revert otherwise.
5. **Hand to the human with a report** — "pushed arcs/silhouette to ~4/5; the emotional read is
   at my ceiling." The human judges taste, not coherence.

**Cross-clip learning:** keep a craft playbook in memory — edits that reliably move a metric
*and* survive a human taste verdict become reusable moves, so future first drafts start
stronger. **The human's taste verdicts are the training signal.**

**Honest cautions:** the proxy reward is *gameable* (max-overshoot everywhere ≠ better) — the
blend gate + a restraint check + periodic human calibration keep it honest; and Claude's vision
on motion-over-time is weak, so lean on filmstrip stills + numeric metrics, not "watching" the
loop.

## Related

- [CLAUDE.md](../CLAUDE.md) — rig internals, the terse loop, conventions.
- [rubric.md](rubric.md) — the craft standard (swap it to retarget the tool's style).
- [`tools/pose-grid.html`](../tools/pose-grid.html) — still verifier.
- [`demos/`](../demos/) — example clips (load these to exercise the review loop).
