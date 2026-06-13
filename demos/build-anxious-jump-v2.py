#!/usr/bin/env python3
"""Re-approach: anxious jump v2, applying the documented pipeline.

From the original 7-keyframe v1, the prune test (pause-or-direction-change) keeps
calm / crouch / apex / landing / settle and drops launch + falling (pure mid-arc).
Each surviving segment is one continuous motion, driven by a SHAPED ease curve
(gravity feel) with overshoot/anticipation OFF — so playback lands exactly on every
directed keyframe and does not twitch (the engine's overshoot model can't land yet).
Holds are tuned for read: the apex is held longest to sell float.

Run: python3 demos/build-anxious-jump-v2.py
"""
import json, os

HERE = os.path.dirname(__file__)
V1 = json.load(open(os.path.join(HERE, "anxious-jump.motion.json")))["snapshot"]["keyframes"]

# ease curves per OUTGOING segment (anticipation/overshoot OFF; bezier in [0,1] => lands)
EASE_INOUT = {"x1":0.42,"y1":0,"x2":0.58,"y2":1}   # symmetric
EASE_OUT   = {"x1":0.16,"y1":0.7,"x2":0.3,"y2":1}   # fast then float (launch)
EASE_IN    = {"x1":0.5,"y1":0,"x2":0.84,"y2":0.4}   # hang then accelerate (fall)

def kf(src_idx, durationMs, holdMs, bezier):
    return {
        "pose": V1[str(src_idx)]["pose"],
        "durationMs": durationMs,
        "holdMs": holdMs,
        "motion": {"easingBezier": bezier, "anticipationTime": 0, "overshootTime": 0},
    }

# keep v1 indices: 0 calm, 1 crouch, 3 apex, 5 landing, 6 settle
keyframes = {
    0: kf(0, 600, 200, EASE_INOUT),  # calm -> crouch
    1: kf(1, 550, 200, EASE_OUT),    # crouch -> apex (explosive launch, decel to float)
    2: kf(3, 850, 500, EASE_IN),     # apex (held longest) -> landing (hang, then drop)
    3: kf(5, 480, 120, EASE_INOUT),  # landing -> settle (quick recover)
    4: kf(6, 600, 600, EASE_INOUT),  # settle (trailing rest)
}
total = sum(k["durationMs"] for k in keyframes.values())

snapshot = {
    "mode": "motion", "character": "animeHuman", "customBaseName": None, "selectedPart": None,
    "base": V1["0"]["pose"], "pose": V1["0"]["pose"],
    "easingBezier": EASE_INOUT, "anticipationTime": 0, "overshootTime": 0,
    "duration": total, "selectedAnchorIndex": 0, "frameRate": 12, "currentFrame": 0,
    "playbackLoop": True, "playbackPingPong": False,
    "keyframes": keyframes, "motionPaths": {}, "activePathIdByPart": {},
    "suppressedGeneratedMotionPaths": {},
}
payload = {"version": 1, "app": "motion-director", "name": "Anxious jump (v2)",
           "savedAt": "2026-06-13T00:00:00.000Z", "snapshot": snapshot}

out = os.path.join(HERE, "anxious-jump-v2.motion.json")
json.dump(payload, open(out, "w"), indent=2)
print(f"Wrote {out}: {len(keyframes)} keyframes (pruned from 7), {total}ms")
