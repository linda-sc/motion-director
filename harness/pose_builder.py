#!/usr/bin/env python3
"""Forward-kinematics pose builder for Polyman.

Author poses as JOINT ANGLES on FIXED-LENGTH bones, so limbs can never rubber-band
(kills the rubber-limb failure class that the deterministic checker flags). Bone lengths
are taken from the canonical rest pose (KF0 of the anxious jump). You give a compact spec:
the hip-center position, a spine lean, and per-limb absolute segment angles (degrees,
screen coords: 0°=right, 90°=DOWN, -90°=up). Output is the full 17-node pose dict.
"""
import math

# Canonical rest pose (anxious-jump KF0) — the single source of bone lengths.
REST = {
    "head": (450, 156), "neck": (450, 214), "chest": (450, 256), "stomach": (450, 326),
    "hips": (450, 398), "leftShoulder": (394, 238), "rightShoulder": (506, 238),
    "leftElbow": (414, 324), "leftHand": (387, 393), "rightElbow": (548, 324), "rightHand": (508, 393),
    "leftHip": (416, 398), "rightHip": (484, 398), "leftKnee": (386, 536), "leftFoot": (360, 672),
    "rightKnee": (522, 532), "rightFoot": (548, 668),
}

def _d(a, b): return math.hypot(b[0]-a[0], b[1]-a[1])
# Bone lengths, locked from rest.
L = {
    "spine_hip_stomach": _d(REST["hips"], REST["stomach"]),
    "spine_stomach_chest": _d(REST["stomach"], REST["chest"]),
    "spine_chest_neck": _d(REST["chest"], REST["neck"]),
    "spine_neck_head": _d(REST["neck"], REST["head"]),
    "upperarm_L": _d(REST["leftShoulder"], REST["leftElbow"]),
    "forearm_L": _d(REST["leftElbow"], REST["leftHand"]),
    "upperarm_R": _d(REST["rightShoulder"], REST["rightElbow"]),
    "forearm_R": _d(REST["rightElbow"], REST["rightHand"]),
    "thigh_L": _d(REST["leftHip"], REST["leftKnee"]),
    "shin_L": _d(REST["leftKnee"], REST["leftFoot"]),
    "thigh_R": _d(REST["rightHip"], REST["rightKnee"]),
    "shin_R": _d(REST["rightKnee"], REST["rightFoot"]),
}
# Fixed local offsets (body width) from their spine anchor, in rest.
OFF_LSHO = (REST["leftShoulder"][0]-REST["chest"][0], REST["leftShoulder"][1]-REST["chest"][1])
OFF_RSHO = (REST["rightShoulder"][0]-REST["chest"][0], REST["rightShoulder"][1]-REST["chest"][1])
OFF_LHIP = (REST["leftHip"][0]-REST["hips"][0], REST["leftHip"][1]-REST["hips"][1])
OFF_RHIP = (REST["rightHip"][0]-REST["hips"][0], REST["rightHip"][1]-REST["hips"][1])

def _step(p, length, ang_deg):
    a = math.radians(ang_deg)
    return (p[0] + length*math.cos(a), p[1] + length*math.sin(a))

def _rot(off, lean_deg):
    a = math.radians(lean_deg)
    return (off[0]*math.cos(a)-off[1]*math.sin(a), off[0]*math.sin(a)+off[1]*math.cos(a))

def build(spec):
    """spec keys:
      hips: (x,y)              hip center
      lean: deg                spine lean (0 = straight up; + leans right)
      armL/armR: (upper, fore) absolute angles for upper-arm and forearm
      legL/legR: (thigh, shin) absolute angles for thigh and shin
    """
    hips = spec["hips"]
    lean = spec.get("lean", 0)
    # Spine goes UP from hips; base direction -90° (up), tilted by lean.
    up = -90 + lean
    stomach = _step(hips, L["spine_hip_stomach"], up)
    chest = _step(stomach, L["spine_stomach_chest"], up)
    neck = _step(chest, L["spine_chest_neck"], up)
    head = _step(neck, L["spine_neck_head"], up)
    lsho = (chest[0]+_rot(OFF_LSHO, lean)[0], chest[1]+_rot(OFF_LSHO, lean)[1])
    rsho = (chest[0]+_rot(OFF_RSHO, lean)[0], chest[1]+_rot(OFF_RSHO, lean)[1])
    lhip = (hips[0]+_rot(OFF_LHIP, lean)[0], hips[1]+_rot(OFF_LHIP, lean)[1])
    rhip = (hips[0]+_rot(OFF_RHIP, lean)[0], hips[1]+_rot(OFF_RHIP, lean)[1])
    lel = _step(lsho, L["upperarm_L"], spec["armL"][0]); lha = _step(lel, L["forearm_L"], spec["armL"][1])
    rel = _step(rsho, L["upperarm_R"], spec["armR"][0]); rha = _step(rel, L["forearm_R"], spec["armR"][1])
    lkn = _step(lhip, L["thigh_L"], spec["legL"][0]); lft = _step(lkn, L["shin_L"], spec["legL"][1])
    rkn = _step(rhip, L["thigh_R"], spec["legR"][0]); rft = _step(rkn, L["shin_R"], spec["legR"][1])
    P = {"head":head,"neck":neck,"chest":chest,"stomach":stomach,"hips":hips,
         "leftShoulder":lsho,"rightShoulder":rsho,"leftElbow":lel,"leftHand":lha,
         "rightElbow":rel,"rightHand":rha,"leftHip":lhip,"rightHip":rhip,
         "leftKnee":lkn,"leftFoot":lft,"rightKnee":rkn,"rightFoot":rft}
    return {k:{"x":round(v[0],1),"y":round(v[1],1)} for k,v in P.items()}
