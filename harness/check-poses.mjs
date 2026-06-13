#!/usr/bin/env node
// Deterministic Tier-0 coherence checker for .motion.json clips.
//
// Scores the machine-checkable half of rubric.md / animation-protocol §2 WITHOUT a
// browser or vision: limb-length stability and L/R twinning, per keyframe pose. This is
// the autonomous floor of the generation loop — it fails slop before any render/vision
// cost is spent. Over-time assertions (anchor-landing, twitch) live in the Playwright
// step; this file is the pure-JSON gate.
//
// Usage: node harness/check-poses.mjs <clip.motion.json> [--json]
// Exit 0 if every keyframe passes Tier 0, 1 otherwise.

import { readFileSync } from "node:fs";

// Bone segments (mirrors EDGES in tools/pose-grid.html). Length must stay within ±TOL of
// the clip's own rest reference (keyframe 0) — proportions are whatever the clip establishes.
const EDGES = [
  ["head", "neck"], ["neck", "chest"], ["chest", "stomach"], ["stomach", "hips"],
  ["neck", "leftShoulder"], ["neck", "rightShoulder"],
  ["leftShoulder", "leftElbow"], ["leftElbow", "leftHand"],
  ["rightShoulder", "rightElbow"], ["rightElbow", "rightHand"],
  ["hips", "leftHip"], ["hips", "rightHip"],
  ["leftHip", "leftKnee"], ["leftKnee", "leftFoot"],
  ["rightHip", "rightKnee"], ["rightKnee", "rightFoot"],
];

// Mirror limb pairs for the anti-twinning check (rubric Tier 0: L/R must not mirror).
const LIMB_PAIRS = [
  { name: "upper arm", l: ["leftShoulder", "leftElbow"], r: ["rightShoulder", "rightElbow"] },
  { name: "forearm", l: ["leftElbow", "leftHand"], r: ["rightElbow", "rightHand"] },
  { name: "thigh", l: ["leftHip", "leftKnee"], r: ["rightHip", "rightKnee"] },
  { name: "shin", l: ["leftKnee", "leftFoot"], r: ["rightKnee", "rightFoot"] },
];

const LEN_TOL = 0.35;       // ±35% limb-length drift from rest (rubric Tier 0)
const TWIN_ANGLE_DEG = 12;  // mirror-orientation tolerance
const TWIN_LEN_RATIO = 0.15; // mirror-length tolerance

const vec = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
const len = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const angleDeg = (v) => (Math.atan2(v.y, v.x) * 180) / Math.PI;
const angDiff = (a, b) => { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function restLengths(pose) {
  const out = {};
  for (const [a, b] of EDGES) if (pose[a] && pose[b]) out[`${a}-${b}`] = len(pose[a], pose[b]);
  return out;
}

function checkPose(pose, rest, label) {
  const issues = [];

  // 1. Limb-length stability vs rest reference.
  for (const [a, b] of EDGES) {
    if (!pose[a] || !pose[b]) continue;
    const key = `${a}-${b}`;
    const restLen = rest[key];
    if (!restLen) continue;
    const drift = (len(pose[a], pose[b]) - restLen) / restLen;
    if (Math.abs(drift) > LEN_TOL) {
      issues.push({
        type: "limb-stretch",
        segment: key,
        driftPct: Math.round(drift * 100),
        msg: `${key} ${drift > 0 ? "stretched" : "compressed"} ${Math.round(drift * 100)}% (gate ±${LEN_TOL * 100}%)`,
      });
    }
  }

  // 2. Anti-twinning: reflect the left limb vector across vertical, compare to right.
  for (const pair of LIMB_PAIRS) {
    const [ls, le] = pair.l, [rs, re] = pair.r;
    if (!pose[ls] || !pose[le] || !pose[rs] || !pose[re]) continue;
    const vL = vec(pose[ls], pose[le]);
    const vR = vec(pose[rs], pose[re]);
    const vLmirror = { x: -vL.x, y: vL.y };       // reflect across vertical axis
    const aDiff = angDiff(angleDeg(vLmirror), angleDeg(vR));
    const lL = Math.hypot(vL.x, vL.y), lR = Math.hypot(vR.x, vR.y);
    const lenRatio = Math.abs(lL - lR) / Math.max(lL, lR, 1);
    if (aDiff < TWIN_ANGLE_DEG && lenRatio < TWIN_LEN_RATIO) {
      issues.push({
        type: "twinned",
        pair: pair.name,
        angleDiffDeg: Math.round(aDiff),
        msg: `${pair.name} twinned — L/R mirror within ${Math.round(aDiff)}° & ${Math.round(lenRatio * 100)}% length (break the symmetry)`,
      });
    }
  }

  return { label, pass: issues.length === 0, issues };
}

function loadClip(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const snap = raw.snapshot ?? raw;
  const kf = snap.keyframes ?? {};
  const order = Object.keys(kf).sort((a, b) => Number(a) - Number(b));
  return order.map((k) => ({ idx: k, pose: kf[k].pose }));
}

function main() {
  const [path, ...flags] = process.argv.slice(2);
  if (!path) { console.error("usage: node harness/check-poses.mjs <clip.motion.json> [--json]"); process.exit(2); }
  const frames = loadClip(path);
  if (!frames.length) { console.error("no keyframes found"); process.exit(2); }

  const rest = restLengths(frames[0].pose);  // keyframe 0 = the clip's own rest reference
  const results = frames.map((f, i) =>
    checkPose(f.pose, rest, `keyframe ${f.idx}${i === 0 ? " (rest ref)" : ""}`));
  const allPass = results.every((r) => r.pass);

  if (flags.includes("--json")) {
    console.log(JSON.stringify({ clip: path, pass: allPass, results }, null, 2));
  } else {
    console.log(`\nTier-0 coherence check — ${path}`);
    console.log("=".repeat(60));
    for (const r of results) {
      console.log(`\n${r.pass ? "✅ PASS" : "❌ FAIL"}  ${r.label}`);
      for (const issue of r.issues) console.log(`     • ${issue.msg}`);
    }
    console.log("\n" + "=".repeat(60));
    console.log(allPass ? "✅ CLIP PASSES Tier 0" : "❌ CLIP FAILS Tier 0 — regenerate (do not score craft)");
  }
  process.exit(allPass ? 0 : 1);
}

main();
