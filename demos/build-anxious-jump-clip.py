#!/usr/bin/env python3
"""Build demos/anxious-jump.motion.json from the poses in demos/anxious-jump.html.

The standalone HTML steps frame-to-frame with no interpolation. This emits the same
seven poses as MotionDirector *anchor keyframes* (zero motion arcs) so the app's
auto-interpolation (layered backfill) fills the in-betweens — i.e. the clip is also
the verification fixture for the interpolation feature.

Run: python3 demos/build-anxious-jump-clip.py
"""
import json, re, os

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, "anxious-jump.html")
OUT = os.path.join(HERE, "anxious-jump.motion.json")

LABEL_RE = re.compile(r"label:\"([^\"]+)\"")
NODE_RE = re.compile(r"(\w+):\{x:(-?\d+(?:\.\d+)?),y:(-?\d+(?:\.\d+)?)\}")

# Per-anchor timing (frameRate 12 → ~83ms/frame). hold = dwell on the pose;
# (durationMs - holdMs) = the interpolated transition into the next pose.
# Tuned to the beat: explosive launch, held apex, cushioned landing, long settle.
TIMING = [
    {"holdMs": 250, "durationMs": 750},  # 1 calm
    {"holdMs": 165, "durationMs": 415},  # 2 anticipation (snap into launch)
    {"holdMs": 85,  "durationMs": 420},  # 3 launch (explosive up)
    {"holdMs": 420, "durationMs": 755},  # 4 apex (held extreme, then fall)
    {"holdMs": 85,  "durationMs": 335},  # 5 falling
    {"holdMs": 165, "durationMs": 580},  # 6 landing compress (recoil)
    {"holdMs": 520, "durationMs": 520},  # 7 anxious settle (trailing dwell)
]

MOTION = {
    "easingBezier": {"x1": 0.22, "y1": 0.02, "x2": 0.18, "y2": 1},
    "anticipationTime": 0.18,
    "overshootTime": 0.18,
}

def main():
    html = open(SRC).read()
    block = html.split("const FRAMES = [", 1)[1].split("];", 1)[0]
    # Each frame chunk starts at "{label:"; run the node regex over the whole chunk
    # (NODE_RE only matches name:{x,y} pairs, so label/hold are naturally skipped).
    chunks = ["{label:" + c for c in block.split("{label:")[1:]]
    frames = []
    for chunk in chunks:
        label = LABEL_RE.search(chunk).group(1)
        pose = {name: {"x": float(x), "y": float(y)} for name, x, y in NODE_RE.findall(chunk)}
        frames.append({"label": label, "pose": pose})
    assert len(frames) == len(TIMING), f"expected {len(TIMING)} frames, parsed {len(frames)}"
    for fr in frames:
        assert len(fr["pose"]) == 17, f"frame '{fr['label']}' has {len(fr['pose'])} nodes, expected 17"

    keyframes = {}
    for i, fr in enumerate(frames):
        keyframes[str(i)] = {
            "pose": fr["pose"],
            "durationMs": TIMING[i]["durationMs"],
            "holdMs": TIMING[i]["holdMs"],
            "motion": MOTION,
        }

    total = sum(t["durationMs"] for t in TIMING)
    snapshot = {
        "mode": "motion",
        "character": "animeHuman",
        "customBaseName": None,
        "selectedPart": None,
        "base": frames[0]["pose"],
        "pose": frames[0]["pose"],
        "easingBezier": MOTION["easingBezier"],
        "anticipationTime": MOTION["anticipationTime"],
        "overshootTime": MOTION["overshootTime"],
        "duration": total,
        "selectedAnchorIndex": 0,
        "frameRate": 12,
        "currentFrame": 0,
        "playbackLoop": True,
        "playbackPingPong": False,
        "keyframes": keyframes,
        "motionPaths": {},
        "activePathIdByPart": {},
        "suppressedGeneratedMotionPaths": {},
    }
    payload = {
        "version": 1,
        "app": "motion-director",
        "name": "Anxious jump",
        "savedAt": "2026-06-13T00:00:00.000Z",
        "snapshot": snapshot,
    }
    with open(OUT, "w") as fh:
        json.dump(payload, fh, indent=2)
    print(f"Wrote {OUT}: {len(frames)} keyframes, {total}ms total")

if __name__ == "__main__":
    main()
