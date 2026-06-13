# Session logs

Exported Claude Code threads, one per concern. Each is a self-contained AI log we can link directly in the submission.

## How to close out a thread into a log

When a working thread (keyframe generation, interpolation, etc.) is done:

1. In that thread, run: `/export <NN>-<slug>.md` (e.g. `/export 01-keyframe-generation.md`)
2. Move/save it into this folder if it isn't already here.
3. Commit it: `git add hackathon/logs/<file> && git commit`
4. Add a row to the table below with the link and what it demonstrates.

Keep this thread (hackathon ops) out of the submission — it's planning, not a capability log.

## Logs

| Log | Demonstrates | Status |
|---|---|---|
| _01-keyframe-generation.md_ | Opus generating anime-quality posed keyframes from an NL brief | in progress |
| _02-auto-interpolation.md_ | Auto-interpolating in-betweens between two keyframes | not started |

_(Italic = not yet exported. Replace with a link once committed.)_
