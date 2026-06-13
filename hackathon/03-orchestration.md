# Orchestration (15%)

> "Is 'done' verifiable by the model without a human: a test suite, a responding URL, a
> rubric file it can grade against? Could another team rerun the setup tomorrow on a new
> problem?"

We hit **all three** verifiability examples literally, with one loop.

## The harness: generate → validate → grade → refine

```
brief + character + rubric
        │
        ▼
  [Opus generates motion clip]  ──► structured JSON (motion-format schema)
        │
        ▼
  [validate]  schema check ............................ TEST SUITE  ✓
        │  (fail → regenerate)
        ▼
  [render]    clip loads on dev server, no errors ..... RESPONDING URL  ✓
        │
        ▼
  [grade]     Opus scores the render vs rubric.md ..... RUBRIC FILE  ✓
        │  per-dimension 0–5
        ▼
  pass threshold?  ── no ──► refine (apply critic notes) ──┐
        │ yes                                              │
        ▼                                                  └─ loop
   DONE (no human declared it done)
```

| Their phrase | Our concrete artifact |
|---|---|
| test suite | clip validates against `src/motion-format.js` (machine-checkable, deterministic) |
| responding URL | dev server at `127.0.0.1:8787` renders the clip; failure to render = fail |
| rubric file it grades against | [rubric.md](rubric.md) — East/West blend, 0–5 per dimension, pass threshold defined |

"Done" is the conjunction: **schema-valid AND renders AND rubric ≥ threshold.** A human
never says "good enough" — the threshold does.

## Why it's repeatable tomorrow on a new problem

The harness inputs are `(character, brief, rubric)`. **Everything domain-specific lives in
swappable files.** Another team:

1. swaps `rubric.md` — e.g. "classic limited anime," or "Pixar bounce," or a non-animation
   creative rubric entirely;
2. swaps the brief;
3. reruns the same loop.

Same machinery, new problem. **Our unique IP (the premium-blend rubric) is the one file we
swap** — which is exactly what makes the harness general. The loop is really a
*"natural-language creative direction → structured spec → self-graded against a swappable
rubric → refine until it passes, verified on a live render"* pattern. That generalizes far
past animation.

## Keep it simple

- The loop is a short script: generate, validate (schema), render-check (URL), grade
  (rubric), branch. No exotic infra.
- Every gate is deterministic or rubric-scored — re-runnable, no hidden human judgment.
- Log what was dropped/why on each refine pass so the run is auditable.

## Build notes / open items

- Decide the pass threshold (draft: every rubric dimension ≥ 3 AND total ≥ 18/25).
- Decide grading input: structural (read the JSON numbers — curvature, overshoot %) vs
  perceptual (vision over rendered frames). Perceptual is the wow; structural is the cheap
  deterministic backstop. Do both: structural gate first, perceptual grade second.
- Cap refine iterations (e.g. 3) and surface the best-scoring attempt if it never passes.
