# Premium-Blend Motion Rubric

The craft standard the model grades a motion clip against. This is both a **demo asset** and
the **orchestration artifact** the harness scores with. Swap this file to retarget the tool
to a different motion style (e.g. "classic limited anime", "Pixar bounce").

**Target:** anime-quality *posed* keyframes (Eastern strength) carrying Disney/Illumination-
grade *motion mechanics* (Western strength). Full motion that never loses a frame-worthy pose.

Score each dimension **0–5**. Pass = every dimension ≥ 3 AND total ≥ 18/25.

---

## Tier 0 — coherence + asymmetry gate (hard, checked FIRST)

Before any craft scoring, the pose/clip must pass these. Fail any → it's slop: regenerate,
do **not** score craft. This is the machine-checkable "done" gate; the human never judges it.

**Coherence (per keyframe pose):**
- Limb segment lengths stay within ~±35% of the rest figure (no stretching / teleporting).
- No node jumps discontinuously between adjacent frames.
- Polyman renders without degenerate or self-intersecting polygons — verify on
  `tools/pose-grid.html`, where the skeleton overlay must agree with the Polyman flesh.
- The pose visibly reads as the named beat (e.g. "shock" shows recoil + displaced limbs).

**Asymmetry (anti-twinning):**
- Left and right limbs must NOT mirror each other. If a limb pair has near-identical
  displacement/angle, flag *"twinned — break the symmetry."* Favor different heights/angles
  per side.

Only once Tier 0 passes do we score the craft dimensions below.

---

## Craft scoring (Tier 1)

## 1. Arcs (Western mechanic) — 0–5
Natural motion travels in curves, not straight lines.
- 0–1: path is effectively linear; reads mechanical.
- 2–3: gentle curvature on the primary arc.
- 4–5: clear, confident arc on the primary, and connected parts arc too.

## 2. Anticipation (Western mechanic) — 0–5
A wind-up before the main action, away from the action's direction.
- 0–1: action starts cold, no prep.
- 2–3: small anticipation phase present (~10–15%).
- 4–5: readable prep extreme that sells the coming action (~15–25%).

## 3. Overshoot & settle (Western mechanic) — 0–5
Action passes its target then settles back; no dead stops.
- 0–1: motion stops dead on the target.
- 2–3: slight overshoot.
- 4–5: clear overshoot + cushioned settle; the end has life.

## 4. Follow-through & overlapping action (Western mechanic) — 0–5
Secondary parts (sleeve, hair, torso, trailing limb) lag and resolve after the lead.
- 0–1: every part stops on the same frame; rigid.
- 2–3: some connected secondary motion.
- 4–5: distinct, believable lag/overlap on trailing parts.

## 5. Posed extremes / silhouette (Eastern strength — DO NOT LOSE) — 0–5
The key extremes read as strong, frame-worthy stills with clear silhouettes.
- 0–1: motion is fluid but no pose holds up as a still; "soup."
- 2–3: extremes are readable.
- 4–5: extremes are genuinely poster-worthy AND the motion between them is full.

---

## The blend gate (most important)

A clip can score high on motion (1–4) while failing the whole point if it loses the posed
beauty — or score high on posing (5) while being motionless limited-anime. **The premium
target requires BOTH halves.** If motion dimensions average ≥4 but dimension 5 ≤ 2, flag:
*"full motion but lost the anime pose quality."* If dimension 5 ≥4 but motion dimensions
average ≤2, flag: *"beautiful but it's still limited animation — add Western mechanics."*

## Grading inputs

- **Structural** (deterministic, from the clip JSON): arc curvature, anticipation/overshoot
  percentages, presence of connected secondary paths, easing curve shape.
- **Perceptual** (vision, from rendered frames): silhouette readability of extremes, overall
  "does this feel premium-blend." Use this for dimension 5 especially.
