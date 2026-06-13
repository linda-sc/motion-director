# Session logs

Exported Claude Code threads, one per concern. Each is a self-contained AI log we can link directly in the submission.

## How to close out a thread into a log

When a working thread (keyframe generation, interpolation, etc.) is done:

1. In that thread, run: `/export <NN>-<slug>.md` (e.g. `/export 01-keyframe-generation.md`).
   Out-of-app sessions (e.g. claude-desktop) export raw `.jsonl` instead — those live in
   `../session-logs/` and are flattened to Markdown with `../export-session-md.py`.
2. Move/save it into this folder if it isn't already here.
3. Commit it: `git add hackathon/logs/<file> && git commit`
4. Add a row to the table below with the link and what it demonstrates.

Keep the hackathon ops thread out of the *capability* submission — it's planning, not a capability log.

## Logs

| Log | Demonstrates | Status |
|---|---|---|
| [01-keyframe-generation.md](01-keyframe-generation.md) | Build Day thread — project setup, app features, and the Opus keyframe-generation + render/check loop | exported |
| [02-auto-interpolation.md](02-auto-interpolation.md) | Auto-interpolating in-betweens between keyframes (layered backfill) | exported |
| [03-team-account-handoff.md](03-team-account-handoff.md) | Continuation notes after the previous account ran out of credits and work moved to this team account | pasted handoff log |
| [00-hackathon-ops.md](00-hackathon-ops.md) | Planning/ops — thread organization. Not a capability log; excluded from the capability submission | exported (reference only) |

These Markdown logs were flattened from the raw transcripts in `../session-logs/*.jsonl`
via `python3 hackathon/export-session-md.py <in.jsonl> <out.md> "<note>"`.

### Known gap

Keyframe generation was **never run as its own isolated thread**. It happened interleaved
inside the main Build Day session (`01-keyframe-generation.md`, ~99 turns) alongside project
setup, the rubric, and app-feature work. So `01-…` is broader than its name implies — search
it for the pose-grid render/check loop rather than expecting a clean keyframe-only transcript.
A dedicated, cleanly-scoped keyframe-generation run is still worth capturing for the submission.

### Account switch note

Work continued across accounts because the previous session ran out of credits before the
handoff was fully closed out. `03-team-account-handoff.md` preserves the pasted continuation
log from that switch, including the state review, verification notes, and rubric/protocol
discussion that did not originate as a clean exported thread.
