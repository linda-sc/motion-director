# Motion Director — Claude Build Day notes

Working notes for the hackathon submission. One concern per file.

- [01-impact.md](01-impact.md) — the problem, who benefits, why it matters (35%)
- [02-opus-use.md](02-opus-use.md) — creative Opus 4.8 capabilities, beyond basic integration (15%)
- [03-orchestration.md](03-orchestration.md) — the repeatable, self-verifying harness (15%)
- [04-demo-script.md](04-demo-script.md) — the live demo run-of-show (35%)
- [rubric.md](rubric.md) — the East/West blend animation rubric. **Doubles as the orchestration artifact the model grades against.**
- [logs/](logs/README.md) — exported session logs (the AI logs we link in the submission), one per concern + how to close a thread into one.

## One-line pitch

> A director's instrument for specifying *premium-blend* 2D motion — anime-quality posed keyframes with Disney/Illumination-grade motion mechanics — and handing a studio a brief they can draw from.

## The reframe that ties it together

This is **not** a motion generator. It's a loop where **Opus acts as a junior animation director**: it proposes motion, critiques it against a craft rubric, and refines until it passes — producing a studio-ready handoff. The human directs; the model does the craft labor and self-grades the result.

## Scoring map (quick reference)

| Criterion | Weight | Our answer |
|---|---|---|
| Impact | 35% | Real bottleneck in a real industry; the builder is the actual customer |
| Demo | 35% | NL brief → motion → critic scores → auto-refine → studio brief, live |
| Opus 4.8 use | 15% | Opus as motion critic/director with craft taste + vision, not just generation |
| Orchestration | 15% | generate→validate→grade→refine loop; schema + live URL + swappable rubric |
