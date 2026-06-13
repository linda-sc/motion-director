# Demo script (35%) — run-of-show

Goal: prove the impact live in ~3 minutes. The judges should *see* Opus exercise craft taste,
not just emit JSON. Keep a pre-loaded fallback clip in case live generation stalls.

## Run-of-show

**0:00 — The hook (10s).**
One line: "Anime gives you gorgeous poses but limited motion. Disney gives you full motion but
simple characters. Premium shows like Arcane do both — and there's no tool to *direct* that.
This is that tool, and I use it to direct the studios we work with."

**0:10 — Seed a pose (optional opener, #3).**
Drag in a reference image of a character pose → Opus infers the pose → puppet matches.
*If risky live, skip and start from the default Polyman pose.*

**0:30 — Direct by voice/text (#2).**
Type/speak: *"Gojo throws a lazy backhand — heavy sleeve follow-through, slow settle."*
Opus emits a motion clip. It plays on the timeline. Narrate that this is a draft.

**1:10 — The wow: Opus critiques its own work (#1).**
Run the critic. Opus *watches the render* and scores it against `rubric.md`, e.g.:
> "Arc 4/5, anticipation 3/5, overshoot **2/5** — the hand stops dead, reads as limited anime.
> Follow-through 3/5, posed extremes 4/5. Recommend +overshoot, add sleeve lag."
This is the moment that wins the Opus criterion — taste + vision, not generation.

**1:40 — Auto-refine (the orchestration, live).**
Apply the notes / re-run the loop. Clip regenerates, re-validates, re-renders, re-grades —
now passes threshold. Say out loud: "No human told it that was good enough — the rubric did."

**2:20 — The payoff: studio handoff (#4).**
Generate the studio brief — timing chart, key extremes, spacing notes in genga/douga terms.
"This is what I send the studio. The round-trip just went from days to minutes."

**2:50 — The repeatability line (locks the orchestration score).**
"Everything style-specific is one file — the rubric. Swap it for 'classic limited anime' or
'Pixar bounce' and the same harness retargets. Another team reruns it tomorrow on a new
problem by swapping a brief and a rubric."

## What to have pre-loaded (de-risk the live demo)

- A known-good brief that reliably produces a gradeable clip.
- A cached "before" clip (linear, dead-stop) so the critic has something real to fail.
- A cached "after" clip in case the live refine stalls.
- The studio-brief output saved, in case generation is slow on stage.

## The three sentences that map to the three scores

1. Impact: "I built this for a real problem I have directing anime studios."
2. Opus: "Opus watches the animation and directs it with real craft taste."
3. Orchestration: "Done is verified by the model — schema, live render, rubric — and you
   retarget it by swapping one file."
