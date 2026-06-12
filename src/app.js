import { createMotionClip } from "./motion-format.js";

const svgNS = "http://www.w3.org/2000/svg";
const storageKey = "motion-director-state-v1";

const partLabels = {
  head: "Head",
  neck: "Neck",
  torso: "Torso",
  leftShoulder: "Left shoulder",
  rightShoulder: "Right shoulder",
  leftElbow: "Left elbow",
  rightElbow: "Right elbow",
  leftHand: "Left hand",
  rightHand: "Right hand",
  leftHip: "Left hip",
  rightHip: "Right hip",
  leftKnee: "Left knee",
  rightKnee: "Right knee",
  leftFoot: "Left foot",
  rightFoot: "Right foot",
};

const autonomousNodes = [
  "head",
  "neck",
  "torso",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftHand",
  "rightHand",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftFoot",
  "rightFoot",
];

const extremityNodes = new Set(["head", "leftHand", "rightHand", "leftFoot", "rightFoot"]);

const state = {
  mode: "motion",
  character: "animeHuman",
  selectedPart: "rightHand",
  easingIntensity: 0.68,
  easingBezier: { x1: 0.22, y1: 0.02, x2: 0.18, y2: 1 },
  anticipationTime: 0.18,
  overshootTime: 0.18,
  duration: 1100,
  frameRate: 12,
  totalFrames: 14,
  currentFrame: 0,
  isDrawing: false,
  isPlaying: false,
  isPanningFrame: false,
  selectedPathId: null,
  hoveredPathId: null,
  camera: {
    x: 0,
    y: 0,
    zoom: 0.9,
  },
  motionPaths: {},
  activePathIdByPart: {},
  drawingPathId: null,
  keyframes: {},
  layoutPresets: [],
  layout: {
    height: 100,
    build: 100,
    legs: 100,
    arms: 100,
  },
  shape: {
    waist: 100,
    upperArm: 100,
    forearm: 100,
    thigh: 100,
    calf: 100,
  },
  polygonEdits: {},
  base: {
    head: { x: 450, y: 156 },
    neck: { x: 450, y: 214 },
    torso: { x: 450, y: 306 },
    leftShoulder: { x: 394, y: 238 },
    rightShoulder: { x: 506, y: 238 },
    leftElbow: { x: 340, y: 300 },
    rightElbow: { x: 568, y: 292 },
    leftHand: { x: 306, y: 372 },
    rightHand: { x: 618, y: 356 },
    leftHip: { x: 416, y: 398 },
    rightHip: { x: 484, y: 398 },
    leftKnee: { x: 386, y: 510 },
    rightKnee: { x: 522, y: 506 },
    leftFoot: { x: 360, y: 620 },
    rightFoot: { x: 548, y: 616 },
  },
  pose: {},
};

state.pose = structuredClone(state.base);
const defaultBase = structuredClone(state.base);
const defaultLayout = structuredClone(state.layout);
const defaultShape = structuredClone(state.shape);
const defaultPolygonEdits = structuredClone(state.polygonEdits);
const defaultCamera = structuredClone(state.camera);
const legacyDefaultLegs = {
  leftKnee: { x: 390, y: 478 },
  rightKnee: { x: 518, y: 474 },
  leftFoot: { x: 366, y: 552 },
  rightFoot: { x: 540, y: 548 },
};

const stage = document.querySelector("#stage");
const puppet = document.querySelector("#puppet");
const nodeLayer = document.querySelector("#nodeLayer");
const pathLayer = document.querySelector("#pathLayer");
const ghostLayer = document.querySelector("#ghostLayer");
const selectedLabel = document.querySelector("#selectedLabel");
const modeButtons = document.querySelectorAll("[data-mode]");
const modePanels = document.querySelectorAll("[data-mode-panel]");
const characterSelect = document.querySelector("#characterSelect");
const bezierEditor = document.querySelector("#bezierEditor");
const bezierValue = document.querySelector("#bezierValue");
const bezierCurveLine = document.querySelector("#bezierCurveLine");
const bezierControlLineA = document.querySelector("#bezierControlLineA");
const bezierControlLineB = document.querySelector("#bezierControlLineB");
const bezierHandleA = document.querySelector("#bezierHandleA");
const bezierHandleB = document.querySelector("#bezierHandleB");
const anticipationValue = document.querySelector("#anticipationValue");
const overshootValue = document.querySelector("#overshootValue");
const timingRail = document.querySelector("#timingRail");
const anticipationMarker = document.querySelector("#anticipationMarker");
const overshootMarker = document.querySelector("#overshootMarker");
const durationInput = document.querySelector("#durationInput");
const durationValue = document.querySelector("#durationValue");
const frameRateSelect = document.querySelector("#frameRateSelect");
const stateReadout = document.querySelector("#stateReadout");
const frameLabel = document.querySelector("#frameLabel");
const timelineHint = document.querySelector("#timelineHint");
const timelineTrack = document.querySelector("#timelineTrack");
const playButton = document.querySelector("#playButton");
const motionGuideLine = document.querySelector("#motionGuideLine");
const panButton = document.querySelector("#panButton");
const panDoneButton = document.querySelector("#panDoneButton");
const cameraFrameBadge = document.querySelector("#cameraFrameBadge");
const zoomInput = document.querySelector("#zoomInput");
const resetAllButton = document.querySelector("#resetAllButton");
const layoutPresetSelect = document.querySelector("#layoutPresetSelect");
const heightInput = document.querySelector("#heightInput");
const buildInput = document.querySelector("#buildInput");
const legInput = document.querySelector("#legInput");
const armInput = document.querySelector("#armInput");
const savePresetButton = document.querySelector("#savePresetButton");
const keyPoseButton = document.querySelector("#keyPoseButton");
let motionCursorPoint = null;

function linearBase(t) {
  return t;
}

function easeInOutBase(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function snappyBase(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t) {
  return t * t * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cubicBezierCoord(t, p1, p2) {
  const inv = 1 - t;
  return 3 * inv * inv * t * p1 + 3 * inv * t * t * p2 + t * t * t;
}

function cubicBezierDerivative(t, p1, p2) {
  const inv = 1 - t;
  return 3 * inv * inv * p1 + 6 * inv * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

function bezierEasing(x, curve = state.easingBezier) {
  const target = clamp(x, 0, 1);
  let t = target;
  for (let i = 0; i < 6; i += 1) {
    const current = cubicBezierCoord(t, curve.x1, curve.x2) - target;
    const slope = cubicBezierDerivative(t, curve.x1, curve.x2);
    if (Math.abs(slope) < 0.0001) break;
    t = clamp(t - current / slope, 0, 1);
  }

  let low = 0;
  let high = 1;
  for (let i = 0; i < 8; i += 1) {
    const current = cubicBezierCoord(t, curve.x1, curve.x2);
    if (Math.abs(current - target) < 0.0005) break;
    if (current < target) low = t;
    else high = t;
    t = (low + high) / 2;
  }
  return cubicBezierCoord(t, curve.y1, curve.y2);
}

function curveEnergy() {
  return clamp((Math.abs(state.easingBezier.y1 - state.easingBezier.x1) + Math.abs(state.easingBezier.y2 - state.easingBezier.x2)) * 0.6, 0, 1);
}

function normalizePolygonEdits(edits) {
  const normalized = {};
  Object.entries(edits).forEach(([id, edit]) => {
    if (!edit || typeof edit !== "object") return;
    if (Number.isFinite(edit.dx) || Number.isFinite(edit.dy)) {
      normalized[id] = {
        dx: clamp(Number(edit.dx) || 0, -80, 80),
        dy: clamp(Number(edit.dy) || 0, -80, 80),
      };
      return;
    }
    const next = {};
    ["-1", "1"].forEach((side) => {
      const sideEdit = edit[side];
      if (!sideEdit || typeof sideEdit !== "object") return;
      next[side] = {
        t: Number.isFinite(sideEdit.t) ? clamp(sideEdit.t, 0.15, 0.85) : 0.5,
        distance: Number.isFinite(sideEdit.distance) ? clamp(sideEdit.distance, 2, 90) : undefined,
      };
    });
    if (Object.keys(next).length) normalized[id] = next;
  });
  return normalized;
}

function nearlySamePoint(a, b, tolerance = 0.75) {
  return Number.isFinite(a?.x)
    && Number.isFinite(a?.y)
    && Math.abs(a.x - b.x) <= tolerance
    && Math.abs(a.y - b.y) <= tolerance;
}

function hasLegacyDefaultLegs(base) {
  return Object.entries(legacyDefaultLegs).every(([node, point]) => nearlySamePoint(base[node], point));
}

function normalizePathPoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map((point) => ({ x: point.x, y: point.y }));
}

function createMotionPath(part, path, id = `path-${Date.now()}-${Math.random().toString(16).slice(2)}`, timing = {}) {
  return {
    id,
    part,
    path: normalizePathPoints(path),
    timing: {
      easing: "cubic-bezier",
      easingBezier: structuredClone(timing.easingBezier ?? state.easingBezier),
      anticipationTime: Number.isFinite(timing.anticipationTime) ? timing.anticipationTime : state.anticipationTime,
      overshootTime: Number.isFinite(timing.overshootTime) ? timing.overshootTime : state.overshootTime,
    },
  };
}

function normalizeMotionPaths(savedMotionPaths) {
  const normalized = {};
  if (!savedMotionPaths || typeof savedMotionPaths !== "object") return normalized;
  Object.entries(savedMotionPaths).forEach(([part, clips]) => {
    if (!partLabels[part] || !Array.isArray(clips)) return;
    const cleanClips = clips
      .map((clip, index) => createMotionPath(part, clip?.path ?? [], clip?.id ?? `${part}-${index}`, clip?.timing))
      .filter((clip) => clip.path.length >= 2);
    if (cleanClips.length) normalized[part] = cleanClips;
  });
  return normalized;
}

function selectedMotionPath() {
  const clips = state.motionPaths[state.selectedPart] ?? [];
  if (!clips.length) return null;
  const activeId = state.activePathIdByPart[state.selectedPart];
  return clips.find((clip) => clip.id === activeId) ?? clips[clips.length - 1];
}

function selectedPathPoints() {
  return editingMotionPath()?.path ?? [];
}

function selectedClipById(pathId) {
  if (!pathId) return null;
  return Object.values(state.motionPaths).flat().find((clip) => clip.id === pathId) ?? null;
}

function editingMotionPath() {
  return state.selectedPathId ? selectedClipById(state.selectedPathId) : selectedMotionPath();
}

function pathBounds(points) {
  if (!points.length) return null;
  const first = points[0];
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY };
}

function selectedPartLabel() {
  if (!state.selectedPart || !partLabels[state.selectedPart]) return "no node";
  return partLabels[state.selectedPart].toLowerCase();
}

function selectedNodePoint() {
  return state.selectedPart ? state.pose[state.selectedPart] : null;
}

function drawingMotionPath() {
  if (!state.drawingPathId) return null;
  return Object.values(state.motionPaths).flat().find((clip) => clip.id === state.drawingPathId) ?? null;
}

function allMotionPaths() {
  return Object.values(state.motionPaths).flat().filter((clip) => clip?.path?.length >= 2);
}

function activeMotionPaths() {
  return Object.entries(state.motionPaths)
    .map(([part, clips]) => {
      const activeId = state.activePathIdByPart[part];
      return clips.find((clip) => clip.id === activeId) ?? clips[clips.length - 1];
    })
    .filter((clip) => clip?.path?.length >= 2);
}

function intensityToBezier(intensity) {
  const clamped = clamp(intensity, 0, 1);
  return {
    x1: 0.33 - clamped * 0.16,
    y1: 0.33 - clamped * 0.31,
    x2: 0.67 - clamped * 0.5,
    y2: 0.67 + clamped * 0.33,
  };
}

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!saved || saved.version !== 1) return;
    if (saved.mode === "layout" || saved.mode === "motion") state.mode = saved.mode;
    if (saved.character) state.character = saved.character;
    if (saved.selectedPart && partLabels[saved.selectedPart]) state.selectedPart = saved.selectedPart;
    if (saved.layout) {
      ["height", "build", "legs", "arms"].forEach((key) => {
        if (Number.isFinite(saved.layout[key])) state.layout[key] = clamp(saved.layout[key], 50, 160);
      });
    }
    if (saved.shape) {
      Object.keys(state.shape).forEach((key) => {
        if (Number.isFinite(saved.shape[key])) state.shape[key] = clamp(saved.shape[key], 55, 170);
      });
    }
    if (saved.polygonEdits && typeof saved.polygonEdits === "object") {
      state.polygonEdits = normalizePolygonEdits(saved.polygonEdits);
    }
    if (Array.isArray(saved.layoutPresets)) {
      state.layoutPresets = saved.layoutPresets.filter((preset) => preset?.name && preset?.layout && preset?.base);
    }
    if (saved.base && typeof saved.base === "object") {
      autonomousNodes.forEach((node) => {
        if (Number.isFinite(saved.base[node]?.x) && Number.isFinite(saved.base[node]?.y)) {
          state.base[node] = { x: saved.base[node].x, y: saved.base[node].y };
        }
      });
      if (hasLegacyDefaultLegs(saved.base)) {
        ["leftKnee", "rightKnee", "leftFoot", "rightFoot"].forEach((node) => {
          state.base[node] = structuredClone(defaultBase[node]);
        });
      }
      state.pose = structuredClone(state.base);
    }
    if (saved.easingBezier && Number.isFinite(saved.easingBezier.x1) && Number.isFinite(saved.easingBezier.y1) && Number.isFinite(saved.easingBezier.x2) && Number.isFinite(saved.easingBezier.y2)) {
      state.easingBezier = {
        x1: clamp(saved.easingBezier.x1, 0, 1),
        y1: clamp(saved.easingBezier.y1, 0, 1),
        x2: clamp(saved.easingBezier.x2, 0, 1),
        y2: clamp(saved.easingBezier.y2, 0, 1),
      };
      state.easingIntensity = curveEnergy();
    } else if (Number.isFinite(saved.easingIntensity)) {
      state.easingIntensity = clamp(saved.easingIntensity, 0, 1);
      state.easingBezier = intensityToBezier(state.easingIntensity);
    } else if (saved.easing === "linear") {
      state.easingIntensity = 0;
      state.easingBezier = intensityToBezier(state.easingIntensity);
    } else if (saved.easing === "easeInOut") {
      state.easingIntensity = 0.45;
      state.easingBezier = intensityToBezier(state.easingIntensity);
    } else if (saved.easing === "easeOutBack") {
      state.easingIntensity = 0.68;
      state.easingBezier = intensityToBezier(state.easingIntensity);
    } else if (saved.easing === "anticipate") {
      state.easingIntensity = 0.55;
      state.easingBezier = intensityToBezier(state.easingIntensity);
    }
    if (Number.isFinite(saved.anticipationTime)) state.anticipationTime = saved.anticipationTime;
    if (Number.isFinite(saved.overshootTime)) state.overshootTime = saved.overshootTime;
    if (Number.isFinite(saved.duration)) state.duration = saved.duration;
    if (Number.isFinite(saved.frameRate)) state.frameRate = saved.frameRate;
    if (Number.isFinite(saved.currentFrame)) state.currentFrame = saved.currentFrame;
    if (saved.camera && typeof saved.camera === "object") {
      if (Number.isFinite(saved.camera.x)) state.camera.x = clamp(saved.camera.x, -260, 260);
      if (Number.isFinite(saved.camera.y)) state.camera.y = clamp(saved.camera.y, -220, 220);
      if (Number.isFinite(saved.camera.zoom)) state.camera.zoom = clamp(saved.camera.zoom, 0.75, 1.4);
    }
    if (saved.keyframes && typeof saved.keyframes === "object") {
      state.keyframes = Object.fromEntries(
        Object.entries(saved.keyframes)
          .filter(([frame, pose]) => Number.isFinite(Number(frame)) && pose && typeof pose === "object")
          .map(([frame, pose]) => [frame, pose]),
      );
    }
    if (saved.motionPaths) {
      state.motionPaths = normalizeMotionPaths(saved.motionPaths);
      if (saved.activePathIdByPart && typeof saved.activePathIdByPart === "object") {
        Object.entries(saved.activePathIdByPart).forEach(([part, id]) => {
          if (partLabels[part] && state.motionPaths[part]?.some((clip) => clip.id === id)) {
            state.activePathIdByPart[part] = id;
          }
        });
      }
    } else if (Array.isArray(saved.path)) {
      const legacyPath = normalizePathPoints(saved.path);
      if (legacyPath.length >= 2 && partLabels[state.selectedPart]) {
        const clip = createMotionPath(state.selectedPart, legacyPath, `${state.selectedPart}-legacy`);
        state.motionPaths[state.selectedPart] = [clip];
        state.activePathIdByPart[state.selectedPart] = clip.id;
      }
    }
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({
    version: 1,
    mode: state.mode,
    character: state.character,
    selectedPart: state.selectedPart,
    layout: state.layout,
    shape: state.shape,
    polygonEdits: state.polygonEdits,
    base: Object.fromEntries(autonomousNodes.map((node) => [node, state.base[node]])),
    easingBezier: state.easingBezier,
    anticipationTime: state.anticipationTime,
    overshootTime: state.overshootTime,
    duration: state.duration,
    frameRate: state.frameRate,
    camera: state.camera,
    currentFrame: state.currentFrame,
    keyframes: state.keyframes,
    layoutPresets: state.layoutPresets,
    motionPaths: state.motionPaths,
    activePathIdByPart: state.activePathIdByPart,
  }));
}

function syncControls() {
  characterSelect.value = state.character;
  durationInput.value = String(state.duration);
  frameRateSelect.value = String(state.frameRate);
  zoomInput.value = String(Math.round(state.camera.zoom * 100));
  heightInput.value = String(state.layout.height);
  buildInput.value = String(state.layout.build);
  legInput.value = String(state.layout.legs);
  armInput.value = String(state.layout.arms);
  renderLayoutPresets();
}

function syncFrameCount() {
  state.totalFrames = Math.max(2, Math.round((state.duration / 1000) * state.frameRate) + 1);
  state.currentFrame = Math.min(state.currentFrame, state.totalFrames - 1);
}

function makeNode(tag, attrs = {}, parent = puppet) {
  const node = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  parent.append(node);
  return node;
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointAlong(points, t) {
  if (points.length < 2) return points[0] ?? state.pose[state.selectedPart];
  const segments = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const length = distance(points[i - 1], points[i]);
    segments.push(length);
    total += length;
  }
  if (total === 0) return points[0];

  let cursor = t * total;
  if (cursor <= 0) {
    const segmentLength = segments[0] || 1;
    const local = cursor / segmentLength;
    return {
      x: points[0].x + (points[1].x - points[0].x) * local,
      y: points[0].y + (points[1].y - points[0].y) * local,
    };
  }

  for (let i = 0; i < segments.length; i += 1) {
    if (cursor <= segments[i]) {
      const local = segments[i] === 0 ? 0 : cursor / segments[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * local,
        y: points[i].y + (points[i + 1].y - points[i].y) * local,
      };
    }
    cursor -= segments[i];
  }

  const last = points[points.length - 1];
  const previous = points[points.length - 2];
  const lastLength = segments[segments.length - 1] || 1;
  const local = cursor / lastLength;
  return {
    x: last.x + (last.x - previous.x) * local,
    y: last.y + (last.y - previous.y) * local,
  };
}

function tangentAt(points, t) {
  if (points.length < 2) return { x: 1, y: 0 };
  const ahead = pointAlong(points, Math.min(1.08, t + 0.012));
  const behind = pointAlong(points, Math.max(-0.08, t - 0.012));
  const length = Math.max(1, distance(behind, ahead));
  return {
    x: (ahead.x - behind.x) / length,
    y: (ahead.y - behind.y) / length,
  };
}

function timingBounds() {
  const anticipationEnd = clamp(state.anticipationTime, 0, 0.35);
  const settle = Math.max(anticipationEnd + 0.05, Math.min(1, 1 - state.overshootTime));
  return {
    anticipationEnd,
    settle,
    overshootExtreme: 1,
  };
}

function phaseDurations() {
  const { anticipationEnd, settle } = timingBounds();
  const anticipationDistance = anticipationEnd;
  const recoveryDistance = 1 - settle;
  const push = curveEnergy();
  const minReadableAnticipation = Math.min(0.3, Math.max(0.16, 2 / Math.max(8, state.totalFrames - 1)));
  const minReadableRecovery = Math.min(0.34, Math.max(0.22, 3 / Math.max(8, state.totalFrames - 1)));
  const anticipationDuration = anticipationDistance > 0.005
    ? clamp(0.1 + anticipationDistance * 0.75 + push * 0.035, minReadableAnticipation, 0.32)
    : 0;
  const recoveryDuration = recoveryDistance > 0.005
    ? clamp(0.12 + recoveryDistance * 0.85 + push * 0.05, minReadableRecovery, 0.36)
    : 0;
  const accentTotal = anticipationDuration + recoveryDuration;
  const maxAccentTotal = 0.64;
  const scale = accentTotal > maxAccentTotal ? maxAccentTotal / accentTotal : 1;
  const scaledAnticipation = anticipationDuration * scale;
  const scaledRecovery = recoveryDuration * scale;

  return {
    anticipationDuration: scaledAnticipation,
    mainDuration: Math.max(0.2, 1 - scaledAnticipation - scaledRecovery),
    recoveryDuration: scaledRecovery,
  };
}

function pathProgressForTime(rawT) {
  const { anticipationEnd, settle, overshootExtreme } = timingBounds();
  const { anticipationDuration, mainDuration, recoveryDuration } = phaseDurations();
  const mainStartTime = anticipationDuration;
  const recoveryStartTime = anticipationDuration + mainDuration;

  if (anticipationDuration > 0 && rawT < mainStartTime) {
    const local = rawT / anticipationDuration;
    if (local < 0.42) {
      return anticipationEnd * (1 - easeOutCubic(local / 0.42));
    }
    return anticipationEnd * easeInCubic((local - 0.42) / 0.58);
  }

  if (rawT < recoveryStartTime || recoveryDuration === 0) {
    const local = Math.max(0, Math.min(1, (rawT - mainStartTime) / mainDuration));
    const target = recoveryDuration > 0 ? overshootExtreme : settle;
    return anticipationEnd + (target - anticipationEnd) * bezierEasing(local);
  }

  const local = Math.max(0, Math.min(1, (rawT - recoveryStartTime) / recoveryDuration));
  return overshootExtreme + (settle - overshootExtreme) * easeOutCubic(local);
}

function sampledPathData(points, startT, endT) {
  if (points.length < 2) return "";
  const start = Math.max(0, Math.min(1, startT));
  const end = Math.max(0, Math.min(1, endT));
  if (end <= start) return "";
  const samples = Math.max(3, Math.ceil((end - start) * 18));
  const sampled = Array.from({ length: samples + 1 }, (_, index) => {
    const local = index / samples;
    return pointAlong(points, start + (end - start) * local);
  });
  return pathData(sampled);
}

function progressClosestToPoint(points, target) {
  if (points.length < 2) return 0;
  let total = 0;
  const lengths = [];
  for (let i = 1; i < points.length; i += 1) {
    const length = distance(points[i - 1], points[i]);
    lengths.push(length);
    total += length;
  }
  if (total === 0) return 0;

  let bestDistance = Infinity;
  let bestCursor = 0;
  let cursor = 0;
  for (let i = 0; i < lengths.length; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const segmentLength = lengths[i];
    if (segmentLength === 0) continue;
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const raw = ((target.x - a.x) * vx + (target.y - a.y) * vy) / (segmentLength * segmentLength);
    const local = Math.max(0, Math.min(1, raw));
    const projected = { x: a.x + vx * local, y: a.y + vy * local };
    const projectedDistance = distance(projected, target);
    if (projectedDistance < bestDistance) {
      bestDistance = projectedDistance;
      bestCursor = cursor + segmentLength * local;
    }
    cursor += segmentLength;
  }
  return bestCursor / total;
}

function solveTwoBone(root, target, upperLength, lowerLength, bend = 1) {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const direct = Math.max(1, Math.hypot(dx, dy));
  const reach = Math.min(direct, upperLength + lowerLength - 1);
  const baseAngle = Math.atan2(dy, dx);
  const cos = (upperLength ** 2 + reach ** 2 - lowerLength ** 2) / (2 * upperLength * reach);
  const jointAngle = Math.acos(Math.max(-1, Math.min(1, cos)));
  const angle = baseAngle + jointAngle * bend;
  return {
    x: root.x + Math.cos(angle) * upperLength,
    y: root.y + Math.sin(angle) * upperLength,
  };
}

function connectedPose(part, target, sourcePose = state.base) {
  const pose = structuredClone(sourcePose);
  const base = sourcePose;
  pose[part] = target;

  if (part === "rightHand") {
    const shoulderLag = { x: target.x * 0.1 + base.rightShoulder.x * 0.9, y: target.y * 0.08 + base.rightShoulder.y * 0.92 };
    pose.rightShoulder = shoulderLag;
    pose.rightElbow = solveTwoBone(shoulderLag, target, 84, 78, -1);
    pose.torso.x = base.torso.x + (target.x - base.rightHand.x) * 0.035;
    pose.head.x = base.head.x + (target.x - base.rightHand.x) * 0.025;
  }

  if (part === "leftHand") {
    const shoulderLag = { x: target.x * 0.1 + base.leftShoulder.x * 0.9, y: target.y * 0.08 + base.leftShoulder.y * 0.92 };
    pose.leftShoulder = shoulderLag;
    pose.leftElbow = solveTwoBone(shoulderLag, target, 82, 78, 1);
    pose.torso.x = base.torso.x + (target.x - base.leftHand.x) * 0.035;
    pose.head.x = base.head.x + (target.x - base.leftHand.x) * 0.025;
  }

  if (part === "rightFoot") {
    const delta = { x: target.x - base.rightFoot.x, y: target.y - base.rightFoot.y };
    const hipLag = {
      x: target.x * 0.08 + base.rightHip.x * 0.92,
      y: target.y * 0.035 + base.rightHip.y * 0.965,
    };
    pose.rightHip = hipLag;
    pose.leftHip = {
      x: base.leftHip.x + delta.x * 0.025,
      y: base.leftHip.y + delta.y * 0.01,
    };
    pose.rightKnee = solveTwoBone(
      hipLag,
      target,
      distance(base.rightHip, base.rightKnee),
      distance(base.rightKnee, base.rightFoot),
      -1,
    );
    pose.torso.x = base.torso.x + delta.x * 0.028;
    pose.torso.y = base.torso.y + delta.y * 0.012;
    pose.head.x = base.head.x + delta.x * 0.014;
  }

  if (part === "leftFoot") {
    const delta = { x: target.x - base.leftFoot.x, y: target.y - base.leftFoot.y };
    const hipLag = {
      x: target.x * 0.08 + base.leftHip.x * 0.92,
      y: target.y * 0.035 + base.leftHip.y * 0.965,
    };
    pose.leftHip = hipLag;
    pose.rightHip = {
      x: base.rightHip.x + delta.x * 0.025,
      y: base.rightHip.y + delta.y * 0.01,
    };
    pose.leftKnee = solveTwoBone(
      hipLag,
      target,
      distance(base.leftHip, base.leftKnee),
      distance(base.leftKnee, base.leftFoot),
      1,
    );
    pose.torso.x = base.torso.x + delta.x * 0.028;
    pose.torso.y = base.torso.y + delta.y * 0.012;
    pose.head.x = base.head.x + delta.x * 0.014;
  }

  if (part === "head") {
    pose.neck.x = base.neck.x + (target.x - base.head.x) * 0.35;
    pose.torso.x = base.torso.x + (target.x - base.head.x) * 0.05;
  }

  return pose;
}

function applyConnectedMotion(part, target) {
  state.pose = connectedPose(part, target);
}

function pathData(points) {
  if (!points.length) return "";
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function renderPuppet() {
  puppet.innerHTML = "";
  nodeLayer.innerHTML = "";
  if (state.character === "animeHuman") {
    renderAnimePuppet();
  } else {
    renderMvpPuppet();
  }
  renderNodeHandles();

  puppet.querySelectorAll("[data-part]").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      state.selectedPart = event.currentTarget.dataset.part;
      render();
    });
  });
}

function renderNodeHandles() {
  autonomousNodes.forEach((nodeName) => {
    const point = state.pose[nodeName];
    if (!point) return;
    const handle = makeNode("circle", {
      class: `node-handle ${extremityNodes.has(nodeName) ? "extremity-node" : "secondary-node"} ${state.selectedPart === nodeName ? "selected-node" : ""}`,
      "data-node": nodeName,
      cx: point.x,
      cy: point.y,
      r: extremityNodes.has(nodeName) ? 7 : 5.5,
      tabindex: "0",
      role: "button",
      "aria-label": `${partLabels[nodeName]} node`,
    }, nodeLayer);
    handle.addEventListener("pointerdown", (event) => startNodeInteraction(event, nodeName));
    handle.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      state.selectedPart = nodeName;
      render();
      saveState();
    });
  });
  renderShapeHandles();
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function interpolatePoint(start, end, t) {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

function torsoControlPoints(p) {
  const waist = state.shape.waist / 100;
  const leftWaistEdit = state.polygonEdits.torsoLeftWaist ?? { dx: 0, dy: 0 };
  const rightWaistEdit = state.polygonEdits.torsoRightWaist ?? { dx: 0, dy: 0 };
  return {
    leftShoulder: offsetPoint(p.leftShoulder, -13, -8),
    rightShoulder: offsetPoint(p.rightShoulder, 16, -8),
    rightRib: offsetPoint(p.torso, 43, -8),
    rightWaist: offsetPoint(p.torso, 27 * waist + rightWaistEdit.dx, 42 + rightWaistEdit.dy),
    rightHip: offsetPoint(p.rightHip, 30, 23),
    pelvisTip: offsetPoint(midpoint(p.leftHip, p.rightHip), 0, 54),
    leftHip: offsetPoint(p.leftHip, -30, 23),
    leftWaist: offsetPoint(p.torso, -27 * waist + leftWaistEdit.dx, 42 + leftWaistEdit.dy),
    leftRib: offsetPoint(p.torso, -43, -8),
  };
}

function renderShapeHandles() {
  if (state.mode !== "layout") return;
  const p = state.pose;
  const torso = torsoControlPoints(p);
  const handles = [
    { key: "waist", editId: "torsoLeftWaist", drag: "free", point: torso.leftWaist, label: "Left waist" },
    { key: "waist", editId: "torsoRightWaist", drag: "free", point: torso.rightWaist, label: "Right waist" },
    ...limbShapeHandles("leftUpperArm", "upperArm", "Left upper arm", p.leftShoulder, p.leftElbow, 24, 18),
    ...limbShapeHandles("leftForearm", "forearm", "Left forearm", p.leftElbow, p.leftHand, 18, 13),
    ...limbShapeHandles("rightUpperArm", "upperArm", "Right upper arm", p.rightShoulder, p.rightElbow, 25, 18),
    ...limbShapeHandles("rightForearm", "forearm", "Right forearm", p.rightElbow, p.rightHand, 18, 13),
    ...limbShapeHandles("leftThigh", "thigh", "Left thigh", p.leftHip, p.leftKnee, 28, 21),
    ...limbShapeHandles("leftCalf", "calf", "Left calf", p.leftKnee, p.leftFoot, 21, 15),
    ...limbShapeHandles("rightThigh", "thigh", "Right thigh", p.rightHip, p.rightKnee, 29, 21),
    ...limbShapeHandles("rightCalf", "calf", "Right calf", p.rightKnee, p.rightFoot, 21, 15),
  ];

  handles.forEach((handle) => {
    const node = makeNode("rect", {
      class: `shape-handle ${handle.key === "waist" ? "torso-shape-handle" : ""}`,
      "data-shape-handle": handle.key,
      "data-edge-side": handle.edgeSide ?? "",
      x: handle.point.x - 3.5,
      y: handle.point.y - 3.5,
      width: 7,
      height: 7,
      rx: 1,
      tabindex: "0",
      role: "slider",
      "aria-label": `${handle.label} shape`,
      "aria-valuemin": "55",
      "aria-valuemax": "170",
      "aria-valuenow": String(Math.round(state.shape[handle.key])),
      transform: `rotate(45 ${handle.point.x.toFixed(1)} ${handle.point.y.toFixed(1)})`,
    }, nodeLayer);
    node.addEventListener("pointerdown", (event) => startShapeHandleDrag(event, handle));
  });
}

function limbShapeHandles(segmentId, key, label, start, end, startWidth, endWidth) {
  const axis = unitVector(start, end);
  const normal = { x: -axis.y, y: axis.x };
  const length = distance(start, end);
  return [-1, 1].map((edgeSide) => {
    const handle = limbHandlePoint(segmentId, key, edgeSide, start, end, startWidth, endWidth);
    return {
      segmentId,
      key,
      label,
      drag: "limb-polygon",
      normal,
      axis,
      length,
      edgeSide,
      point: handle.point,
      t: handle.t,
      distance: handle.distance,
    };
  });
}

function limbEditDefaults(key, startWidth, endWidth) {
  return {
    t: 0.5,
    distance: limbMidWidth(key, startWidth, endWidth) / 2,
  };
}

function limbHandlePoint(segmentId, key, edgeSide, start, end, startWidth, endWidth) {
  const defaults = limbEditDefaults(key, startWidth, endWidth);
  const edit = state.polygonEdits[segmentId]?.[String(edgeSide)] ?? {};
  const t = clamp(Number.isFinite(edit.t) ? edit.t : defaults.t, 0.15, 0.85);
  const handleDistance = clamp(Number.isFinite(edit.distance) ? edit.distance : defaults.distance, 2, 90);
  const axis = unitVector(start, end);
  const normal = { x: -axis.y, y: axis.x };
  const center = interpolatePoint(start, end, t);
  return {
    t,
    distance: handleDistance,
    point: addScaled(center, normal, edgeSide * handleDistance),
  };
}

function setLimbPolygonHandle(segmentId, edgeSide, edit) {
  state.polygonEdits[segmentId] = {
    ...(state.polygonEdits[segmentId] ?? {}),
    [String(edgeSide)]: {
      t: clamp(edit.t, 0.15, 0.85),
      distance: clamp(edit.distance, 2, 90),
    },
  };
  state.currentFrame = 0;
  state.pose = structuredClone(state.base);
  render();
  saveState();
}

function setTorsoPolygonHandle(editId, dx, dy) {
  state.polygonEdits[editId] = {
    dx: clamp(dx, -80, 80),
    dy: clamp(dy, -80, 80),
  };
  state.currentFrame = 0;
  state.pose = structuredClone(state.base);
  render();
  saveState();
}

function layoutSelectedClass(part) {
  return state.mode === "layout" && state.selectedPart === part ? "selected" : "";
}

function renderMvpPuppet() {
  const p = state.pose;

  makeNode("line", { class: "limb arm", "data-part": "leftHand", x1: p.leftShoulder.x, y1: p.leftShoulder.y, x2: p.leftElbow.x, y2: p.leftElbow.y });
  makeNode("line", { class: "limb arm", "data-part": "leftHand", x1: p.leftElbow.x, y1: p.leftElbow.y, x2: p.leftHand.x, y2: p.leftHand.y });
  makeNode("line", { class: "limb arm", "data-part": "rightHand", x1: p.rightShoulder.x, y1: p.rightShoulder.y, x2: p.rightElbow.x, y2: p.rightElbow.y });
  makeNode("line", { class: "limb arm", "data-part": "rightHand", x1: p.rightElbow.x, y1: p.rightElbow.y, x2: p.rightHand.x, y2: p.rightHand.y });

  makeNode("line", { class: "limb leg", "data-part": "leftFoot", x1: p.leftHip.x, y1: p.leftHip.y, x2: p.leftKnee.x, y2: p.leftKnee.y });
  makeNode("line", { class: "limb leg", "data-part": "leftFoot", x1: p.leftKnee.x, y1: p.leftKnee.y, x2: p.leftFoot.x, y2: p.leftFoot.y });
  makeNode("line", { class: "limb leg", "data-part": "rightFoot", x1: p.rightHip.x, y1: p.rightHip.y, x2: p.rightKnee.x, y2: p.rightKnee.y });
  makeNode("line", { class: "limb leg", "data-part": "rightFoot", x1: p.rightKnee.x, y1: p.rightKnee.y, x2: p.rightFoot.x, y2: p.rightFoot.y });

  makeNode("path", {
    class: `torso ${layoutSelectedClass("torso")}`,
    "data-part": "torso",
    d: `M ${p.leftShoulder.x - 8} ${p.leftShoulder.y - 10} C ${p.torso.x - 70} ${p.torso.y}, ${p.leftHip.x - 44} ${p.leftHip.y}, ${p.leftHip.x} ${p.leftHip.y + 20} L ${p.rightHip.x} ${p.rightHip.y + 20} C ${p.rightHip.x + 44} ${p.rightHip.y}, ${p.torso.x + 70} ${p.torso.y}, ${p.rightShoulder.x + 8} ${p.rightShoulder.y - 10} Z`,
  });

  makeNode("circle", { class: `head ${layoutSelectedClass("head")}`, "data-part": "head", cx: p.head.x, cy: p.head.y, r: 47 });
  makeNode("path", { class: "eye", d: `M ${p.head.x - 22} ${p.head.y - 8} Q ${p.head.x - 12} ${p.head.y - 14} ${p.head.x - 2} ${p.head.y - 8}` });
  makeNode("path", { class: "eye", d: `M ${p.head.x + 8} ${p.head.y - 8} Q ${p.head.x + 18} ${p.head.y - 14} ${p.head.x + 28} ${p.head.y - 8}` });
  makeNode("path", { class: "mouth", d: `M ${p.head.x - 16} ${p.head.y + 20} Q ${p.head.x + 2} ${p.head.y + 32} ${p.head.x + 22} ${p.head.y + 16}` });

  ["leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftKnee", "rightKnee"].forEach((joint) => {
    makeNode("circle", { class: "joint", cx: p[joint].x, cy: p[joint].y, r: 12 });
  });

  ["leftHand", "rightHand", "leftFoot", "rightFoot"].forEach((part) => {
    makeNode("circle", {
      class: `joint ${part.includes("Hand") ? "hand" : "foot"} ${layoutSelectedClass(part)}`,
      "data-part": part,
      cx: p[part].x,
      cy: p[part].y,
      r: part.includes("Hand") ? 18 : 20,
    });
  });
}

function renderAnimePuppet() {
  const p = state.pose;
  const torso = torsoControlPoints(p);

  makeNode("polygon", {
    class: `anime-limb back-limb ${layoutSelectedClass("leftHand")}`,
    "data-part": "leftHand",
    points: limbPolygon("leftUpperArm", "upperArm", p.leftShoulder, p.leftElbow, 24, 18),
  });
  makeNode("polygon", {
    class: `anime-limb back-limb ${layoutSelectedClass("leftHand")}`,
    "data-part": "leftHand",
    points: limbPolygon("leftForearm", "forearm", p.leftElbow, p.leftHand, 18, 13),
  });
  makeNode("polygon", {
    class: `anime-limb back-leg ${layoutSelectedClass("leftFoot")}`,
    "data-part": "leftFoot",
    points: limbPolygon("leftThigh", "thigh", p.leftHip, p.leftKnee, 28, 21),
  });
  makeNode("polygon", {
    class: `anime-limb back-leg ${layoutSelectedClass("leftFoot")}`,
    "data-part": "leftFoot",
    points: limbPolygon("leftCalf", "calf", p.leftKnee, p.leftFoot, 21, 15),
  });
  makeNode("polygon", {
    class: `anime-limb front-limb ${layoutSelectedClass("rightHand")}`,
    "data-part": "rightHand",
    points: limbPolygon("rightUpperArm", "upperArm", p.rightShoulder, p.rightElbow, 25, 18),
  });
  makeNode("polygon", {
    class: `anime-limb front-leg ${layoutSelectedClass("rightFoot")}`,
    "data-part": "rightFoot",
    points: limbPolygon("rightThigh", "thigh", p.rightHip, p.rightKnee, 29, 21),
  });
  makeNode("polygon", {
    class: `anime-torso ${layoutSelectedClass("torso")}`,
    "data-part": "torso",
    points: pointsString([
      torso.leftShoulder,
      torso.rightShoulder,
      torso.rightRib,
      torso.rightWaist,
      torso.rightHip,
      torso.pelvisTip,
      torso.leftHip,
      torso.leftWaist,
      torso.leftRib,
    ]),
  });
  makeNode("polygon", {
    class: `anime-neck ${layoutSelectedClass("head")}`,
    "data-part": "head",
    points: pointsString([
      offsetPoint(p.neck, -15, -4),
      offsetPoint(p.neck, 15, -4),
      offsetPoint(p.neck, 12, 26),
      offsetPoint(p.neck, -12, 26),
    ]),
  });
  makeNode("polygon", {
    class: `anime-head ${layoutSelectedClass("head")}`,
    "data-part": "head",
    points: pointsString([
      offsetPoint(p.head, -33, -48),
      offsetPoint(p.head, 30, -42),
      offsetPoint(p.head, 42, -5),
      offsetPoint(p.head, 24, 39),
      offsetPoint(p.head, -18, 46),
      offsetPoint(p.head, -41, 10),
    ]),
  });
  makeNode("polygon", {
    class: `anime-limb front-limb ${layoutSelectedClass("rightHand")}`,
    "data-part": "rightHand",
    points: limbPolygon("rightForearm", "forearm", p.rightElbow, p.rightHand, 18, 13),
  });
  makeNode("polygon", {
    class: `anime-hand ${layoutSelectedClass("leftHand")}`,
    "data-part": "leftHand",
    points: handPolygon(p.leftElbow, p.leftHand),
  });
  makeNode("polygon", {
    class: `anime-hand ${layoutSelectedClass("rightHand")}`,
    "data-part": "rightHand",
    points: handPolygon(p.rightElbow, p.rightHand),
  });
  makeNode("polygon", {
    class: `anime-limb front-leg ${layoutSelectedClass("rightFoot")}`,
    "data-part": "rightFoot",
    points: limbPolygon("rightCalf", "calf", p.rightKnee, p.rightFoot, 21, 15),
  });
  makeNode("polygon", {
    class: `anime-foot ${layoutSelectedClass("leftFoot")}`,
    "data-part": "leftFoot",
    points: footPolygon(p.leftKnee, p.leftFoot, -1),
  });
  makeNode("polygon", {
    class: `anime-foot ${layoutSelectedClass("rightFoot")}`,
    "data-part": "rightFoot",
    points: footPolygon(p.rightKnee, p.rightFoot, 1),
  });
}

function limbMidWidth(key, startWidth, endWidth) {
  return ((startWidth + endWidth) / 2) * (state.shape[key] / 100);
}

function limbPolygon(segmentId, key, start, end, startWidth, endWidth) {
  const axis = unitVector(start, end);
  const normal = { x: -axis.y, y: axis.x };
  const positiveHandle = limbHandlePoint(segmentId, key, 1, start, end, startWidth, endWidth);
  const negativeHandle = limbHandlePoint(segmentId, key, -1, start, end, startWidth, endWidth);
  return pointsString([
    addScaled(start, normal, startWidth / 2),
    positiveHandle.point,
    addScaled(end, normal, endWidth / 2),
    addScaled(end, normal, -endWidth / 2),
    negativeHandle.point,
    addScaled(start, normal, -startWidth / 2),
  ]);
}

function handPolygon(elbow, hand) {
  const axis = unitVector(elbow, hand);
  const normal = { x: -axis.y, y: axis.x };
  return pointsString([
    addScaled(hand, normal, 13),
    addScaled(addScaled(hand, axis, 14), normal, 8),
    addScaled(addScaled(hand, axis, 18), normal, -7),
    addScaled(hand, normal, -13),
    addScaled(hand, axis, -9),
  ]);
}

function footPolygon(knee, foot, direction) {
  const axis = unitVector(knee, foot);
  const normal = { x: -axis.y, y: axis.x };
  const toe = { x: foot.x + direction * 28, y: foot.y + 6 };
  return pointsString([
    addScaled(foot, normal, 11),
    addScaled(toe, normal, 6),
    addScaled(toe, normal, -7),
    addScaled(foot, normal, -13),
    addScaled(foot, axis, -12),
  ]);
}

function unitVector(start, end) {
  const length = Math.max(1, distance(start, end));
  return {
    x: (end.x - start.x) / length,
    y: (end.y - start.y) / length,
  };
}

function addScaled(point, vector, scale) {
  return {
    x: point.x + vector.x * scale,
    y: point.y + vector.y * scale,
  };
}

function offsetPoint(point, x, y) {
  return { x: point.x + x, y: point.y + y };
}

function pointsString(points) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

function renderTimingArcMarkers(path) {
  if (path.length < 2) return;
  const { anticipationEnd, settle } = timingBounds();
  const anticipationPath = sampledPathData(path, 0, anticipationEnd);
  const overshootPath = sampledPathData(path, settle, 1);
  if (anticipationPath) {
    makeNode("path", { class: "timing-arc-segment anticipation-segment", d: anticipationPath }, pathLayer);
  }
  if (overshootPath) {
    makeNode("path", { class: "timing-arc-segment overshoot-segment", d: overshootPath }, pathLayer);
  }

  [
    ["anticipation", anticipationEnd],
    ["overshoot", settle],
  ].forEach(([marker, progress]) => {
    const point = pointAlong(path, progress);
    const node = makeNode("rect", {
      class: `arc-timing-marker ${marker}-arc-marker`,
      "data-timing-marker": marker,
      x: point.x - 6,
      y: point.y - 6,
      width: 12,
      height: 12,
      rx: 1.5,
      role: "slider",
      tabindex: "0",
      "aria-label": `${marker} timing`,
      "aria-valuemin": "0",
      "aria-valuemax": "35",
      "aria-valuenow": String(Math.round((marker === "anticipation" ? state.anticipationTime : state.overshootTime) * 100)),
      transform: `rotate(45 ${point.x.toFixed(1)} ${point.y.toFixed(1)})`,
    }, pathLayer);
    node.addEventListener("pointerdown", (event) => startTimingDrag(event, marker, "arc"));
    node.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        nudgeTiming(marker, -1);
      }
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        nudgeTiming(marker, 1);
      }
    });
  });
}

function renderPath() {
  pathLayer.innerHTML = "";
  const selectedClip = editingMotionPath();
  const selectedClipId = selectedClip?.id;
  const hoverClipId = state.hoveredPathId;

  const paths = allMotionPaths();
  const renderCurve = (clip) => {
    if (clip.path.length < 2) return;
    const isSelected = clip.id === selectedClipId;
    const isHovered = clip.id === hoverClipId;
    const classes = `${clip.id === selectedMotionPath()?.id ? "motion-path" : "stored-motion-path"} motion-path-line ${isSelected ? "is-selected" : ""} ${isHovered ? "is-hovered" : ""}`;
    const pathNode = makeNode("path", {
      class: classes.trim(),
      "data-motion-path": "true",
      "data-path-id": clip.id,
      "data-path-part": clip.part,
      d: pathData(clip.path),
    }, pathLayer);

    pathNode.addEventListener("pointerenter", () => {
      if (state.isDrawing || state.isPanningFrame) return;
      state.hoveredPathId = clip.id;
      renderPath();
    });
    pathNode.addEventListener("pointerleave", () => {
      if (state.hoveredPathId !== clip.id) return;
      state.hoveredPathId = null;
      renderPath();
    });
    pathNode.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectMotionPath(clip.id);
    });
  };

  paths.forEach(renderCurve);

  const path = selectedClip?.path ?? [];
  if (path.length < 2) {
    renderPathSelection();
    return;
  }
  const end = path[path.length - 1];
  const prev = path[path.length - 8] ?? path[path.length - 2];
  const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
  const wing = 18;
  makeNode("line", {
    class: "path-arrow",
    x1: end.x,
    y1: end.y,
    x2: end.x - Math.cos(angle - 0.55) * wing,
    y2: end.y - Math.sin(angle - 0.55) * wing,
  }, pathLayer);
  makeNode("line", {
    class: "path-arrow",
    x1: end.x,
    y1: end.y,
    x2: end.x - Math.cos(angle + 0.55) * wing,
    y2: end.y - Math.sin(angle + 0.55) * wing,
  }, pathLayer);

  const majorEvery = Math.max(2, Math.round(state.frameRate / 4));
  for (let frame = 1; frame < state.totalFrames - 1; frame += 1) {
    const t = pathProgressForTime(frameProgress(frame));
    const point = pointAlong(path, t);
    const tangent = tangentAt(path, t);
    const normal = { x: -tangent.y, y: tangent.x };
    const isMajor = frame % majorEvery === 0;
    const length = isMajor ? 18 : 10;
    makeNode("line", {
      class: `timing-tick ${isMajor ? "major-tick" : "minor-tick"}`,
      "data-frame": frame + 1,
      x1: point.x - normal.x * length * 0.5,
      y1: point.y - normal.y * length * 0.5,
      x2: point.x + normal.x * length * 0.5,
      y2: point.y + normal.y * length * 0.5,
    }, pathLayer);
  }
  renderTimingArcMarkers(path);
  renderPathSelection(selectedClip);
}

function renderPathSelection(selectedClip = null) {
  if (state.mode !== "motion") return;
  if (!selectedClip?.path?.length) return;
  const bounds = pathBounds(selectedClip.path);
  if (!bounds) return;
  const pad = 10;
  const minX = bounds.minX - pad;
  const maxX = bounds.maxX + pad;
  const minY = bounds.minY - pad;
  const maxY = bounds.maxY + pad;
  const width = maxX - minX;
  const height = maxY - minY;
  makeNode("rect", {
    class: "motion-path-bounds",
    x: minX.toFixed(1),
    y: minY.toFixed(1),
    width: width.toFixed(1),
    height: height.toFixed(1),
  }, pathLayer);

  const handleSize = 6;
  const handleOffset = handleSize / 2;
  [
    [minX, minY],
    [minX + width / 2, minY],
    [maxX, minY],
    [maxX, minY + height / 2],
    [maxX, maxY],
    [minX + width / 2, maxY],
    [minX, maxY],
    [minX, minY + height / 2],
  ].forEach(([x, y]) => {
    makeNode("rect", {
      class: "motion-path-bound-handle",
      x: (x - handleOffset).toFixed(1),
      y: (y - handleOffset).toFixed(1),
      width: handleSize,
      height: handleSize,
    }, pathLayer);
  });

  const size = 16;
  const buttonX = (maxX + 6).toFixed(1);
  const buttonY = (minY - size - 6).toFixed(1);
  const removeGroup = makeNode("g", {
    class: "motion-path-delete",
    tabindex: "0",
    role: "button",
    "aria-label": "Delete selected motion path",
    "data-action": "delete-selected-path",
  }, pathLayer);
  makeNode("rect", {
    class: "motion-path-delete-bg",
    x: buttonX,
    y: buttonY,
    width: size,
    height: size,
    rx: 3,
  }, removeGroup);
  makeNode("text", {
    class: "motion-path-delete-text",
    x: (maxX + 6 + size / 2).toFixed(1),
    y: (minY - size - 6 + size / 2 - 3).toFixed(1),
    "dominant-baseline": "middle",
    "text-anchor": "middle",
  }, removeGroup).textContent = "×";
  removeGroup.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteSelectedMotionPath();
  });
  removeGroup.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      deleteSelectedMotionPath();
    }
  });
}

function renderGhosts() {
  ghostLayer.innerHTML = "";
  const path = selectedPathPoints();
  if (path.length < 2) return;
  [0.25, 0.5, 0.75].forEach((t) => {
    const point = pointAlong(path, pathProgressForTime(t));
    makeNode("circle", { class: "ghost", cx: point.x, cy: point.y, r: 18, fill: "#d73b30" }, ghostLayer);
  });
}

function frameProgress(frameIndex) {
  return state.totalFrames <= 1 ? 0 : frameIndex / (state.totalFrames - 1);
}

function poseForFrame(frameIndex) {
  const t = frameProgress(frameIndex);
  let pose = structuredClone(state.base);
  activeMotionPaths().forEach((clip) => {
    pose = connectedPose(clip.part, pointAlong(clip.path, pathProgressForTime(t)), pose);
  });
  return pose;
}

function miniPoint(point) {
  return {
    x: Math.max(4, Math.min(84, (point.x / 900) * 88)),
    y: Math.max(4, Math.min(64, (point.y / 640) * 68)),
  };
}

function miniLine(pose, a, b, className = "mini-limb") {
  const p1 = miniPoint(pose[a]);
  const p2 = miniPoint(pose[b]);
  return `<line class="${className}" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" />`;
}

function renderMiniPose(pose, frameNumber) {
  const head = miniPoint(pose.head);
  const torso = miniPoint(pose.torso);
  const leftHip = miniPoint(pose.leftHip);
  const rightHip = miniPoint(pose.rightHip);
  const contactPart = pose[state.selectedPart] ? state.selectedPart : activeMotionPaths()[0]?.part;
  const contactPoint = contactPart ? miniPoint(pose[contactPart]) : null;
  return `
    <svg class="frame-preview" viewBox="0 0 88 68" aria-hidden="true" focusable="false">
      ${miniLine(pose, "leftHip", "rightHip", "mini-hip")}
      ${miniLine(pose, "leftShoulder", "rightShoulder", "mini-shoulder")}
      ${miniLine(pose, "leftShoulder", "leftElbow")}
      ${miniLine(pose, "leftElbow", "leftHand")}
      ${miniLine(pose, "rightShoulder", "rightElbow")}
      ${miniLine(pose, "rightElbow", "rightHand")}
      ${miniLine(pose, "leftHip", "leftKnee", "mini-leg")}
      ${miniLine(pose, "leftKnee", "leftFoot", "mini-leg")}
      ${miniLine(pose, "rightHip", "rightKnee", "mini-leg")}
      ${miniLine(pose, "rightKnee", "rightFoot", "mini-leg")}
      <line class="mini-spine" x1="${head.x.toFixed(1)}" y1="${(head.y + 6).toFixed(1)}" x2="${torso.x.toFixed(1)}" y2="${torso.y.toFixed(1)}" />
      <circle class="mini-head" cx="${head.x.toFixed(1)}" cy="${head.y.toFixed(1)}" r="5.2" />
      <circle class="mini-body" cx="${torso.x.toFixed(1)}" cy="${torso.y.toFixed(1)}" r="4.6" />
      ${contactPoint ? `<circle class="mini-contact" cx="${contactPoint.x.toFixed(1)}" cy="${contactPoint.y.toFixed(1)}" r="3.2" />` : ""}
    </svg>
    <span>${String(frameNumber).padStart(2, "0")}</span>
  `;
}

function renderPlayButton() {
  playButton.classList.toggle("is-playing", state.isPlaying);
  playButton.setAttribute("aria-label", state.isPlaying ? "Pause animation" : "Play animation");
  playButton.setAttribute("title", state.isPlaying ? "Pause" : "Play");
}

function setFrame(frameIndex, shouldRenderPuppet = true) {
  state.currentFrame = Math.max(0, Math.min(state.totalFrames - 1, frameIndex));
  if (activeMotionPaths().length) {
    state.pose = poseForFrame(state.currentFrame);
  }
  if (shouldRenderPuppet) renderPuppet();
  renderTimeline();
  renderState();
}

function renderTimeline() {
  timelineTrack.innerHTML = "";
  for (let i = 0; i < state.totalFrames; i += 1) {
    const button = document.createElement("button");
    const pose = poseForFrame(i);
    button.type = "button";
    button.className = `frame-cell ${i === state.currentFrame ? "is-current" : ""} ${i === 0 || i === state.totalFrames - 1 || state.keyframes[i] ? "is-key" : ""}`;
    button.setAttribute("aria-label", `Frame ${i + 1}`);
    button.innerHTML = renderMiniPose(pose, i + 1);
    button.addEventListener("click", () => {
      state.isPlaying = false;
      setFrame(i);
      saveState();
    });
    timelineTrack.append(button);
  }

  frameLabel.textContent = `Frame ${String(state.currentFrame + 1).padStart(2, "0")} / ${state.totalFrames} at ${state.frameRate} fps`;
  const selectedPathCount = state.motionPaths[state.selectedPart]?.length ?? 0;
  const activeCount = activeMotionPaths().length;
  const storedCount = allMotionPaths().length;
  timelineHint.textContent = activeCount
    ? `${activeCount} active / ${storedCount} stored - ${selectedPathCount} on ${selectedPartLabel()}`
    : "Draw a path to preview.";
  renderPlayButton();
}

function graphPoint(point) {
  return {
    x: 12 + point.x * 156,
    y: 60 - point.y * 48,
  };
}

function bezierCurveData() {
  const samples = 32;
  return Array.from({ length: samples + 1 }, (_, index) => {
    const t = index / samples;
    const point = graphPoint({
      x: cubicBezierCoord(t, state.easingBezier.x1, state.easingBezier.x2),
      y: cubicBezierCoord(t, state.easingBezier.y1, state.easingBezier.y2),
    });
    return `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(" ");
}

function renderBezierEditor() {
  const a = graphPoint({ x: state.easingBezier.x1, y: state.easingBezier.y1 });
  const b = graphPoint({ x: state.easingBezier.x2, y: state.easingBezier.y2 });
  bezierCurveLine.setAttribute("d", bezierCurveData());
  bezierControlLineA.setAttribute("x1", "12");
  bezierControlLineA.setAttribute("y1", "60");
  bezierControlLineA.setAttribute("x2", a.x.toFixed(1));
  bezierControlLineA.setAttribute("y2", a.y.toFixed(1));
  bezierControlLineB.setAttribute("x1", "168");
  bezierControlLineB.setAttribute("y1", "12");
  bezierControlLineB.setAttribute("x2", b.x.toFixed(1));
  bezierControlLineB.setAttribute("y2", b.y.toFixed(1));
  bezierHandleA.setAttribute("cx", a.x.toFixed(1));
  bezierHandleA.setAttribute("cy", a.y.toFixed(1));
  bezierHandleB.setAttribute("cx", b.x.toFixed(1));
  bezierHandleB.setAttribute("cy", b.y.toFixed(1));
  bezierValue.textContent = `cubic-bezier(${state.easingBezier.x1.toFixed(2)}, ${state.easingBezier.y1.toFixed(2)}, ${state.easingBezier.x2.toFixed(2)}, ${state.easingBezier.y2.toFixed(2)})`;
}

function renderState() {
  const { anticipationEnd, settle } = timingBounds();
  renderMode();
  selectedLabel.textContent = `${state.mode === "layout" ? "Layout" : "Motion"}: ${selectedPartLabel()}`;
  renderBezierEditor();
  anticipationValue.textContent = `${Math.round(state.anticipationTime * 100)}%`;
  overshootValue.textContent = `${Math.round(state.overshootTime * 100)}%`;
  timingRail.style.setProperty("--anticipation-pos", `${Math.round(anticipationEnd * 100)}%`);
  timingRail.style.setProperty("--overshoot-pos", `${Math.round(settle * 100)}%`);
  anticipationMarker.setAttribute("aria-valuenow", String(Math.round(state.anticipationTime * 100)));
  overshootMarker.setAttribute("aria-valuenow", String(Math.round(state.overshootTime * 100)));
  durationValue.textContent = `${(state.duration / 1000).toFixed(1)}s`;
  const selectedClip = editingMotionPath();
  const clip = createMotionClip({
    character: state.character,
    timing: {
      easing: "cubic-bezier",
      easingBezier: state.easingBezier,
      anticipationTime: state.anticipationTime,
      overshootTime: state.overshootTime,
      anticipationBoundary: anticipationEnd,
      settleBoundary: settle,
      interpretation: "path-boundaries",
    },
    durationMs: state.duration,
    frameRate: state.frameRate,
    part: state.selectedPart,
    path: selectedClip?.path ?? [],
    motionPaths: activeMotionPaths(),
    poses: Array.from({ length: state.totalFrames }, (_, index) => poseForFrame(index)),
  });
  stateReadout.textContent = JSON.stringify({
    mode: state.mode,
    character: state.character,
    selectedPart: state.selectedPart,
    layout: state.layout,
    shape: state.shape,
    polygonEdits: state.polygonEdits,
    camera: state.camera,
    currentFrame: state.currentFrame + 1,
    totalFrames: state.totalFrames,
    keyedFrames: Object.keys(state.keyframes).map((frame) => Number(frame) + 1),
    frameRate: state.frameRate,
    easing: "cubic-bezier",
    easingBezier: state.easingBezier,
    anticipationTime: state.anticipationTime,
    overshootTime: state.overshootTime,
    anticipationBoundary: anticipationEnd,
    settleBoundary: settle,
    durationMs: state.duration,
    selectedPathPoints: selectedClip?.path.length ?? 0,
    activePathCount: activeMotionPaths().length,
    storedPathCount: allMotionPaths().length,
    motionPaths: state.motionPaths,
    activePathIdByPart: state.activePathIdByPart,
    poseTarget: state.pose[state.selectedPart],
    exportFormat: clip.format,
  }, null, 2);
}

function render() {
  renderCamera();
  renderPuppet();
  renderPath();
  renderGhosts();
  renderTimeline();
  renderState();
  renderMotionGuideLine();
  updateStageCursor();
}

function renderMotionGuideLine() {
  if (!motionGuideLine) return;
  const source = selectedNodePoint();
  if (
    state.mode !== "motion"
    || state.isDrawing
    || state.isPanningFrame
    || state.isPlaying
    || !source
    || !motionCursorPoint
  ) {
    motionGuideLine.setAttribute("display", "none");
    return;
  }
  motionGuideLine.setAttribute("display", "block");
  motionGuideLine.setAttribute("x1", source.x.toFixed(1));
  motionGuideLine.setAttribute("y1", source.y.toFixed(1));
  motionGuideLine.setAttribute("x2", motionCursorPoint.x.toFixed(1));
  motionGuideLine.setAttribute("y2", motionCursorPoint.y.toFixed(1));
}

function renderCamera() {
  const zoom = clamp(state.camera.zoom, 0.75, 1.4);
  const width = 900 / zoom;
  const height = 640 / zoom;
  const x = state.camera.x + (900 - width) / 2;
  const y = state.camera.y + (640 - height) / 2;
  stage.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`);
  stage.classList.toggle("is-panning-frame", state.isPanningFrame);
  panButton.classList.toggle("is-active", state.isPanningFrame);
  panButton.setAttribute("aria-pressed", String(state.isPanningFrame));
  cameraFrameBadge.hidden = !state.isPanningFrame;
  zoomInput.value = String(Math.round(zoom * 100));
}

function setCamera(nextCamera) {
  state.camera = {
    x: clamp(nextCamera.x, -260, 260),
    y: clamp(nextCamera.y, -220, 220),
    zoom: clamp(nextCamera.zoom, 0.75, 1.4),
  };
  renderCamera();
  saveState();
}

function finishPanFrame() {
  state.isPanningFrame = false;
  renderCamera();
  saveState();
}

function setMode(mode) {
  state.mode = mode;
  state.isDrawing = false;
  state.isPlaying = false;
  if (mode !== "motion") {
    state.selectedPathId = null;
    state.hoveredPathId = null;
  }
  render();
  saveState();
}

function renderMode() {
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  modePanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.modePanel === state.mode);
  });
  stage.classList.toggle("layout-mode", state.mode === "layout");
  stage.classList.toggle("motion-mode", state.mode === "motion");
}

function renderLayoutPresets() {
  layoutPresetSelect.innerHTML = "";
  [
    { name: "Polyman Default", value: "builtin-default" },
    ...state.layoutPresets.map((preset, index) => ({ name: preset.name, value: `custom-${index}` })),
  ].forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.value;
    option.textContent = preset.name;
    layoutPresetSelect.append(option);
  });
}

function layoutPoint(point, heightScale, buildScale, floorY = 620, centerX = 450) {
  return {
    x: centerX + (point.x - centerX) * buildScale,
    y: floorY - (floorY - point.y) * heightScale,
  };
}

function applyLayoutProportions() {
  const heightScale = state.layout.height / 100;
  const buildScale = state.layout.build / 100;
  const armScale = state.layout.arms / 100;
  const legScale = state.layout.legs / 100;
  const nextBase = {};

  ["head", "neck", "torso", "leftShoulder", "rightShoulder", "leftHip", "rightHip"].forEach((node) => {
    nextBase[node] = layoutPoint(defaultBase[node], heightScale, buildScale);
  });

  [
    ["leftShoulder", "leftElbow", "leftHand"],
    ["rightShoulder", "rightElbow", "rightHand"],
  ].forEach(([root, mid, end]) => {
    const rootPoint = nextBase[root];
    nextBase[mid] = {
      x: rootPoint.x + (defaultBase[mid].x - defaultBase[root].x) * armScale,
      y: rootPoint.y + (defaultBase[mid].y - defaultBase[root].y) * armScale * heightScale,
    };
    nextBase[end] = {
      x: rootPoint.x + (defaultBase[end].x - defaultBase[root].x) * armScale,
      y: rootPoint.y + (defaultBase[end].y - defaultBase[root].y) * armScale * heightScale,
    };
  });

  [
    ["leftHip", "leftKnee", "leftFoot"],
    ["rightHip", "rightKnee", "rightFoot"],
  ].forEach(([root, mid, end]) => {
    const rootPoint = nextBase[root];
    nextBase[mid] = {
      x: rootPoint.x + (defaultBase[mid].x - defaultBase[root].x) * buildScale,
      y: rootPoint.y + (defaultBase[mid].y - defaultBase[root].y) * legScale * heightScale,
    };
    nextBase[end] = {
      x: rootPoint.x + (defaultBase[end].x - defaultBase[root].x) * buildScale,
      y: rootPoint.y + (defaultBase[end].y - defaultBase[root].y) * legScale * heightScale,
    };
  });

  state.base = nextBase;
  state.pose = structuredClone(state.base);
  state.currentFrame = 0;
}

function bezierEditorPoint(event) {
  const pt = bezierEditor.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const transformed = pt.matrixTransform(bezierEditor.getScreenCTM().inverse());
  return {
    x: clamp((transformed.x - 12) / 156, 0, 1),
    y: clamp((60 - transformed.y) / 48, 0, 1),
  };
}

function applyBezierHandle(handle, point) {
  if (handle === "a") {
    state.easingBezier.x1 = point.x;
    state.easingBezier.y1 = point.y;
  } else {
    state.easingBezier.x2 = point.x;
    state.easingBezier.y2 = point.y;
  }
  state.easingIntensity = curveEnergy();
  setFrame(state.currentFrame, true);
  renderPath();
  renderGhosts();
  saveState();
}

function startBezierDrag(event, handle) {
  event.preventDefault();
  event.stopPropagation();
  applyBezierHandle(handle, bezierEditorPoint(event));

  const move = (moveEvent) => applyBezierHandle(handle, bezierEditorPoint(moveEvent));
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
}

function setLayoutNode(nodeName, point) {
  state.base[nodeName] = point;
  state.pose[nodeName] = point;
  state.currentFrame = 0;
  render();
  saveState();
}

function startShapeHandleDrag(event, handle) {
  event.preventDefault();
  event.stopPropagation();
  const startPoint = stagePoint(event);
  const edgeSide = Number(handle.edgeSide) || 1;
  const startEdit = handle.drag === "free"
    ? { ...(state.polygonEdits[handle.editId] ?? { dx: 0, dy: 0 }) }
    : { t: handle.t, distance: handle.distance };

  const move = (moveEvent) => {
    const point = stagePoint(moveEvent);
    const dx = point.x - startPoint.x;
    const dy = point.y - startPoint.y;
    if (handle.drag === "limb-polygon") {
      const along = dx * handle.axis.x + dy * handle.axis.y;
      const outward = dx * handle.normal.x + dy * handle.normal.y;
      setLimbPolygonHandle(handle.segmentId, edgeSide, {
        t: startEdit.t + along / Math.max(1, handle.length),
        distance: startEdit.distance + outward * edgeSide,
      });
      return;
    }
    if (handle.drag === "free") {
      setTorsoPolygonHandle(handle.editId, (startEdit.dx ?? 0) + dx, (startEdit.dy ?? 0) + dy);
      return;
    }
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
}

function startNodeInteraction(event, nodeName) {
  event.preventDefault();
  event.stopPropagation();
  if (state.mode === "motion" && state.selectedPart === nodeName) {
    beginMotionStroke(event);
    return;
  }
  state.selectedPart = nodeName;
  if (state.mode !== "layout") {
    render();
    saveState();
    return;
  }

  setLayoutNode(nodeName, stagePoint(event));
  const move = (moveEvent) => setLayoutNode(nodeName, stagePoint(moveEvent));
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
}

function stagePoint(event) {
  const pt = stage.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const transformed = pt.matrixTransform(stage.getScreenCTM().inverse());
  return { x: transformed.x, y: transformed.y };
}

function selectMotionPath(pathId) {
  state.selectedPathId = pathId;
  const clip = selectedClipById(pathId);
  if (clip && clip.part && partLabels[clip.part]) {
    state.selectedPart = clip.part;
  }
  render();
}

function deleteSelectedMotionPath() {
  const clip = selectedClipById(state.selectedPathId);
  if (!clip) return;
  const clips = state.motionPaths[clip.part] ?? [];
  const nextClips = clips.filter((pathClip) => pathClip.id !== clip.id);
  if (nextClips.length) {
    state.motionPaths[clip.part] = nextClips;
    const activeId = state.activePathIdByPart[clip.part];
    if (!nextClips.some((pathClip) => pathClip.id === activeId)) {
      state.activePathIdByPart[clip.part] = nextClips[nextClips.length - 1].id;
    }
  } else {
    delete state.motionPaths[clip.part];
    delete state.activePathIdByPart[clip.part];
  }
  state.selectedPathId = null;
  state.hoveredPathId = null;
  state.currentFrame = 0;
  state.pose = structuredClone(state.base);
  render();
  saveState();
}

function startFramePan(event) {
  event.preventDefault();
  event.stopPropagation();
  stage.setPointerCapture(event.pointerId);
  const startX = event.clientX;
  const startY = event.clientY;
  const startCamera = { ...state.camera };
  const rect = stage.getBoundingClientRect();
  const unitsPerPixelX = (900 / state.camera.zoom) / Math.max(1, rect.width);
  const unitsPerPixelY = (640 / state.camera.zoom) / Math.max(1, rect.height);

  const move = (moveEvent) => {
    setCamera({
      ...startCamera,
      x: startCamera.x - (moveEvent.clientX - startX) * unitsPerPixelX,
      y: startCamera.y - (moveEvent.clientY - startY) * unitsPerPixelY,
    });
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
}

function canDrawAtTarget(target) {
  if (state.isPanningFrame) return false;
  const node = target.closest?.("[data-node]");
  return state.mode === "motion"
    && Boolean(state.selectedPart)
    && !target.closest?.("#puppet")
    && !target.closest?.("[data-motion-path]")
    && !target.closest?.("[data-timing-marker]")
    && !target.closest?.("[data-shape-handle]")
    && (!node || node.dataset.node === state.selectedPart);
}

function updateStageCursor(event) {
  if (event) {
    motionCursorPoint = stagePoint(event);
  }
  stage.classList.toggle("pen-ready", Boolean(event && canDrawAtTarget(event.target)));
  renderMotionGuideLine();
}

function beginMotionStroke(event) {
  stage.setPointerCapture(event.pointerId);
  state.isDrawing = true;
  const start = state.pose[state.selectedPart];
  const clip = createMotionPath(state.selectedPart, [start, stagePoint(event)]);
  state.motionPaths[state.selectedPart] = [
    ...(state.motionPaths[state.selectedPart] ?? []),
    clip,
  ];
  state.activePathIdByPart[state.selectedPart] = clip.id;
  state.drawingPathId = clip.id;
  state.selectedPathId = clip.id;
  state.currentFrame = 0;
  saveState();
  render();
}

function play() {
  if (!activeMotionPaths().length) return;
  if (state.isPlaying) {
    state.isPlaying = false;
    renderPlayButton();
    return;
  }
  state.isPlaying = true;
  render();
  renderPlayButton();
  const start = performance.now();
  const frameDuration = 1000 / state.frameRate;
  let lastFrame = -1;

  function frame(now) {
    const elapsedFrames = Math.floor((now - start) / frameDuration);
    const nextFrame = Math.min(state.totalFrames - 1, elapsedFrames);
    if (nextFrame !== lastFrame) {
      setFrame(nextFrame);
      lastFrame = nextFrame;
    }
    if (nextFrame < state.totalFrames - 1 && state.isPlaying) {
      requestAnimationFrame(frame);
    } else {
      state.isPlaying = false;
      state.currentFrame = state.totalFrames - 1;
      state.pose = poseForFrame(state.currentFrame);
      renderPuppet();
      renderTimeline();
      renderState();
      saveState();
    }
  }

  requestAnimationFrame(frame);
}

function applyTimingValue(marker, value) {
  if (marker === "anticipation") {
    state.anticipationTime = Math.max(0, Math.min(0.35, 1 - state.overshootTime - 0.05, value));
  } else {
    state.overshootTime = Math.max(0, Math.min(0.35, 1 - state.anticipationTime - 0.05, value));
  }
  setFrame(state.currentFrame, true);
  renderPath();
  renderGhosts();
  saveState();
}

function setTimingFromArc(event, marker) {
  const path = selectedPathPoints();
  if (path.length < 2) return;
  const raw = progressClosestToPoint(path, stagePoint(event));
  applyTimingValue(marker, marker === "anticipation" ? raw : 1 - raw);
}

function setTimingFromRail(event, marker) {
  const rect = timingRail.getBoundingClientRect();
  const raw = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  applyTimingValue(marker, marker === "anticipation" ? raw : 1 - raw);
}

function startTimingDrag(event, marker, source) {
  event.preventDefault();
  event.stopPropagation();
  const updateTiming = source === "rail" ? setTimingFromRail : setTimingFromArc;
  updateTiming(event, marker);

  const move = (moveEvent) => updateTiming(moveEvent, marker);
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
}

function nudgeTiming(marker, direction) {
  if (marker === "anticipation") {
    applyTimingValue("anticipation", state.anticipationTime + direction * 0.01);
  } else {
    applyTimingValue("overshoot", state.overshootTime + direction * 0.01);
  }
}

stage.addEventListener("pointerdown", (event) => {
  if (state.isPanningFrame) {
    startFramePan(event);
    return;
  }
  if (!canDrawAtTarget(event.target)) return;
  beginMotionStroke(event);
});

stage.addEventListener("pointermove", (event) => {
  updateStageCursor(event);
  if (!state.isDrawing) return;
  const clip = drawingMotionPath();
  if (!clip) return;
  const point = stagePoint(event);
  const last = clip.path[clip.path.length - 1];
  if (!last || distance(last, point) > 5) {
    clip.path.push(point);
    renderPath();
    renderGhosts();
    renderTimeline();
    renderState();
    saveState();
  }
});

stage.addEventListener("pointerleave", () => {
  stage.classList.remove("pen-ready");
  motionCursorPoint = null;
  renderMotionGuideLine();
});

stage.addEventListener("pointerup", () => {
  state.isDrawing = false;
  state.drawingPathId = null;
  renderTimeline();
  renderMotionGuideLine();
  saveState();
});

panButton.addEventListener("click", () => {
  state.isPanningFrame = !state.isPanningFrame;
  state.isDrawing = false;
  renderCamera();
  updateStageCursor();
  saveState();
});

panDoneButton.addEventListener("click", finishPanFrame);

zoomInput.addEventListener("input", () => {
  setCamera({
    ...state.camera,
    zoom: Number(zoomInput.value) / 100,
  });
});

bezierHandleA.addEventListener("pointerdown", (event) => startBezierDrag(event, "a"));
bezierHandleB.addEventListener("pointerdown", (event) => startBezierDrag(event, "b"));

[bezierHandleA, bezierHandleB].forEach((handleNode) => {
  handleNode.addEventListener("keydown", (event) => {
    const handle = event.currentTarget.dataset.bezierHandle;
    const point = handle === "a"
      ? { x: state.easingBezier.x1, y: state.easingBezier.y1 }
      : { x: state.easingBezier.x2, y: state.easingBezier.y2 };
    const step = event.shiftKey ? 0.05 : 0.01;
    if (event.key === "ArrowLeft") point.x -= step;
    else if (event.key === "ArrowRight") point.x += step;
    else if (event.key === "ArrowDown") point.y -= step;
    else if (event.key === "ArrowUp") point.y += step;
    else return;
    event.preventDefault();
    applyBezierHandle(handle, { x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) });
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

[heightInput, buildInput, legInput, armInput].forEach((input) => {
  input.addEventListener("input", () => {
    state.layout = {
      height: Number(heightInput.value),
      build: Number(buildInput.value),
      legs: Number(legInput.value),
      arms: Number(armInput.value),
    };
    applyLayoutProportions();
    render();
    saveState();
  });
});

layoutPresetSelect.addEventListener("change", (event) => {
    if (event.target.value === "builtin-default") {
      state.layout = structuredClone(defaultLayout);
      state.shape = structuredClone(defaultShape);
      state.polygonEdits = structuredClone(defaultPolygonEdits);
      state.base = structuredClone(defaultBase);
    } else {
      const preset = state.layoutPresets[Number(event.target.value.replace("custom-", ""))];
      if (!preset) return;
      state.layout = structuredClone(preset.layout);
      state.shape = structuredClone(preset.shape ?? defaultShape);
      state.polygonEdits = structuredClone(preset.polygonEdits ?? defaultPolygonEdits);
      state.base = structuredClone(preset.base);
    }
  state.pose = structuredClone(state.base);
  syncControls();
  render();
  saveState();
});

savePresetButton.addEventListener("click", () => {
  const name = `Custom ${state.layoutPresets.length + 1}`;
  state.layoutPresets.push({
    name,
    layout: structuredClone(state.layout),
    shape: structuredClone(state.shape),
    polygonEdits: structuredClone(state.polygonEdits),
    base: structuredClone(state.base),
  });
  renderLayoutPresets();
  layoutPresetSelect.value = `custom-${state.layoutPresets.length - 1}`;
  saveState();
});

keyPoseButton.addEventListener("click", () => {
  state.keyframes[state.currentFrame] = structuredClone(state.pose);
  renderTimeline();
  renderState();
  saveState();
});

anticipationMarker.addEventListener("pointerdown", (event) => {
  startTimingDrag(event, "anticipation", "rail");
});

overshootMarker.addEventListener("pointerdown", (event) => {
  startTimingDrag(event, "overshoot", "rail");
});

timingRail.addEventListener("pointerdown", (event) => {
  const rect = timingRail.getBoundingClientRect();
  const raw = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const overshootProgress = 1 - state.overshootTime;
  const marker = Math.abs(raw - state.anticipationTime) <= Math.abs(raw - overshootProgress) ? "anticipation" : "overshoot";
  startTimingDrag(event, marker, "rail");
});

anticipationMarker.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    nudgeTiming("anticipation", -1);
  }
  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    event.preventDefault();
    nudgeTiming("anticipation", 1);
  }
});

overshootMarker.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    nudgeTiming("overshoot", -1);
  }
  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    event.preventDefault();
    nudgeTiming("overshoot", 1);
  }
});

characterSelect.addEventListener("change", (event) => {
  state.character = event.target.value;
  render();
  saveState();
});

durationInput.addEventListener("input", (event) => {
  state.duration = Number(event.target.value);
  syncFrameCount();
  setFrame(state.currentFrame, true);
  renderPath();
  saveState();
});

frameRateSelect.addEventListener("change", (event) => {
  state.frameRate = Number(event.target.value);
  syncFrameCount();
  setFrame(state.currentFrame, true);
  renderPath();
  saveState();
});

durationInput.addEventListener("change", () => {
  renderTimeline();
  renderState();
});

playButton.addEventListener("click", play);

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const interactive = target.closest?.("input, select, textarea, button, [role='slider']");
  if (state.isPanningFrame && event.key === "Enter" && !interactive) {
    event.preventDefault();
    finishPanFrame();
    return;
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (!interactive && state.selectedPathId) {
      event.preventDefault();
      deleteSelectedMotionPath();
      return;
    }
  }
  if (event.code !== "Space" || interactive) return;
  event.preventDefault();
  play();
});

resetAllButton.addEventListener("click", () => {
  state.isPlaying = false;
  state.currentFrame = 0;
  state.motionPaths = {};
  state.activePathIdByPart = {};
  state.drawingPathId = null;
  state.selectedPathId = null;
  state.hoveredPathId = null;
  state.pose = structuredClone(state.base);
  state.camera = structuredClone(defaultCamera);
  state.isPanningFrame = false;
  render();
  saveState();
});

loadSavedState();
syncFrameCount();
syncControls();
if (activeMotionPaths().length) {
  state.pose = poseForFrame(state.currentFrame);
}
render();
