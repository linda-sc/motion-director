# Opus 4.8 use (15%)

> "Did they go beyond a basic integration? Did they surface capabilities that surprised
> even us?"

The bar: Opus must be a **feature inside the product**, doing things only a model with
craft knowledge + vision + reasoning can do — not a code copilot, not a thin "generate JSON"
wrapper.

## The four capabilities (ranked by wow)

### 1. Opus as motion critic / director — THE HERO FEATURE
Opus *watches the rendered animation* (vision over the timeline frames or a playback
screenshot) and critiques it in real animation-director language, scored against
[rubric.md](rubric.md):

> "The arc on the right hand is nearly linear and the hand stops dead — no follow-through.
> Right now this reads as limited anime. A Western motion pass wants ~20% overshoot and a
> settling sleeve lag. Apply it?"

Why it surprises: Opus isn't *generating*, it's exercising **taste** against a craft rubric,
and it can *see* the result. This is also how we close the README's "editable secondary
motion" gap — Opus proposes the secondary motion (sleeve/hair/torso lag), the director
approves or redirects.

### 2. Natural-language brief → motion clip
Director types or speaks intent:
> "Gojo throws a lazy backhand — heavy sleeve follow-through, slow settle."

Opus emits a clip conforming to the existing `src/motion-format.js` schema: target part,
arc path points, cubic-bezier easing, anticipation/overshoot %, duration. The schema is
already a perfect structured-output target.

### 3. Vision: reference image → pose
Drag in a photo or an existing anime keyframe → Opus infers joint positions and seeds the
puppet pose. Directly addresses the README's "parsing JPEG annotations — not yet."
One-gesture demo opener.

### 4. Studio handoff brief
Opus turns the finished motion into the document a 2D studio actually receives — timing
charts, key extremes, spacing notes — in genga (key) / douga (in-between) vocabulary. The
bridge to the real-world use case; pure language strength.

## Recommended build for the day

- **Spine:** #2 (brief → clip) + #1 (critic → refine). These two make the loop.
- **Payoff:** #4 (studio brief) as the closing artifact.
- **Opener if time allows:** #3 (image → pose).

## Why this is "creative," concretely

- Multimodal: Opus *sees* its own output rendered and judges it.
- Domain reasoning: it applies the 12 principles + the East/West blend, not generic advice.
- Closes the loop: generation + perception + critique + structured spec, in one craft domain.
