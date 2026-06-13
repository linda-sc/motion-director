import { createMotionClip } from "./motion-format.js";

const svgNS = "http://www.w3.org/2000/svg";
const storageKey = "motion-director-state-v1";
const cameraZoomMin = 0.45;
const cameraZoomMax = 1.4;
const cameraZoomDefault = 0.7;
const legacyCameraZoomDefault = 0.9;
const keyframeDurationMaxMs = 8000;
const defaultKeyframeSpanMs = 1100;

const partLabels = {
  head: "Head",
  neck: "Neck",
  torso: "Torso",
  chest: "Chest",
  stomach: "Stomach",
  hips: "Hips",
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
  "chest",
  "stomach",
  "hips",
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
  customBaseName: null,
  selectedPart: null,
  easingIntensity: 0.68,
  easingBezier: { x1: 0.22, y1: 0.02, x2: 0.18, y2: 1 },
  anticipationTime: 0.18,
  overshootTime: 0.18,
  duration: 1100,
  frameRate: 12,
  totalFrames: 14,
  timelineCellScale: 1,
  currentFrame: 0,
  isDrawing: false,
  isPlaying: false,
  playbackLoop: false,
  playbackPingPong: false,
  isPanningFrame: false,
  selectedPathId: null,
  hoveredPathId: null,
  motionTether: null,
  camera: {
    x: 0,
    y: 0,
    zoom: cameraZoomDefault,
  },
  shotCamera: {
    x: 0,
    y: 0,
    zoom: cameraZoomDefault,
  },
  motionPaths: {},
  activePathIdByPart: {},
  suppressedGeneratedMotionPaths: {},
  drawingPathId: null,
  redrawingPathId: null,
  redrawReferencePath: null,
  keyframes: {},
  selectedAnchorIndex: 0,
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
    chest: { x: 450, y: 256 },
    stomach: { x: 450, y: 326 },
    hips: { x: 450, y: 398 },
    leftShoulder: { x: 394, y: 238 },
    rightShoulder: { x: 506, y: 238 },
    leftElbow: { x: 340, y: 300 },
    rightElbow: { x: 568, y: 292 },
    leftHand: { x: 306, y: 372 },
    rightHand: { x: 618, y: 356 },
    leftHip: { x: 416, y: 398 },
    rightHip: { x: 484, y: 398 },
    leftKnee: { x: 386, y: 536 },
    rightKnee: { x: 522, y: 532 },
    leftFoot: { x: 360, y: 672 },
    rightFoot: { x: 548, y: 668 },
  },
  pose: {},
};

normalizeTorsoNodes(state.base);
state.pose = normalizeTorsoNodes(structuredClone(state.base));
const defaultBase = structuredClone(state.base);
const defaultLayout = structuredClone(state.layout);
const defaultShape = structuredClone(state.shape);
const defaultPolygonEdits = structuredClone(state.polygonEdits);
const defaultCamera = structuredClone(state.camera);
const layoutAverageScale = {
  height: 1,
  build: 1,
  legs: 1,
  arms: 1,
};
const legacyDefaultLegSets = [
  {
    leftKnee: { x: 390, y: 478 },
    rightKnee: { x: 518, y: 474 },
    leftFoot: { x: 366, y: 552 },
    rightFoot: { x: 540, y: 548 },
  },
  {
    leftKnee: { x: 386, y: 510 },
    rightKnee: { x: 522, y: 506 },
    leftFoot: { x: 360, y: 620 },
    rightFoot: { x: 548, y: 616 },
  },
];
const bodyResponseProfiles = {
  hips: {
    influences: [
      { node: "leftHip", source: "hips", weights: { x: 1, y: 1 } },
      { node: "rightHip", source: "hips", weights: { x: 1, y: 1 } },
    ],
  },
  chest: {
    influences: [
      { node: "leftShoulder", source: "chest", weights: { x: 0.35, y: 0.2 } },
      { node: "rightShoulder", source: "chest", weights: { x: 0.35, y: 0.2 } },
      { node: "neck", source: "chest", weights: { x: 0.3, y: 0.2 } },
    ],
  },
  head: {
    influences: [
      { node: "neck", source: "head", weights: { x: 0.35, y: 0 } },
      { node: "chest", source: "head", weights: { x: 0.05, y: 0 } },
    ],
  },
  neck: {
    influences: [
      { node: "head", source: "neck", weights: { x: 0.28, y: 0.2 } },
      { node: "chest", source: "neck", weights: { x: 0.08, y: 0.08 } },
    ],
  },
  stomach: {
    influences: [
      { node: "chest", source: "stomach", weights: { x: 0.16, y: 0.1 } },
      { node: "hips", source: "stomach", weights: { x: 0.18, y: 0.12 } },
      { node: "head", source: "stomach", weights: { x: 0.04, y: 0 } },
    ],
  },
  rightShoulder: {
    influences: [
      { node: "rightElbow", source: "rightShoulder", weights: { x: 0.44, y: 0.42 } },
      { node: "rightHand", source: "rightShoulder", weights: { x: 0.18, y: 0.16 } },
      { node: "chest", source: "rightShoulder", weights: { x: 0.1, y: 0.06 } },
      { node: "neck", source: "rightShoulder", weights: { x: 0.06, y: 0.04 } },
    ],
  },
  leftShoulder: {
    influences: [
      { node: "leftElbow", source: "leftShoulder", weights: { x: 0.44, y: 0.42 } },
      { node: "leftHand", source: "leftShoulder", weights: { x: 0.18, y: 0.16 } },
      { node: "chest", source: "leftShoulder", weights: { x: 0.1, y: 0.06 } },
      { node: "neck", source: "leftShoulder", weights: { x: 0.06, y: 0.04 } },
    ],
  },
  rightElbow: {
    influences: [
      { node: "rightShoulder", source: "rightElbow", weights: { x: 0.08, y: 0.06 } },
      { node: "rightHand", source: "rightElbow", weights: { x: 0.36, y: 0.34 } },
      { node: "stomach", source: "rightElbow", weights: { x: 0.015, y: 0 } },
    ],
  },
  leftElbow: {
    influences: [
      { node: "leftShoulder", source: "leftElbow", weights: { x: 0.08, y: 0.06 } },
      { node: "leftHand", source: "leftElbow", weights: { x: 0.36, y: 0.34 } },
      { node: "stomach", source: "leftElbow", weights: { x: 0.015, y: 0 } },
    ],
  },
  rightHand: {
    limb: {
      root: "rightShoulder",
      joint: "rightElbow",
      end: "rightHand",
      bend: -1,
      rootLag: { x: 0.1, y: 0.08 },
      upperLength: 84,
      lowerLength: 78,
    },
    influences: [
      { node: "stomach", source: "rightHand", weights: { x: 0.035, y: 0 } },
      { node: "head", source: "rightHand", weights: { x: 0.025, y: 0 } },
    ],
  },
  leftHand: {
    limb: {
      root: "leftShoulder",
      joint: "leftElbow",
      end: "leftHand",
      bend: 1,
      rootLag: { x: 0.1, y: 0.08 },
      upperLength: 82,
      lowerLength: 78,
    },
    influences: [
      { node: "stomach", source: "leftHand", weights: { x: 0.035, y: 0 } },
      { node: "head", source: "leftHand", weights: { x: 0.025, y: 0 } },
    ],
  },
  rightHip: {
    influences: [
      { node: "rightKnee", source: "rightHip", weights: { x: 0.34, y: 0.28 } },
      { node: "rightFoot", source: "rightHip", weights: { x: 0.12, y: 0.1 } },
      { node: "hips", source: "rightHip", weights: { x: 0.18, y: 0.12 } },
      { node: "stomach", source: "rightHip", weights: { x: 0.08, y: 0.05 } },
    ],
  },
  leftHip: {
    influences: [
      { node: "leftKnee", source: "leftHip", weights: { x: 0.34, y: 0.28 } },
      { node: "leftFoot", source: "leftHip", weights: { x: 0.12, y: 0.1 } },
      { node: "hips", source: "leftHip", weights: { x: 0.18, y: 0.12 } },
      { node: "stomach", source: "leftHip", weights: { x: 0.08, y: 0.05 } },
    ],
  },
  rightKnee: {
    influences: [
      { node: "rightHip", source: "rightKnee", weights: { x: 0.08, y: 0.05 } },
      { node: "rightFoot", source: "rightKnee", weights: { x: 0.28, y: 0.25 } },
      { node: "hips", source: "rightKnee", weights: { x: 0.04, y: 0.025 } },
      { node: "stomach", source: "rightKnee", weights: { x: 0.03, y: 0.015 } },
    ],
  },
  leftKnee: {
    influences: [
      { node: "leftHip", source: "leftKnee", weights: { x: 0.08, y: 0.05 } },
      { node: "leftFoot", source: "leftKnee", weights: { x: 0.28, y: 0.25 } },
      { node: "hips", source: "leftKnee", weights: { x: 0.04, y: 0.025 } },
      { node: "stomach", source: "leftKnee", weights: { x: 0.03, y: 0.015 } },
    ],
  },
  rightFoot: {
    limb: {
      root: "rightHip",
      joint: "rightKnee",
      end: "rightFoot",
      bend: -1,
      rootLag: { x: 0.08, y: 0.035 },
    },
    influences: [
      { node: "leftHip", source: "rightFoot", weights: { x: 0.025, y: 0.01 } },
      { node: "stomach", source: "rightFoot", weights: { x: 0.028, y: 0.012 } },
      { node: "hips", source: "rightFoot", weights: { x: 0.025, y: 0.01 } },
      { node: "head", source: "rightFoot", weights: { x: 0.014, y: 0 } },
    ],
  },
  leftFoot: {
    limb: {
      root: "leftHip",
      joint: "leftKnee",
      end: "leftFoot",
      bend: 1,
      rootLag: { x: 0.08, y: 0.035 },
    },
    influences: [
      { node: "rightHip", source: "leftFoot", weights: { x: 0.025, y: 0.01 } },
      { node: "stomach", source: "leftFoot", weights: { x: 0.028, y: 0.012 } },
      { node: "hips", source: "leftFoot", weights: { x: 0.025, y: 0.01 } },
      { node: "head", source: "leftFoot", weights: { x: 0.014, y: 0 } },
    ],
  },
};

const rigidResponseArcGroups = [
  new Set(["hips", "leftHip", "rightHip"]),
];

const stage = document.querySelector("#stage");
const stageBg = document.querySelector(".stage-bg");
const appShell = document.querySelector(".app-shell");
const sidePanelResizer = document.querySelector("#sidePanelResizer");
const ideateDock = document.querySelector("#ideateDock");
const ideateToggle = document.querySelector("#ideateToggle");
const ideatePopover = document.querySelector("#ideatePopover");
const ideateInput = document.querySelector("#ideateInput");
const ideateSubmit = document.querySelector("#ideateSubmit");
const fileMenu = document.querySelector("#fileMenu");
const openSaveAnimationModalButton = document.querySelector("#openSaveAnimationModalButton");
const openLoadAnimationModalButton = document.querySelector("#openLoadAnimationModalButton");
const saveAnimationModal = document.querySelector("#saveAnimationModal");
const saveAnimationForm = document.querySelector("#saveAnimationForm");
const animationNameInput = document.querySelector("#animationNameInput");
const closeSaveAnimationButton = document.querySelector("#closeSaveAnimationButton");
const cancelSaveAnimationButton = document.querySelector("#cancelSaveAnimationButton");
const saveAnimationButton = document.querySelector("#saveAnimationButton");
const loadAnimationModal = document.querySelector("#loadAnimationModal");
const loadAnimationForm = document.querySelector("#loadAnimationForm");
const animationFileInput = document.querySelector("#animationFileInput");
const closeLoadAnimationButton = document.querySelector("#closeLoadAnimationButton");
const cancelLoadAnimationButton = document.querySelector("#cancelLoadAnimationButton");
const loadAnimationButton = document.querySelector("#loadAnimationButton");
const saveAnimationStatus = document.querySelector("#saveAnimationStatus");
const loadAnimationStatus = document.querySelector("#loadAnimationStatus");
const motionDrawVeil = document.querySelector(".motion-draw-veil");
const puppet = document.querySelector("#puppet");
const nodeLayer = document.querySelector("#nodeLayer");
const pathLayer = document.querySelector("#pathLayer");
const ghostLayer = document.querySelector("#ghostLayer");
const shotCropMarks = document.querySelector("#shotCropMarks");
let puppetRenderParent = puppet;
const selectedLabel = document.querySelector("#selectedLabel");
const modeButtons = document.querySelectorAll("[data-mode]");
const keyframeSettingsPanel = document.querySelector("#keyframeSettingsPanel");
const arcSettingsPanel = document.querySelector("#arcSettingsPanel");
const characterSelect = document.querySelector("#characterSelect");
const newBaseButton = document.querySelector("#newBaseButton");
const newBaseModal = document.querySelector("#newBaseModal");
const newBaseForm = document.querySelector("#newBaseForm");
const closeNewBaseButton = document.querySelector("#closeNewBaseButton");
const cancelNewBaseButton = document.querySelector("#cancelNewBaseButton");
const newBaseNameInput = document.querySelector("#newBaseNameInput");
const newBaseHeightInput = document.querySelector("#newBaseHeightInput");
const newBaseBuildInput = document.querySelector("#newBaseBuildInput");
const newBaseLegInput = document.querySelector("#newBaseLegInput");
const newBaseArmInput = document.querySelector("#newBaseArmInput");
const newFigurePreview = document.querySelector("#newFigurePreview");
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
const arcTimingControl = document.querySelector("#arcTimingControl");
const arcTimingBar = document.querySelector(".arc-timing-bar");
const arcTimingDelayHandle = document.querySelector("#arcTimingDelayHandle");
const arcTimingEndHandle = document.querySelector("#arcTimingEndHandle");
const motionPathDelayInput = document.querySelector("#motionPathDelayInput");
const motionPathDelayFrames = document.querySelector("#motionPathDelayFrames");
const durationInput = document.querySelector("#durationInput");
const durationValue = document.querySelector("#durationValue");
const deleteKeyframeButton = document.querySelector("#deleteKeyframeButton");
const keyframeTimingControl = document.querySelector("#keyframeTimingControl");
const keyframeTimingBar = document.querySelector(".keyframe-timing-bar");
const keyframeHoldInput = document.querySelector("#keyframeHoldInput");
const keyframeHoldValue = document.querySelector("#keyframeHoldValue");
const arcDurationInput = document.querySelector("#arcDurationInput");
const arcDurationValue = document.querySelector("#arcDurationValue");
const frameRateSelect = document.querySelector("#frameRateSelect");
const stateReadout = document.querySelector("#stateReadout");
const BEZIER_GRAPH_ORIGIN_X = 12;
const BEZIER_GRAPH_ORIGIN_Y = 12;
const BEZIER_GRAPH_WIDTH = 206;
const BEZIER_GRAPH_HEIGHT = 82;
const timelineTrack = document.querySelector("#timelineTrack");
const playButton = document.querySelector("#playButton");
const reverseButton = document.querySelector("#reverseButton");
const loopButton = document.querySelector("#loopButton");
const motionGuideLine = document.querySelector("#motionGuideLine");
const panButton = document.querySelector("#panButton");
const panDoneButton = document.querySelector("#panDoneButton");
const cameraFrameBadge = document.querySelector("#cameraFrameBadge");
const poseSourceBadge = document.querySelector("#poseSourceBadge");
const drawOverHint = document.querySelector("#drawOverHint");
const toolPalette = document.querySelector("#canvasToolPalette");
const toolPaletteToggle = document.querySelector("#toolPaletteToggle");
const zoomInput = document.querySelector("#zoomInput");
const resetPoseButton = document.querySelector("#resetPoseButton");
const clearMotionButton = document.querySelector("#clearMotionButton");
const heightInput = document.querySelector("#heightInput");
const buildInput = document.querySelector("#buildInput");
const legInput = document.querySelector("#legInput");
const armInput = document.querySelector("#armInput");
let motionCursorPoint = null;
let pendingMotionStroke = null;
let timelinePinch = null;
let stageGestureStart = null;
let historyPast = [];
let historyFuture = [];
let isRestoringHistory = false;
let drawOverHintTimer = null;

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

function curveEnergy(settings = normalizeMotionSettings()) {
  const curve = settings.easingBezier ?? state.easingBezier;
  return clamp((Math.abs(curve.y1 - curve.x1) + Math.abs(curve.y2 - curve.x2)) * 0.6, 0, 1);
}

function normalizePolygonEdits(edits) {
  const normalized = {};
  if (!edits || typeof edits !== "object") return normalized;
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
  return legacyDefaultLegSets.some((legs) => (
    Object.entries(legs).every(([node, point]) => nearlySamePoint(base[node], point))
  ));
}

function normalizeTorsoNodes(pose) {
  if (!pose || typeof pose !== "object") return pose;
  const shoulderMid = pose.leftShoulder && pose.rightShoulder ? midpoint(pose.leftShoulder, pose.rightShoulder) : null;
  const hipMid = pose.leftHip && pose.rightHip ? midpoint(pose.leftHip, pose.rightHip) : null;
  const torso = pose.torso ?? pose.stomach ?? { x: 450, y: 326 };
  pose.chest ??= shoulderMid
    ? { x: (shoulderMid.x + torso.x) / 2, y: shoulderMid.y + (torso.y - shoulderMid.y) * 0.28 }
    : { x: torso.x, y: torso.y - 70 };
  pose.stomach ??= { ...torso };
  pose.hips ??= hipMid ? { ...hipMid } : { x: torso.x, y: torso.y + 72 };
  pose.torso = { ...pose.stomach };
  return pose;
}

function isPoseLike(value) {
  return value && typeof value === "object"
    && typeof value.head === "object"
    && typeof value.leftHand === "object"
    && typeof value.rightFoot === "object";
}

function normalizeMotionSettings(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const sourceBezier = source.easingBezier && typeof source.easingBezier === "object"
    ? source.easingBezier
    : state.easingBezier;
  return {
    easingBezier: {
      x1: Number.isFinite(sourceBezier.x1) ? clamp(sourceBezier.x1, 0, 1) : state.easingBezier.x1,
      y1: Number.isFinite(sourceBezier.y1) ? clamp(sourceBezier.y1, 0, 1) : state.easingBezier.y1,
      x2: Number.isFinite(sourceBezier.x2) ? clamp(sourceBezier.x2, 0, 1) : state.easingBezier.x2,
      y2: Number.isFinite(sourceBezier.y2) ? clamp(sourceBezier.y2, 0, 1) : state.easingBezier.y2,
    },
    anticipationTime: Number.isFinite(source.anticipationTime)
      ? clamp(source.anticipationTime, 0, 0.35)
      : clamp(state.anticipationTime, 0, 0.35),
    overshootTime: Number.isFinite(source.overshootTime)
      ? clamp(source.overshootTime, 0, 0.35)
      : clamp(state.overshootTime, 0, 0.35),
  };
}

function normalizeAnchorDefinition(raw) {
  const durationMs = Number.isFinite(raw?.durationMs)
    ? clamp(raw.durationMs, 0, keyframeDurationMaxMs)
    : state.duration;
  const durationFrames = anchorDurationsFrames(durationMs);
  const maxHoldFrames = Math.max(0, durationFrames);
  const rawHoldFrames = Number.isFinite(raw?.holdMs)
    ? Math.round((Math.max(0, raw.holdMs) / 1000) * state.frameRate)
    : 0;
  const holdMs = msForFrames(clamp(rawHoldFrames, 0, maxHoldFrames));
  const rawPose = raw && typeof raw === "object" && raw.pose
    ? raw.pose
    : isPoseLike(raw)
      ? raw
      : state.pose;
  return {
    pose: rawPose ? normalizeTorsoNodes(structuredClone(rawPose)) : normalizeTorsoNodes(structuredClone(state.base)),
    durationMs,
    holdMs,
    motion: normalizeMotionSettings(raw?.motion ?? raw?.motionSettings ?? raw),
  };
}

function normalizeKeyframeStore(savedKeyframes) {
  const entries = Object.entries(savedKeyframes ?? {})
    .filter(([rawIndex, rawValue]) => Number.isFinite(Number(rawIndex)) && rawValue && typeof rawValue === "object")
    .sort(([a], [b]) => Number(a) - Number(b))
    .map((entry, index) => ({
      index,
      value: normalizeAnchorDefinition(entry[1]),
      rawValue: entry[1],
    }));
  if (!entries.length) {
    return {
      0: normalizeAnchorDefinition({ pose: state.base, durationMs: state.duration, motion: normalizeMotionSettings() }),
      1: normalizeAnchorDefinition({ pose: state.base, durationMs: state.duration, motion: normalizeMotionSettings() }),
    };
  }
  if (entries.length === 1) {
    return {
      0: normalizeAnchorDefinition({ pose: entries[0].value.pose, durationMs: state.duration, motion: entries[0].value.motion }),
      1: normalizeAnchorDefinition({ pose: entries[0].value.pose, durationMs: state.duration, motion: entries[0].value.motion }),
    };
  }

  const segmentCount = entries.length - 1;
  const evenlySplitMs = segmentCount > 0 ? Math.max(400, Math.round(state.duration / segmentCount)) : state.duration;
  const normalized = {};
  entries.forEach((entry, position) => {
    const nextDefaultMs = position < segmentCount ? evenlySplitMs : state.duration;
    const explicitDuration = Number.isFinite(entry.rawValue?.durationMs) ? entry.value.durationMs : nextDefaultMs;
    normalized[position] = {
      pose: entry.value.pose ?? normalizeTorsoNodes(structuredClone(state.base)),
      durationMs: explicitDuration,
      holdMs: entry.value.holdMs,
      motion: entry.value.motion,
    };
  });
  return normalized;
}

function orderedAnchors() {
  return Object.entries(state.keyframes)
    .map(([index, value]) => {
      const anchorIndex = Number(index);
      const parsed = normalizeAnchorDefinition(value);
      if (!Number.isFinite(anchorIndex)) return null;
      return {
        anchorIndex,
        pose: parsed.pose,
        durationMs: parsed.durationMs,
        holdMs: parsed.holdMs,
        motion: parsed.motion,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.anchorIndex - b.anchorIndex);
}

function anchorDurationsFrames(durationMs) {
  return Math.max(0, Math.round((Math.max(0, durationMs) / 1000) * state.frameRate));
}

function msForFrames(frames) {
  return Math.round((Math.max(0, frames) / Math.max(1, state.frameRate)) * 1000);
}

function maxKeyframeDurationFrames() {
  return Math.max(1, anchorDurationsFrames(keyframeDurationMaxMs));
}

function formatFrameSeconds(frames) {
  return `${(frames / Math.max(1, state.frameRate)).toFixed(2)}s (${frames}f)`;
}

function anchorHoldFrames(anchor) {
  if (!anchor) return 0;
  const maxHoldFrames = Math.max(0, anchorDurationsFrames(anchor.durationMs));
  const frames = Math.round((Math.max(0, anchor.holdMs ?? 0) / 1000) * state.frameRate);
  return clamp(frames, 0, maxHoldFrames);
}

function buildAnchorTimeline() {
  const anchors = orderedAnchors();
  if (!anchors.length) {
    const basePose = normalizeTorsoNodes(structuredClone(state.pose ?? state.base));
    const baseFrameSpan = anchorDurationsFrames(state.duration);
    const anchorIndexByFrame = new Map([
      [0, 0],
      [baseFrameSpan, 1],
    ]);
    return {
      anchors: [
        { anchorIndex: 0, frameIndex: 0, pose: basePose, durationMs: state.duration, holdMs: 0, motion: normalizeMotionSettings() },
        { anchorIndex: 1, frameIndex: baseFrameSpan, pose: basePose, durationMs: state.duration, holdMs: 0, motion: normalizeMotionSettings() },
      ],
      anchorIndexByFrame,
      totalFrames: baseFrameSpan + 1,
    };
  }
  if (anchors.length === 1) {
    const singlePose = anchors[0].pose;
    const fallback = normalizeTorsoNodes(structuredClone(state.pose ?? state.base));
    anchors.push({ anchorIndex: 1, pose: singlePose ?? fallback, durationMs: anchors[0].durationMs, holdMs: 0, motion: anchors[0].motion });
  }

  const anchorIndexByFrame = new Map();
  let frameCursor = 0;
  anchors[0].frameIndex = frameCursor;
  anchorIndexByFrame.set(frameCursor, anchors[0].anchorIndex);
  for (let i = 0; i < anchors.length - 1; i += 1) {
    frameCursor += anchorDurationsFrames(anchors[i].durationMs);
    anchors[i + 1].frameIndex = frameCursor;
    anchorIndexByFrame.set(frameCursor, anchors[i + 1].anchorIndex);
  }
  const lastAnchor = anchors[anchors.length - 1];
  const trailingFrameSpan = anchorDurationsFrames(lastAnchor.durationMs);
  const defaultFrameCount = frameCursor + trailingFrameSpan + 1;
  return {
    anchors,
    anchorIndexByFrame,
    totalFrames: Math.max(1, defaultFrameCount),
  };
}

function anchorSegmentForFrame(frameIndex, timeline = buildAnchorTimeline()) {
  const safeFrame = clamp(Math.floor(frameIndex), 0, timeline.totalFrames - 1);
  const anchors = timeline.anchors;
  if (!anchors.length) {
    return {
      segmentIndex: 0,
      anchorIndex: 0,
      startFrame: 0,
      endFrame: Math.max(0, timeline.totalFrames - 1),
    };
  }
  let segmentIndex = 0;
  for (let i = 0; i < anchors.length - 1; i += 1) {
    if (safeFrame >= anchors[i + 1].frameIndex) {
      segmentIndex = i + 1;
    } else {
      break;
    }
  }
  const segmentStartFrame = anchors[segmentIndex].frameIndex;
  const segmentEndFrame = (segmentIndex + 1 < anchors.length
    ? anchors[segmentIndex + 1].frameIndex
    : timeline.totalFrames - 1);
  return {
    segmentIndex,
    anchorIndex: anchors[segmentIndex].anchorIndex,
    startFrame: segmentStartFrame,
    endFrame: segmentEndFrame,
  };
}

function clipMotionTimingWindow(clip, timeline = buildAnchorTimeline()) {
  const anchors = timeline.anchors;
  const timing = clip?.timing ?? {};
  if (!anchors.length) {
    return {
      startFrame: 0,
      endFrame: Math.max(0, timeline.totalFrames - 1),
      anchorIndex: timing.anchorIndex ?? 0,
    };
  }

  let segmentIndex = -1;
  if (Number.isFinite(timing.anchorIndex)) {
    segmentIndex = anchors.findIndex((anchor) => anchor.anchorIndex === timing.anchorIndex);
  }

  let segment;
  if (segmentIndex >= 0) {
    segment = {
      segmentIndex,
      anchorIndex: anchors[segmentIndex].anchorIndex,
      startFrame: anchors[segmentIndex].frameIndex,
      endFrame: (segmentIndex + 1 < anchors.length
        ? anchors[segmentIndex + 1].frameIndex
        : timeline.totalFrames - 1),
    };
  } else {
    const anchorHint = Number.isFinite(timing.startFrame) ? timing.startFrame
      : Number.isFinite(timing.createdFrame) ? timing.createdFrame
      : state.currentFrame;
    segment = anchorSegmentForFrame(anchorHint, timeline);
  }

  const startFrameFromOffset = Number.isFinite(timing.startOffset)
    ? segment.startFrame + Math.round(timing.startOffset)
    : null;
  const hasAnchorTiming = Number.isFinite(timing.anchorIndex);
  const hasSegmentStartOffset = Number.isFinite(timing.startOffset);
  const segmentBasedStart = hasSegmentStartOffset ? startFrameFromOffset : null;
  const startFrame = clamp(
    Number.isFinite(timing.startFrame) && !hasAnchorTiming && !hasSegmentStartOffset
      ? clamp(Math.round(timing.startFrame), segment.startFrame, segment.endFrame)
      : (startFrameFromOffset === null
        ? segment.startFrame
        : clamp(segmentBasedStart, segment.startFrame, segment.endFrame)),
    0,
    timeline.totalFrames - 1,
  );
  const fallbackEndFrame = segment.endFrame;
  const endFrameFromOffset = Number.isFinite(timing.endOffset)
    ? segment.startFrame + Math.round(timing.endOffset)
    : null;
  const explicitEndFrame = endFrameFromOffset !== null
    ? clamp(endFrameFromOffset, segment.startFrame, segment.endFrame)
    : Number.isFinite(timing.endFrame)
    ? clamp(Math.round(timing.endFrame), segment.startFrame, segment.endFrame)
    : fallbackEndFrame;
  const endFrame = clamp(Math.max(startFrame, explicitEndFrame), segment.startFrame, segment.endFrame);

  return {
    anchorIndex: segment.anchorIndex,
    segmentIndex: segment.segmentIndex,
    startFrame,
    endFrame,
  };
}

function pathStartDelayFrames(clip, timeline = buildAnchorTimeline()) {
  if (!clip) return null;
  const timing = clipMotionTimingWindow(clip, timeline);
  const segment = anchorSegmentForTimingWindow(timing, timeline);
  return Math.max(0, timing.startFrame - segment.startFrame);
}

function pathDurationFrames(clip, timeline = buildAnchorTimeline()) {
  if (!clip) return null;
  const timing = clipMotionTimingWindow(clip, timeline);
  return Math.max(0, timing.endFrame - timing.startFrame);
}

function anchorSegmentForTimingWindow(timing, timeline = buildAnchorTimeline()) {
  const anchors = timeline.anchors;
  if (Number.isFinite(timing?.segmentIndex) && anchors[timing.segmentIndex]) {
    return {
      segmentIndex: timing.segmentIndex,
      anchorIndex: anchors[timing.segmentIndex].anchorIndex,
      startFrame: anchors[timing.segmentIndex].frameIndex,
      endFrame: (timing.segmentIndex + 1 < anchors.length
        ? anchors[timing.segmentIndex + 1].frameIndex
        : timeline.totalFrames - 1),
    };
  }
  return anchorSegmentForFrame(timing?.startFrame ?? 0, timeline);
}

function normalizeClipTimingToSegment(clip, timeline = buildAnchorTimeline()) {
  if (!clip?.timing) return false;
  const timing = clip.timing;
  const baseline = clipMotionTimingWindow(clip, timeline);
  const segment = anchorSegmentForTimingWindow(baseline, timeline);
  const segmentSpanFrames = Math.max(0, segment.endFrame - segment.startFrame);
  const rawStartOffset = Number.isFinite(timing.startOffset)
    ? Math.round(timing.startOffset)
    : Math.round(baseline.startFrame - segment.startFrame);
  const rawEndOffset = Number.isFinite(timing.endOffset)
    ? Math.round(timing.endOffset)
    : Math.round(baseline.endFrame - segment.startFrame);
  const maxStartOffset = Math.max(0, segmentSpanFrames - 1);
  const startOffset = segmentSpanFrames > 0 ? clamp(rawStartOffset, 0, maxStartOffset) : 0;
  const endOffset = segmentSpanFrames > 0
    ? clamp(Math.max(rawEndOffset, startOffset + 1), startOffset + 1, segmentSpanFrames)
    : 0;
  const changed = timing.anchorIndex !== segment.anchorIndex
    || timing.startOffset !== startOffset
    || timing.endOffset !== endOffset
    || Number.isFinite(timing.startFrame)
    || Number.isFinite(timing.endFrame);
  timing.anchorIndex = segment.anchorIndex;
  timing.startOffset = startOffset;
  timing.endOffset = endOffset;
  delete timing.startFrame;
  delete timing.endFrame;
  return changed;
}

function normalizeAllMotionPathTimings() {
  const timeline = buildAnchorTimeline();
  let changed = false;
  allMotionPaths().forEach((clip) => {
    changed = normalizeClipTimingToSegment(clip, timeline) || changed;
  });
  return changed;
}

function clipIsInCurrentCelRange(clip, timeline = buildAnchorTimeline()) {
  if (!clip?.timing) return false;
  const currentSegment = anchorSegmentForFrame(state.currentFrame, timeline);
  const timing = clipMotionTimingWindow(clip, timeline);
  return timing.segmentIndex === currentSegment.segmentIndex;
}

function segmentHoldEndFrame(segment, timeline = buildAnchorTimeline()) {
  if (!segment) return 0;
  const holdFrames = anchorHoldFrames(timeline.anchors[segment.segmentIndex]);
  return Math.min(segment.startFrame + holdFrames, segment.endFrame);
}

function frameIsInsideSegmentHold(frameIndex, segment, timeline = buildAnchorTimeline()) {
  if (!segment || frameIndex <= segment.startFrame) return false;
  return frameIndex <= segmentHoldEndFrame(segment, timeline);
}

function setSelectedPathDelaySeconds(nextSeconds) {
  const safeSeconds = Number.isFinite(nextSeconds) ? Math.max(0, nextSeconds) : 0;
  setSelectedPathDelayFrames(Math.round(safeSeconds * state.frameRate));
}

function setSelectedPathDelayFrames(nextFrames) {
  const clip = editingMotionPath();
  if (!clip?.timing) return;
  const timeline = buildAnchorTimeline();
  normalizeClipTimingToSegment(clip, timeline);
  const baseline = clipMotionTimingWindow(clip, timeline);
  const segment = anchorSegmentForTimingWindow(baseline, timeline);
  const segmentSpanFrames = Math.max(0, segment.endFrame - segment.startFrame);
  const maxDelayFrames = Math.max(0, segmentSpanFrames - 1);
  const frames = clamp(Math.round(nextFrames), 0, maxDelayFrames);
  const currentDurationFrames = pathDurationFrames(clip, timeline);
  clip.timing.startOffset = frames;
  if (Number.isFinite(currentDurationFrames)) {
    clip.timing.endOffset = clamp(frames + currentDurationFrames, frames, segmentSpanFrames);
  }
  delete clip.timing.startFrame;
  delete clip.timing.endFrame;
  // Keep existing anchor assignment and let frame mapping resolve the resulting start frame.
  saveState();
  render();
}

function setSelectedPathDurationFrames(nextFrames) {
  const clip = editingMotionPath();
  if (!clip?.timing) return;
  const timeline = buildAnchorTimeline();
  normalizeClipTimingToSegment(clip, timeline);
  const baseline = clipMotionTimingWindow(clip, timeline);
  const segment = anchorSegmentForTimingWindow(baseline, timeline);
  const startOffset = Math.max(0, baseline.startFrame - segment.startFrame);
  const maxDurationFrames = Math.max(0, segment.endFrame - baseline.startFrame);
  const durationFrames = clamp(Math.round(nextFrames), Math.min(1, maxDurationFrames), maxDurationFrames);
  clip.timing.startOffset = startOffset;
  clip.timing.endOffset = startOffset + durationFrames;
  delete clip.timing.startFrame;
  delete clip.timing.endFrame;
  saveState();
  render();
}

function nudgeSelectedPathDelayFrames(deltaFrames) {
  const clip = editingMotionPath();
  if (!clip?.timing) return;
  const timeline = buildAnchorTimeline();
  const currentDelayFrames = pathStartDelayFrames(clip, timeline) ?? 0;
  const baseline = clipMotionTimingWindow(clip, timeline);
  const segment = anchorSegmentForTimingWindow(baseline, timeline);
  const maxDelayFrames = Math.max(0, segment.endFrame - segment.startFrame - 1);
  const nextDelayFrames = clamp(currentDelayFrames + deltaFrames, 0, maxDelayFrames);
  setSelectedPathDelayFrames(nextDelayFrames);
  syncMotionPathDelayInput();
}

function syncMotionPathDelayInput() {
  if (!motionPathDelayInput) return;
  const selectedClip = editingMotionPath();
  const timeline = buildAnchorTimeline();
  const repairedTiming = selectedClip ? normalizeClipTimingToSegment(selectedClip, timeline) : false;
  const timing = selectedClip ? clipMotionTimingWindow(selectedClip, timeline) : null;
  const segment = timing ? anchorSegmentForTimingWindow(timing, timeline) : null;
  const segmentSpanFrames = segment ? Math.max(0, segment.endFrame - segment.startFrame) : 1;
  const delayFrames = pathStartDelayFrames(selectedClip, timeline);
  const maxDelayFrames = Math.max(0, segmentSpanFrames - 1);
  motionPathDelayInput.min = "0";
  motionPathDelayInput.max = String(maxDelayFrames);
  motionPathDelayInput.step = "1";
  motionPathDelayInput.value = String(clamp(Number.isFinite(delayFrames) ? delayFrames : 0, 0, maxDelayFrames));
  if (motionPathDelayFrames) {
    motionPathDelayFrames.textContent = `${Number.isFinite(delayFrames) ? delayFrames : 0}f`;
  }
  if (repairedTiming) saveState();
}

function syncMotionPathDelayFrameReadoutFromInput() {
  if (!motionPathDelayFrames) return;
  const rawFrames = Number(motionPathDelayInput?.value);
  const frames = Number.isFinite(rawFrames)
    ? Math.max(0, Math.round(rawFrames))
    : 0;
  motionPathDelayFrames.textContent = `${frames}f`;
}

function syncArcDurationInput() {
  if (!arcDurationInput && !arcDurationValue && !arcTimingControl) return;
  const selectedClip = editingMotionPath();
  const timeline = buildAnchorTimeline();
  const repairedTiming = selectedClip ? normalizeClipTimingToSegment(selectedClip, timeline) : false;
  const timing = selectedClip ? clipMotionTimingWindow(selectedClip, timeline) : null;
  const segment = timing ? anchorSegmentForTimingWindow(timing, timeline) : null;
  const segmentSpanFrames = segment ? Math.max(1, segment.endFrame - segment.startFrame) : 1;
  const delayFrames = selectedClip ? pathStartDelayFrames(selectedClip, timeline) ?? 0 : 0;
  const frames = timing ? Math.max(0, timing.endFrame - timing.startFrame) : 0;
  const maxFrames = timing ? Math.max(1, segment.endFrame - timing.startFrame) : 1;
  const endFrameOffset = delayFrames + frames;
  if (arcDurationInput) {
    arcDurationInput.min = "1";
    arcDurationInput.max = String(maxFrames);
    arcDurationInput.step = "1";
    arcDurationInput.value = String(clamp(frames, 1, maxFrames));
  }
  if (arcTimingControl) {
    arcTimingControl.style.setProperty("--arc-delay", `${(delayFrames / segmentSpanFrames) * 100}%`);
    arcTimingControl.style.setProperty("--arc-end", `${(endFrameOffset / segmentSpanFrames) * 100}%`);
  }
  if (arcTimingDelayHandle) {
    arcTimingDelayHandle.setAttribute("aria-valuemax", String(Math.max(0, segmentSpanFrames - 1)));
    arcTimingDelayHandle.setAttribute("aria-valuenow", String(delayFrames));
  }
  if (arcTimingEndHandle) {
    arcTimingEndHandle.setAttribute("aria-valuemin", String(Math.min(segmentSpanFrames, delayFrames + 1)));
    arcTimingEndHandle.setAttribute("aria-valuemax", String(segmentSpanFrames));
    arcTimingEndHandle.setAttribute("aria-valuenow", String(endFrameOffset));
  }
  if (arcDurationValue) {
    arcDurationValue.textContent = `${(frames / Math.max(1, state.frameRate)).toFixed(2)}s (${frames}f)`;
  }
  if (repairedTiming) saveState();
}

function syncKeyframeHoldInput() {
  if (!keyframeHoldInput && !keyframeHoldValue && !durationInput && !durationValue) return;
  const anchors = orderedAnchors();
  const anchor = anchors.find(({ anchorIndex }) => anchorIndex === state.selectedAnchorIndex);
  const durationFrames = anchor ? anchorDurationsFrames(anchor.durationMs) : anchorDurationsFrames(state.duration);
  const holdFrames = anchorHoldFrames(anchor);
  const maxFrames = maxKeyframeDurationFrames();
  if (durationInput) {
    durationInput.min = "0";
    durationInput.max = String(maxFrames);
    durationInput.step = "1";
    if (document.activeElement !== durationInput) {
      durationInput.value = String(clamp(durationFrames, 0, maxFrames));
    }
  }
  if (keyframeHoldInput) {
    keyframeHoldInput.min = "0";
    keyframeHoldInput.max = String(maxFrames);
    keyframeHoldInput.step = "1";
    if (document.activeElement !== keyframeHoldInput) {
      keyframeHoldInput.value = String(clamp(holdFrames, 0, maxFrames));
    }
  }
  if (keyframeTimingControl) {
    keyframeTimingControl.style.setProperty("--keyframe-hold", `${(clamp(holdFrames, 0, maxFrames) / maxFrames) * 100}%`);
    keyframeTimingControl.style.setProperty("--keyframe-duration", `${(clamp(durationFrames, 0, maxFrames) / maxFrames) * 100}%`);
  }
  if (keyframeHoldValue) {
    keyframeHoldValue.textContent = formatFrameSeconds(holdFrames);
  }
  if (durationValue) {
    durationValue.textContent = formatFrameSeconds(durationFrames);
  }
}

function arcTimingMetrics() {
  const selectedClip = editingMotionPath();
  const timeline = buildAnchorTimeline();
  const timing = selectedClip ? clipMotionTimingWindow(selectedClip, timeline) : null;
  const segment = timing ? anchorSegmentForTimingWindow(timing, timeline) : null;
  const segmentSpanFrames = segment ? Math.max(1, segment.endFrame - segment.startFrame) : 1;
  const delayFrames = selectedClip ? pathStartDelayFrames(selectedClip, timeline) ?? 0 : 0;
  const durationFrames = timing ? Math.max(1, timing.endFrame - timing.startFrame) : 1;
  return {
    delayFrames,
    durationFrames,
    endOffset: delayFrames + durationFrames,
    segmentSpanFrames,
  };
}

function frameFromArcTimingPointer(event) {
  if (!arcTimingBar) return 0;
  const rect = arcTimingBar.getBoundingClientRect();
  const progress = rect.width ? clamp((event.clientX - rect.left) / rect.width, 0, 1) : 0;
  return Math.round(progress * arcTimingMetrics().segmentSpanFrames);
}

function applyArcTimingHandle(handle, frameOffset) {
  const { delayFrames, endOffset, segmentSpanFrames } = arcTimingMetrics();
  if (handle === "delay") {
    setSelectedPathDelayFrames(clamp(frameOffset, 0, Math.max(0, endOffset - 1)));
    syncMotionPathDelayInput();
    syncArcDurationInput();
    return;
  }
  setSelectedPathDurationFrames(clamp(frameOffset, delayFrames + 1, segmentSpanFrames) - delayFrames);
  syncArcDurationInput();
}

function startArcTimingDrag(event, explicitHandle = null) {
  if (!editingMotionPath()) return;
  event.preventDefault();
  event.stopPropagation();
  if (!arcTimingControl?.dataset.historyStarted) {
    recordHistory();
    arcTimingControl.dataset.historyStarted = "true";
  }
  const frameOffset = frameFromArcTimingPointer(event);
  const { delayFrames, endOffset } = arcTimingMetrics();
  const handle = explicitHandle
    ?? (Math.abs(frameOffset - delayFrames) <= Math.abs(frameOffset - endOffset) ? "delay" : "end");
  applyArcTimingHandle(handle, frameOffset);
  const move = (moveEvent) => applyArcTimingHandle(handle, frameFromArcTimingPointer(moveEvent));
  const finish = () => {
    delete arcTimingControl.dataset.historyStarted;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", finish, { once: true });
}

function nudgeArcTimingHandle(handle, deltaFrames) {
  if (!editingMotionPath()) return;
  recordHistory();
  const { delayFrames, endOffset } = arcTimingMetrics();
  applyArcTimingHandle(handle, (handle === "delay" ? delayFrames : endOffset) + deltaFrames);
}

function clipEffectiveStartFrame(timing, timeline = buildAnchorTimeline()) {
  const segment = anchorSegmentForTimingWindow(timing, timeline);
  const holdEndFrame = segmentHoldEndFrame(segment, timeline);
  return Math.min(Math.max(timing.startFrame, holdEndFrame), Math.max(timing.startFrame, timing.endFrame - 1));
}

function clipProgressForFrame(clip, frameIndex, timeline = buildAnchorTimeline(), options = {}) {
  const timing = clipMotionTimingWindow(clip, timeline);
  const segment = anchorSegmentForTimingWindow(timing, timeline);
  const effectiveStartFrame = clipEffectiveStartFrame(timing, timeline);
  const localSpan = Math.max(1, timing.endFrame - effectiveStartFrame);
  if (!timing || frameIndex < effectiveStartFrame) {
    return null;
  }
  if (frameIndex > timing.endFrame) {
    if (!options.holdFinal) return null;
    return frameIndex <= segment.endFrame ? 1 : null;
  }
  return clamp((frameIndex - effectiveStartFrame) / localSpan, 0, 1);
}

function clipTimingForFrame(frameIndex, timeline = buildAnchorTimeline()) {
  const segment = anchorSegmentForFrame(frameIndex, timeline);
  const clipStartOffset = Math.round(frameIndex - segment.startFrame);
  return {
    anchorIndex: segment.anchorIndex,
    startFrame: segment.startFrame,
    endFrame: segment.endFrame,
    startOffset: clipStartOffset,
  };
}

function syncSelectedAnchor() {
  const anchors = orderedAnchors();
  if (!anchors.length) {
    state.selectedAnchorIndex = 0;
    return;
  }
  if (!Number.isFinite(state.selectedAnchorIndex) || !anchors.some(({ anchorIndex }) => anchorIndex === state.selectedAnchorIndex)) {
    state.selectedAnchorIndex = anchors[0].anchorIndex;
  }
}

function selectedAnchorDuration() {
  const anchors = orderedAnchors();
  const anchor = anchors.find(({ anchorIndex }) => anchorIndex === state.selectedAnchorIndex);
  if (!anchor) return state.duration;
  return anchor.durationMs;
}

function selectedAnchorHoldFrames() {
  const anchors = orderedAnchors();
  const anchor = anchors.find(({ anchorIndex }) => anchorIndex === state.selectedAnchorIndex);
  return anchorHoldFrames(anchor);
}

function isCurrentFrameAnchor(timeline = buildAnchorTimeline()) {
  return timeline.anchorIndexByFrame.has(state.currentFrame);
}

function currentAnchorSource(timeline = buildAnchorTimeline()) {
  const anchorIndex = timeline.anchorIndexByFrame.get(state.currentFrame);
  return anchorIndex === undefined ? "computed" : "directed";
}

function setSelectedAnchorDurationFrames(nextFrames) {
  const anchors = orderedAnchors();
  if (!anchors.length) return;
  const target = anchors.findIndex(({ anchorIndex }) => anchorIndex === state.selectedAnchorIndex);
  if (target < 0) return;
  const durationFrames = clamp(Math.round(nextFrames), 0, maxKeyframeDurationFrames());
  anchors[target].durationMs = msForFrames(durationFrames);
  anchors[target].holdMs = msForFrames(anchorHoldFrames(anchors[target]));
  state.keyframes = Object.fromEntries(
    anchors.map((anchor) => [anchor.anchorIndex, {
      pose: anchor.pose,
      durationMs: anchor.durationMs,
      holdMs: anchor.holdMs,
      motion: anchor.motion,
    }]),
  );
  state.duration = anchors[target].durationMs;
  syncFrameCount();
}

function setSelectedAnchorHoldFrames(nextFrames) {
  const anchors = orderedAnchors();
  if (!anchors.length) return;
  const target = anchors.findIndex(({ anchorIndex }) => anchorIndex === state.selectedAnchorIndex);
  if (target < 0) return;
  const holdFrames = clamp(Math.round(nextFrames), 0, maxKeyframeDurationFrames());
  const durationFrames = anchorDurationsFrames(anchors[target].durationMs);
  if (holdFrames > durationFrames) {
    anchors[target].durationMs = msForFrames(holdFrames);
  }
  anchors[target].holdMs = msForFrames(holdFrames);
  state.keyframes = Object.fromEntries(
    anchors.map((anchor) => [anchor.anchorIndex, {
      pose: anchor.pose,
      durationMs: anchor.durationMs,
      holdMs: anchor.holdMs,
      motion: anchor.motion,
    }]),
  );
  syncFrameCount();
}

function setAnchorPose(anchorIndex, pose) {
  const anchors = orderedAnchors();
  if (!anchors.length) return;
  const normalizedPose = normalizeTorsoNodes(structuredClone(pose));
  state.keyframes = Object.fromEntries(
    anchors.map((anchor) => [anchor.anchorIndex, {
      pose: anchor.anchorIndex === anchorIndex ? normalizedPose : anchor.pose,
      durationMs: anchor.durationMs,
      holdMs: anchor.holdMs,
      motion: anchor.motion,
    }]),
  );
}

function setCurrentAnchorPose(pose) {
  const timeline = buildAnchorTimeline();
  const segment = anchorSegmentForFrame(state.currentFrame, timeline);
  setAnchorPose(segment.anchorIndex, pose);
}

function motionSettingsForAnchor(anchor) {
  return normalizeMotionSettings(anchor?.motion);
}

function motionSettingsForSegment(segment, timeline = buildAnchorTimeline()) {
  const anchor = timeline.anchors.find((entry) => entry.anchorIndex === segment?.anchorIndex);
  return motionSettingsForAnchor(anchor);
}

function motionSettingsForClip(clip, timeline = buildAnchorTimeline()) {
  if (!clip) return motionSettingsForSegment(anchorSegmentForFrame(state.currentFrame, timeline), timeline);
  const timing = clipMotionTimingWindow(clip, timeline);
  return motionSettingsForSegment(anchorSegmentForTimingWindow(timing, timeline), timeline);
}

function currentMotionSettings(timeline = buildAnchorTimeline()) {
  return motionSettingsForSegment(anchorSegmentForFrame(state.currentFrame, timeline), timeline);
}

function syncGlobalMotionSettings(settings) {
  const normalized = normalizeMotionSettings(settings);
  state.easingBezier = structuredClone(normalized.easingBezier);
  state.anticipationTime = normalized.anticipationTime;
  state.overshootTime = normalized.overshootTime;
  state.easingIntensity = curveEnergy(normalized);
}

function setCurrentMotionSettings(settings) {
  const timeline = buildAnchorTimeline();
  const segment = anchorSegmentForFrame(state.currentFrame, timeline);
  const nextMotion = normalizeMotionSettings(settings);
  const anchors = orderedAnchors();
  state.keyframes = Object.fromEntries(
    anchors.map((anchor) => [anchor.anchorIndex, {
      pose: anchor.pose,
      durationMs: anchor.durationMs,
      holdMs: anchor.holdMs,
      motion: anchor.anchorIndex === segment.anchorIndex ? nextMotion : anchor.motion,
    }]),
  );
  syncGlobalMotionSettings(nextMotion);
}

function currentAnchorEntry(timeline = buildAnchorTimeline()) {
  const anchorIndex = timeline.anchorIndexByFrame.get(state.currentFrame);
  if (anchorIndex === undefined) return null;
  const anchorOrder = timeline.anchors.findIndex((anchor) => anchor.anchorIndex === anchorIndex);
  if (anchorOrder < 0) return null;
  return {
    anchor: timeline.anchors[anchorOrder],
    anchorOrder,
  };
}

function layoutGeneratedArcPath(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const span = Math.hypot(dx, dy);
  if (span < 1) return [start, end];
  const lift = clamp(span * 0.18, 10, 42);
  const normal = {
    x: -dy / span,
    y: dx / span,
  };
  const mid = {
    x: (start.x + end.x) / 2 + normal.x * lift,
    y: (start.y + end.y) / 2 + normal.y * lift,
  };
  return [start, mid, end];
}

function sameSegmentMotionPath(clip, segmentIndex, timeline) {
  const timing = clipMotionTimingWindow(clip, timeline);
  return timing.segmentIndex === segmentIndex;
}

function generatedMotionSuppressionKey(part, anchorIndex) {
  return `${part}:${anchorIndex}`;
}

function isLayoutGeneratedMotionSuppressed(part, anchorIndex) {
  return Boolean(state.suppressedGeneratedMotionPaths[generatedMotionSuppressionKey(part, anchorIndex)]);
}

function suppressLayoutGeneratedMotion(part, anchorIndex) {
  state.suppressedGeneratedMotionPaths[generatedMotionSuppressionKey(part, anchorIndex)] = true;
}

function clearLayoutGeneratedMotionSuppression(part, anchorIndex) {
  delete state.suppressedGeneratedMotionPaths[generatedMotionSuppressionKey(part, anchorIndex)];
}

function syncLayoutGeneratedMotionPath(part, nextPose) {
  const timeline = buildAnchorTimeline();
  const current = currentAnchorEntry(timeline);
  if (!current || current.anchorOrder <= 0) return;
  if (!autonomousNodes.includes(part)) return;

  const previousAnchor = timeline.anchors[current.anchorOrder - 1];
  if (isLayoutGeneratedMotionSuppressed(part, previousAnchor.anchorIndex)) return;
  const previousPose = resolveAnchorPose(previousAnchor, timeline);
  const start = previousPose?.[part];
  const end = nextPose?.[part];
  if (!start || !end || distance(start, end) < 1) return;

  const previousSegmentIndex = current.anchorOrder - 1;
  const clips = state.motionPaths[part] ?? [];
  const generatedClip = clips.find((clip) => clip.source === "layout-keyframe" && sameSegmentMotionPath(clip, previousSegmentIndex, timeline));
  const directorClip = clips.find((clip) => clip.source !== "layout-keyframe" && sameSegmentMotionPath(clip, previousSegmentIndex, timeline));
  if (directorClip) return;

  const path = layoutGeneratedArcPath({ ...start }, { ...end });
  const segmentSpanFrames = Math.max(1, current.anchor.frameIndex - previousAnchor.frameIndex);
  if (generatedClip) {
    generatedClip.path = path;
    generatedClip.timing.anchorIndex = previousAnchor.anchorIndex;
    generatedClip.timing.startOffset = 0;
    generatedClip.timing.endOffset = segmentSpanFrames;
    delete generatedClip.timing.startFrame;
    delete generatedClip.timing.endFrame;
    state.activePathIdByPart[part] = generatedClip.id;
    return;
  }

  const clip = createMotionPath(part, path, undefined, {
    anchorIndex: previousAnchor.anchorIndex,
    startOffset: 0,
    endOffset: segmentSpanFrames,
    easing: "cubic-bezier",
    ...motionSettingsForAnchor(previousAnchor),
    source: "layout-keyframe",
  });
  state.motionPaths[part] = [...clips, clip];
  state.activePathIdByPart[part] = clip.id;
}

function ensureGeneratedMotionPathsForDirectedKeyframes() {
  const timeline = buildAnchorTimeline();
  timeline.anchors.forEach((anchor, anchorOrder) => {
    if (anchorOrder <= 0) return;
    const previousAnchor = timeline.anchors[anchorOrder - 1];
    const segmentSpanFrames = Math.max(0, anchor.frameIndex - previousAnchor.frameIndex);
    if (segmentSpanFrames <= 0) return;
    const previousPose = resolveAnchorPose(previousAnchor, timeline);
    const targetPose = normalizeTorsoNodes(structuredClone(anchor.pose ?? state.base));
    autonomousNodes.forEach((part) => {
      const start = previousPose?.[part];
      const end = targetPose?.[part];
      if (!start || !end || distance(start, end) < 1) return;
      if (isLayoutGeneratedMotionSuppressed(part, previousAnchor.anchorIndex)) return;
      const clips = state.motionPaths[part] ?? [];
      const directorClip = clips.find((clip) => clip.source !== "layout-keyframe" && sameSegmentMotionPath(clip, anchorOrder - 1, timeline));
      if (directorClip) return;
      const generatedClip = clips.find((clip) => clip.source === "layout-keyframe" && sameSegmentMotionPath(clip, anchorOrder - 1, timeline));
      const path = layoutGeneratedArcPath({ ...start }, { ...end });
      if (generatedClip) {
        generatedClip.path = path;
        generatedClip.timing.anchorIndex = previousAnchor.anchorIndex;
        generatedClip.timing.startOffset = 0;
        generatedClip.timing.endOffset = segmentSpanFrames;
        delete generatedClip.timing.startFrame;
        delete generatedClip.timing.endFrame;
        state.activePathIdByPart[part] = generatedClip.id;
        return;
      }
      const clip = createMotionPath(part, path, undefined, {
        anchorIndex: previousAnchor.anchorIndex,
        startOffset: 0,
        endOffset: segmentSpanFrames,
        easing: "cubic-bezier",
        ...motionSettingsForAnchor(previousAnchor),
        source: "layout-keyframe",
      });
      state.motionPaths[part] = [...clips, clip];
      state.activePathIdByPart[part] = clip.id;
    });
  });
}

function timelineIndexLetter(step) {
  if (step <= 0) return "";
  let value = step;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(97 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function timelineFrameLabel(frameIndex, timeline) {
  const anchors = timeline.anchors;
  if (!anchors.length) return String(frameIndex + 1);

  const segment = anchorSegmentForFrame(frameIndex, timeline);
  if (frameIsInsideSegmentHold(frameIndex, segment, timeline)) {
    const anchorOrder = anchors.findIndex((anchor) => anchor.anchorIndex === segment.anchorIndex);
    if (anchorOrder >= 0) return String(anchorOrder + 1);
  }

  const anchorIndexAtFrame = timeline.anchorIndexByFrame.get(frameIndex);
  if (anchorIndexAtFrame !== undefined) {
    const anchorOrder = anchors.findIndex((anchor) => anchor.anchorIndex === anchorIndexAtFrame);
    if (anchorOrder >= 0) return String(anchorOrder + 1);
  }

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const startFrame = anchors[i].frameIndex;
    const endFrame = anchors[i + 1].frameIndex;
    if (frameIndex > startFrame && frameIndex < endFrame) {
      const holdEndFrame = segmentHoldEndFrame({
        segmentIndex: i,
        anchorIndex: anchors[i].anchorIndex,
        startFrame,
        endFrame,
      }, timeline);
      const step = frameIndex - holdEndFrame;
      return `${i + 1}${timelineIndexLetter(step)}`;
    }
  }

  const lastAnchor = anchors[anchors.length - 1];
  if (lastAnchor && frameIndex > lastAnchor.frameIndex) {
    const holdEndFrame = segmentHoldEndFrame({
      segmentIndex: anchors.length - 1,
      anchorIndex: lastAnchor.anchorIndex,
      startFrame: lastAnchor.frameIndex,
      endFrame: timeline.totalFrames - 1,
    }, timeline);
    const step = frameIndex - holdEndFrame;
    return `${anchors.length}${timelineIndexLetter(step)}`;
  }

  return `${anchors.length}`;
}

function addAnchorKeyframe() {
  const anchors = orderedAnchors();
  const nextIndex = anchors.length || 0;
  const durationMs = 0;
  const timeline = buildAnchorTimeline();
  const previousAnchor = timeline.anchors[timeline.anchors.length - 1];
  const previousPose = previousAnchor ? incomingPoseForAnchor(previousAnchor, timeline) : state.pose;
  const basePose = normalizeTorsoNodes(structuredClone(previousPose ?? state.base));
  recordHistory();
  // The keyframe that will now precede the new one owns the span between them.
  // If that span is zero (e.g. it was itself just appended), give it a default
  // duration so the new keyframe has in-between frames to backfill once reposed.
  if (anchors.length) {
    const precedingAnchor = anchors[anchors.length - 1];
    if (anchorDurationsFrames(precedingAnchor.durationMs) <= 0) {
      precedingAnchor.durationMs = defaultKeyframeSpanMs;
    }
  }
  anchors.push({
    anchorIndex: nextIndex,
    pose: basePose,
    durationMs,
    holdMs: 0,
    motion: normalizeMotionSettings(),
  });
  state.keyframes = Object.fromEntries(
    anchors.map((anchor, index) => [index, {
      pose: anchor.pose,
      durationMs: anchor.durationMs ?? state.duration,
      holdMs: anchor.holdMs ?? 0,
      motion: anchor.motion,
    }]),
  );
  state.selectedAnchorIndex = nextIndex;
  state.duration = durationMs;
  syncFrameCount();
  const nextTimeline = buildAnchorTimeline();
  const nextAnchor = nextTimeline.anchors.find((anchor) => anchor.anchorIndex === nextIndex);
  state.currentFrame = nextAnchor?.frameIndex ?? state.totalFrames - 1;
  setFrame(state.currentFrame, false);
}

function deleteSelectedAnchorKeyframe() {
  const anchors = orderedAnchors();
  if (anchors.length <= 2) return;
  const targetIndex = anchors.findIndex(({ anchorIndex }) => anchorIndex === state.selectedAnchorIndex);
  if (targetIndex <= 0) return;
  recordHistory();
  const timelineBeforeDelete = buildAnchorTimeline();
  const deletedPathIds = new Set();
  allMotionPaths().forEach((clip) => {
    const timing = clipMotionTimingWindow(clip, timelineBeforeDelete);
    if (timing.segmentIndex === targetIndex || timing.segmentIndex === targetIndex - 1) {
      deletedPathIds.add(clip.id);
    } else if (timing.segmentIndex > targetIndex && clip.timing) {
      clip.timing.anchorIndex = timing.segmentIndex - 1;
    }
  });
  const nextSuppressions = {};
  Object.keys(state.suppressedGeneratedMotionPaths).forEach((key) => {
    const [part, rawAnchorIndex] = key.split(":");
    const anchorOrder = timelineBeforeDelete.anchors.findIndex((anchor) => anchor.anchorIndex === Number(rawAnchorIndex));
    if (anchorOrder < 0 || anchorOrder === targetIndex || anchorOrder === targetIndex - 1) return;
    const nextAnchorIndex = anchorOrder > targetIndex ? anchorOrder - 1 : anchorOrder;
    nextSuppressions[generatedMotionSuppressionKey(part, nextAnchorIndex)] = true;
  });
  state.suppressedGeneratedMotionPaths = nextSuppressions;
  if (deletedPathIds.size) {
    Object.entries(state.motionPaths).forEach(([part, clips]) => {
      const remaining = clips.filter((clip) => !deletedPathIds.has(clip.id));
      if (remaining.length) {
        state.motionPaths[part] = remaining;
        if (deletedPathIds.has(state.activePathIdByPart[part])) {
          state.activePathIdByPart[part] = remaining[remaining.length - 1].id;
        }
      } else {
        delete state.motionPaths[part];
        delete state.activePathIdByPart[part];
      }
    });
    if (deletedPathIds.has(state.selectedPathId)) state.selectedPathId = null;
    if (deletedPathIds.has(state.hoveredPathId)) state.hoveredPathId = null;
    if (deletedPathIds.has(state.drawingPathId)) state.drawingPathId = null;
    if (deletedPathIds.has(state.redrawingPathId)) state.redrawingPathId = null;
  }
  const nextAnchors = anchors.filter((_, index) => index !== targetIndex);
  state.keyframes = Object.fromEntries(
    nextAnchors.map((anchor, index) => [index, {
      pose: anchor.pose,
      durationMs: anchor.durationMs ?? state.duration,
      holdMs: anchor.holdMs ?? 0,
      motion: anchor.motion,
    }]),
  );
  const nextSelectedIndex = Math.max(0, Math.min(targetIndex - 1, nextAnchors.length - 1));
  state.selectedAnchorIndex = nextSelectedIndex;
  syncFrameCount();
  const timeline = buildAnchorTimeline();
  const selectedAnchor = timeline.anchors.find((anchor) => anchor.anchorIndex === state.selectedAnchorIndex);
  setFrame(selectedAnchor?.frameIndex ?? 0, true);
  saveState();
}

function normalizePathPoints(points) {
  if (!Array.isArray(points)) return [];
  return points
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map((point) => ({ x: point.x, y: point.y }));
}

function createMotionPath(part, path, id = `path-${Date.now()}-${Math.random().toString(16).slice(2)}`, timing = {}) {
  const normalizedTiming = {
    easing: "cubic-bezier",
    easingBezier: structuredClone(timing.easingBezier ?? state.easingBezier),
    anticipationTime: Number.isFinite(timing.anticipationTime) ? timing.anticipationTime : state.anticipationTime,
    overshootTime: Number.isFinite(timing.overshootTime) ? timing.overshootTime : state.overshootTime,
  };
  if (Number.isFinite(timing.anchorIndex)) normalizedTiming.anchorIndex = Math.round(timing.anchorIndex);
  if (Number.isFinite(timing.startFrame)) normalizedTiming.startFrame = Math.round(timing.startFrame);
  if (Number.isFinite(timing.endFrame)) normalizedTiming.endFrame = Math.round(timing.endFrame);
  if (Number.isFinite(timing.startOffset)) normalizedTiming.startOffset = Math.round(timing.startOffset);
  if (Number.isFinite(timing.endOffset)) normalizedTiming.endOffset = Math.round(timing.endOffset);
  return {
    id,
    part,
    path: normalizePathPoints(path),
    timing: normalizedTiming,
    source: typeof timing.source === "string" ? timing.source : null,
  };
}

function normalizeMotionPaths(savedMotionPaths) {
  const normalized = {};
  if (!savedMotionPaths || typeof savedMotionPaths !== "object") return normalized;
  Object.entries(savedMotionPaths).forEach(([part, clips]) => {
    const normalizedPart = part === "torso" ? "stomach" : part;
    if (!partLabels[normalizedPart] || !Array.isArray(clips)) return;
    const cleanClips = clips
      .map((clip, index) => createMotionPath(normalizedPart, clip?.path ?? [], clip?.id ?? `${normalizedPart}-${index}`, {
        ...(clip?.timing ?? {}),
        source: clip?.source,
      }))
      .filter((clip) => clip.path.length >= 2);
    if (cleanClips.length) normalized[normalizedPart] = [
      ...(normalized[normalizedPart] ?? []),
      ...cleanClips,
    ];
  });
  return normalized;
}

function normalizeSuppressedGeneratedMotionPaths(savedSuppressions) {
  if (!savedSuppressions || typeof savedSuppressions !== "object") return {};
  return Object.fromEntries(
    Object.entries(savedSuppressions)
      .filter(([key, value]) => value === true && /^[a-zA-Z0-9]+:-?\d+$/.test(key)),
  );
}

function selectedMotionPath() {
  const clips = state.motionPaths[state.selectedPart] ?? [];
  if (!clips.length) return null;
  const timeline = buildAnchorTimeline();
  const segment = anchorSegmentForFrame(state.currentFrame, timeline);
  const segmentClips = clips.filter((clip) => clipIsInSegment(clip, segment.segmentIndex, timeline));
  if (segmentClips.length) {
    const activeId = state.activePathIdByPart[state.selectedPart];
    return segmentClips.find((clip) => clip.id === activeId) ?? segmentClips[segmentClips.length - 1];
  }
  const activeId = state.activePathIdByPart[state.selectedPart];
  return clips.find((clip) => clip.id === activeId) ?? clips[clips.length - 1];
}

function clipIsInSegment(clip, segmentIndex, timeline = buildAnchorTimeline()) {
  return clipMotionTimingWindow(clip, timeline).segmentIndex === segmentIndex;
}

function partHasDirectorPathInCurrentSegment(part, timeline = buildAnchorTimeline()) {
  const segment = anchorSegmentForFrame(state.currentFrame, timeline);
  return (state.motionPaths[part] ?? []).some((clip) => (
    clip.source !== "layout-keyframe" && clipIsInSegment(clip, segment.segmentIndex, timeline)
  ));
}

function selectedNodeCanStartPath() {
  const timeline = buildAnchorTimeline();
  return state.mode === "motion"
    && partLabels[state.selectedPart]
    && autonomousNodes.includes(state.selectedPart)
    && !partHasDirectorPathInCurrentSegment(state.selectedPart, timeline);
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

function activeMotionPathsForSegment(segmentIndex, timeline = buildAnchorTimeline()) {
  return Object.entries(state.motionPaths)
    .map(([part, clips]) => {
      const segmentClips = clips.filter((clip) => clipIsInSegment(clip, segmentIndex, timeline));
      if (!segmentClips.length) return null;
      const activeId = state.activePathIdByPart[part];
      return segmentClips.find((clip) => clip.id === activeId) ?? segmentClips[segmentClips.length - 1];
    })
    .filter((clip) => clip?.path?.length >= 2);
}

function activeMotionPaths(frameIndex = state.currentFrame, timeline = buildAnchorTimeline()) {
  const segment = anchorSegmentForFrame(frameIndex, timeline);
  return activeMotionPathsForSegment(segment.segmentIndex, timeline);
}

function ensureSelectedPart() {
  if (partLabels[state.selectedPart]) return;
  const selectedClip = selectedClipById(state.selectedPathId);
  state.selectedPart = selectedClip?.part ?? activeMotionPaths()[0]?.part ?? "rightHand";
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
    if (saved.character) state.character = saved.character === "mvp" ? "stickman" : saved.character;
    if (typeof saved.customBaseName === "string") state.customBaseName = saved.customBaseName;
    if (saved.mode === "layout" && saved.selectedPart && partLabels[saved.selectedPart]) state.selectedPart = saved.selectedPart;
    if (saved.layout) {
      if (Number.isFinite(saved.layout.height)) state.layout.height = clamp(saved.layout.height, 55, 155);
      if (Number.isFinite(saved.layout.build)) state.layout.build = clamp(saved.layout.build, 55, 175);
      if (Number.isFinite(saved.layout.legs)) state.layout.legs = clamp(saved.layout.legs, 45, 190);
      if (Number.isFinite(saved.layout.arms)) state.layout.arms = clamp(saved.layout.arms, 45, 190);
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
      if (Number.isFinite(saved.base.torso?.x) && Number.isFinite(saved.base.torso?.y)) {
        state.base.torso = { x: saved.base.torso.x, y: saved.base.torso.y };
      }
      if (hasLegacyDefaultLegs(saved.base)) {
        ["leftKnee", "rightKnee", "leftFoot", "rightFoot"].forEach((node) => {
          state.base[node] = structuredClone(defaultBase[node]);
        });
      }
      normalizeTorsoNodes(state.base);
      state.pose = normalizeTorsoNodes(structuredClone(state.base));
    }
    if (saved.pose && typeof saved.pose === "object") {
      const nextPose = normalizeTorsoNodes({
        ...structuredClone(state.base),
        ...structuredClone(saved.pose),
      });
      state.pose = nextPose;
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
    if (Number.isFinite(saved.timelineCellScale)) state.timelineCellScale = clamp(saved.timelineCellScale, 0.18, 1.6);
    if (Number.isFinite(saved.currentFrame)) state.currentFrame = saved.currentFrame;
    if (typeof saved.playbackLoop === "boolean") state.playbackLoop = saved.playbackLoop;
    if (typeof saved.playbackPingPong === "boolean") state.playbackPingPong = saved.playbackPingPong;
    else if (typeof saved.playbackReverse === "boolean") state.playbackPingPong = saved.playbackReverse;
    if (saved.camera && typeof saved.camera === "object") {
      if (Number.isFinite(saved.camera.x)) state.camera.x = clamp(saved.camera.x, -260, 260);
      if (Number.isFinite(saved.camera.y)) state.camera.y = clamp(saved.camera.y, -220, 220);
      if (Number.isFinite(saved.camera.zoom)) {
        const zoomWasOldDefault = Math.abs(saved.camera.zoom - legacyCameraZoomDefault) < 0.001;
        state.camera.zoom = zoomWasOldDefault ? cameraZoomDefault : clamp(saved.camera.zoom, cameraZoomMin, cameraZoomMax);
      }
    }
    if (saved.shotCamera && typeof saved.shotCamera === "object") {
      state.shotCamera = normalizedCamera(saved.shotCamera);
    } else {
      state.shotCamera = normalizedCamera(state.camera);
    }
    if (typeof saved.selectedAnchorIndex === "number" && Number.isFinite(saved.selectedAnchorIndex)) {
      state.selectedAnchorIndex = saved.selectedAnchorIndex;
    }
    state.suppressedGeneratedMotionPaths = normalizeSuppressedGeneratedMotionPaths(saved.suppressedGeneratedMotionPaths);
    state.keyframes = normalizeKeyframeStore(saved.keyframes);
    if (saved.motionPaths) {
      state.motionPaths = normalizeMotionPaths(saved.motionPaths);
      if (saved.activePathIdByPart && typeof saved.activePathIdByPart === "object") {
        Object.entries(saved.activePathIdByPart).forEach(([part, id]) => {
          const normalizedPart = part === "torso" ? "stomach" : part;
          if (partLabels[normalizedPart] && state.motionPaths[normalizedPart]?.some((clip) => clip.id === id)) {
            state.activePathIdByPart[normalizedPart] = id;
          }
        });
      }
    } else if (Array.isArray(saved.path)) {
      const legacyPath = normalizePathPoints(saved.path);
      const legacyPart = partLabels[state.selectedPart] ? state.selectedPart : "rightHand";
      if (legacyPath.length >= 2) {
        const clip = createMotionPath(legacyPart, legacyPath, `${legacyPart}-legacy`);
        state.motionPaths[legacyPart] = [clip];
        state.activePathIdByPart[legacyPart] = clip.id;
      }
    }
    adoptIncomingMotionPosesForKeyframes();
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveState() {
  const snapshot = stateSnapshot();
  localStorage.setItem(storageKey, JSON.stringify({
    version: 1,
    ...snapshot,
    selectedPart: state.mode === "layout" ? state.selectedPart : null,
  }));
}

function currentAnimationFallbackName() {
  const count = activeMotionPaths().length;
  return count ? `Motion ${count}` : "Untitled motion";
}

function safeAnimationFileStem(name) {
  return (name || currentAnimationFallbackName())
    .trim()
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    || "motion-director-animation";
}

function setSaveAnimationStatus(message) {
  if (!saveAnimationStatus) return;
  saveAnimationStatus.textContent = message;
}

function setLoadAnimationStatus(message) {
  if (!loadAnimationStatus) return;
  loadAnimationStatus.textContent = message;
}

function openSaveAnimationModal() {
  if (!saveAnimationModal) return;
  if (fileMenu) fileMenu.open = false;
  if (animationNameInput && !animationNameInput.value.trim()) {
    animationNameInput.value = currentAnimationFallbackName();
  }
  setSaveAnimationStatus("");
  saveAnimationModal.showModal();
  animationNameInput?.focus();
  animationNameInput?.select();
}

function openLoadAnimationModal() {
  if (!loadAnimationModal) return;
  if (fileMenu) fileMenu.open = false;
  if (animationFileInput) animationFileInput.value = "";
  setLoadAnimationStatus("");
  loadAnimationModal.showModal();
  animationFileInput?.focus();
}

function saveNamedAnimation() {
  const now = Date.now();
  const rawName = animationNameInput?.value.trim();
  const name = rawName || currentAnimationFallbackName();
  const payload = {
    version: 1,
    app: "motion-director",
    name,
    savedAt: new Date(now).toISOString(),
    snapshot: stateSnapshot(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeAnimationFileStem(name)}.motion.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  if (animationNameInput) animationNameInput.value = name;
  setSaveAnimationStatus(`Downloaded "${name}".`);
  if (saveAnimationModal) saveAnimationModal.close();
}

async function loadNamedAnimation() {
  const file = animationFileInput?.files?.[0];
  if (!file) {
    setLoadAnimationStatus("Choose a .motion.json file first.");
    return;
  }
  try {
    const payload = JSON.parse(await file.text());
    const snapshot = payload?.snapshot ?? payload;
    if (!snapshot || typeof snapshot !== "object") {
      setLoadAnimationStatus("That file does not look like a Motion Director animation.");
      return;
    }
    recordHistory();
    restoreSnapshot(snapshot);
    if (animationNameInput && payload?.name) animationNameInput.value = payload.name;
    setLoadAnimationStatus(`Opened "${payload?.name ?? file.name}".`);
    if (loadAnimationModal) loadAnimationModal.close();
  } catch {
    setLoadAnimationStatus("Could not open that file.");
  }
}

function stateSnapshot() {
  return {
    mode: state.mode,
    character: state.character,
    customBaseName: state.customBaseName,
    selectedPart: state.selectedPart,
    layout: structuredClone(state.layout),
    shape: structuredClone(state.shape),
    polygonEdits: structuredClone(state.polygonEdits),
    base: structuredClone(state.base),
    pose: structuredClone(state.pose),
    easingBezier: structuredClone(state.easingBezier),
    anticipationTime: state.anticipationTime,
    overshootTime: state.overshootTime,
    duration: state.duration,
    selectedAnchorIndex: state.selectedAnchorIndex,
    frameRate: state.frameRate,
    timelineCellScale: state.timelineCellScale,
    camera: structuredClone(state.camera),
    shotCamera: structuredClone(state.shotCamera),
    currentFrame: state.currentFrame,
    playbackLoop: state.playbackLoop,
    playbackPingPong: state.playbackPingPong,
    keyframes: structuredClone(state.keyframes),
    layoutPresets: structuredClone(state.layoutPresets),
    motionPaths: structuredClone(state.motionPaths),
    activePathIdByPart: structuredClone(state.activePathIdByPart),
    suppressedGeneratedMotionPaths: structuredClone(state.suppressedGeneratedMotionPaths),
  };
}

function sameSnapshot(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function restoreSnapshot(snapshot) {
  isRestoringHistory = true;
  const motionPaths = normalizeMotionPaths(snapshot.motionPaths);
  state.mode = snapshot.mode === "layout" || snapshot.mode === "motion" ? snapshot.mode : state.mode;
  state.character = snapshot.character ?? state.character;
  state.customBaseName = snapshot.customBaseName ?? null;
  state.selectedPart = snapshot.selectedPart === "torso" ? "stomach" : snapshot.selectedPart;
  state.layout = {
    ...structuredClone(defaultLayout),
    ...(snapshot.layout && typeof snapshot.layout === "object" ? structuredClone(snapshot.layout) : {}),
  };
  state.shape = {
    ...structuredClone(defaultShape),
    ...(snapshot.shape && typeof snapshot.shape === "object" ? structuredClone(snapshot.shape) : {}),
  };
  state.polygonEdits = normalizePolygonEdits(snapshot.polygonEdits);
  state.base = normalizeTorsoNodes(structuredClone(snapshot.base ?? snapshot.pose ?? defaultBase));
  state.pose = normalizeTorsoNodes(structuredClone(snapshot.pose ?? state.base));
  state.easingBezier = snapshot.easingBezier ? structuredClone(snapshot.easingBezier) : structuredClone(state.easingBezier);
  state.anticipationTime = Number.isFinite(snapshot.anticipationTime) ? snapshot.anticipationTime : state.anticipationTime;
  state.overshootTime = Number.isFinite(snapshot.overshootTime) ? snapshot.overshootTime : state.overshootTime;
  state.duration = Number.isFinite(snapshot.duration) ? snapshot.duration : state.duration;
  state.selectedAnchorIndex = snapshot.selectedAnchorIndex ?? 0;
  state.frameRate = Number.isFinite(snapshot.frameRate) ? snapshot.frameRate : state.frameRate;
  state.timelineCellScale = Number.isFinite(snapshot.timelineCellScale)
    ? clamp(snapshot.timelineCellScale, 0.18, 1.6)
    : 1;
  state.camera = snapshot.camera ? normalizedCamera(snapshot.camera) : structuredClone(defaultCamera);
  state.shotCamera = snapshot.shotCamera ? normalizedCamera(snapshot.shotCamera) : normalizedCamera(state.camera);
  state.currentFrame = Number.isFinite(snapshot.currentFrame) ? snapshot.currentFrame : 0;
  state.playbackLoop = Boolean(snapshot.playbackLoop);
  state.playbackPingPong = Boolean(snapshot.playbackPingPong);
  state.keyframes = normalizeKeyframeStore(snapshot.keyframes ?? {});
  state.layoutPresets = structuredClone(snapshot.layoutPresets);
  state.motionPaths = motionPaths;
  state.suppressedGeneratedMotionPaths = normalizeSuppressedGeneratedMotionPaths(snapshot.suppressedGeneratedMotionPaths);
  state.activePathIdByPart = {};
  Object.entries(snapshot.activePathIdByPart ?? {}).forEach(([part, id]) => {
    const normalizedPart = part === "torso" ? "stomach" : part;
    if (state.motionPaths[normalizedPart]?.some((clip) => clip.id === id)) {
      state.activePathIdByPart[normalizedPart] = id;
    }
  });
  adoptIncomingMotionPosesForKeyframes();
  state.isDrawing = false;
  state.isPlaying = false;
  state.isPanningFrame = false;
  state.selectedPathId = null;
  state.hoveredPathId = null;
  state.motionTether = null;
  state.drawingPathId = null;
  state.redrawingPathId = null;
  state.redrawReferencePath = null;
  syncSelectedAnchor();
  syncFrameCount();
  state.pose = poseForFrame(state.currentFrame);
  syncControls();
  stage.classList.remove("pen-ready", "is-drawing");
  render();
  saveState();
  isRestoringHistory = false;
}

function recordHistory() {
  if (isRestoringHistory) return;
  const snapshot = stateSnapshot();
  if (historyPast.length && sameSnapshot(historyPast[historyPast.length - 1], snapshot)) return;
  historyPast.push(snapshot);
  if (historyPast.length > 80) historyPast.shift();
  historyFuture = [];
}

function undo() {
  if (!historyPast.length) return;
  const current = stateSnapshot();
  const previous = historyPast.pop();
  historyFuture.push(current);
  restoreSnapshot(previous);
}

function redo() {
  if (!historyFuture.length) return;
  const current = stateSnapshot();
  const next = historyFuture.pop();
  historyPast.push(current);
  restoreSnapshot(next);
}

function setMotionTether(from, to) {
  state.motionTether = from && to ? { from: { ...from }, to: { ...to } } : null;
}

function syncControls() {
  renderBaseOptions();
  characterSelect.value = state.character;
  const anchorDuration = orderedAnchors().length
    ? selectedAnchorDuration()
    : state.duration;
  state.duration = anchorDuration;
  syncKeyframeHoldInput();
  frameRateSelect.value = String(state.frameRate);
  zoomInput.value = String(Math.round(state.camera.zoom * 100));
  if (heightInput) heightInput.value = String(state.layout.height);
  if (buildInput) buildInput.value = String(state.layout.build);
  if (legInput) legInput.value = String(state.layout.legs);
  if (armInput) armInput.value = String(state.layout.arms);
}

function syncFrameCount() {
  const { totalFrames, anchors } = buildAnchorTimeline();
  syncSelectedAnchor();
  state.totalFrames = totalFrames;
  state.keyframes = Object.fromEntries(
    anchors.map((anchor) => [anchor.anchorIndex, normalizeAnchorDefinition({
      pose: anchor.pose,
      durationMs: anchor.durationMs,
      holdMs: anchor.holdMs,
      motion: anchor.motion,
    })]),
  );
  state.currentFrame = Math.min(state.currentFrame, state.totalFrames - 1);
  ensureGeneratedMotionPathsForDirectedKeyframes();
  normalizeAllMotionPathTimings();
}

function makeNode(tag, attrs = {}, parent = puppetRenderParent) {
  const node = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  parent.append(node);
  return node;
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function quadPoint(start, control, end, u) {
  const inv = 1 - u;
  return {
    x: inv * inv * start.x + 2 * inv * u * control.x + u * u * end.x,
    y: inv * inv * start.y + 2 * inv * u * control.y + u * u * end.y,
  };
}

// Densify a coarse polyline into the same quadratic-through-midpoints curve that
// smoothPathData() draws for the overlay. Without this, motion samples straight
// chords between vertices — so the 3-point auto connectors ([start, mid, end])
// read as hard corners, and chained segments look like zigzags. Endpoints are
// preserved exactly so the motion still lands on each keyframe pose.
function curveSamplePoints(points, subdivisions = 14) {
  if (!Array.isArray(points) || points.length < 3) return points;
  const dense = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const control = points[i];
    const segStart = i === 1 ? points[0] : midpoint(points[i - 1], points[i]);
    const segEnd = midpoint(points[i], points[i + 1]);
    for (let s = 1; s <= subdivisions; s += 1) {
      dense.push(quadPoint(segStart, control, segEnd, s / subdivisions));
    }
  }
  dense.push(points[points.length - 1]);
  return dense;
}

function pointAlong(rawPoints, t) {
  if (rawPoints.length < 2) return rawPoints[0] ?? state.pose[state.selectedPart];
  const points = curveSamplePoints(rawPoints);
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

function timingBounds(settings = currentMotionSettings()) {
  const motion = normalizeMotionSettings(settings);
  const anticipationEnd = clamp(motion.anticipationTime, 0, 0.35);
  const settle = Math.max(anticipationEnd + 0.05, Math.min(1, 1 - motion.overshootTime));
  return {
    anticipationEnd,
    settle,
    overshootExtreme: 1,
  };
}

function phaseDurations(settings = currentMotionSettings()) {
  const motion = normalizeMotionSettings(settings);
  const { anticipationEnd, settle } = timingBounds(motion);
  const anticipationDistance = anticipationEnd;
  const recoveryDistance = 1 - settle;
  const push = curveEnergy(motion);
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

function pathProgressForTime(rawT, settings = currentMotionSettings()) {
  const motion = normalizeMotionSettings(settings);
  const { anticipationEnd, settle, overshootExtreme } = timingBounds(motion);
  const { anticipationDuration, mainDuration, recoveryDuration } = phaseDurations(motion);
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
    return anticipationEnd + (target - anticipationEnd) * bezierEasing(local, motion.easingBezier);
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

function deltaFrom(base, source, target) {
  return {
    x: target.x - base[source].x,
    y: target.y - base[source].y,
  };
}

function pointWithDelta(base, node, delta, weights) {
  return {
    x: base[node].x + delta.x * (weights.x ?? 0),
    y: base[node].y + delta.y * (weights.y ?? 0),
  };
}

function laggedRoot(basePoint, target, weights) {
  return {
    x: target.x * (weights.x ?? 0) + basePoint.x * (1 - (weights.x ?? 0)),
    y: target.y * (weights.y ?? 0) + basePoint.y * (1 - (weights.y ?? 0)),
  };
}

function limbLength(base, a, b, fallback) {
  return Number.isFinite(fallback) ? fallback : distance(base[a], base[b]);
}

function syncTorsoAlias(pose) {
  if (pose.stomach) pose.torso = { ...pose.stomach };
}

function applyResponseProfile(pose, base, part, target, lockedParts = new Set()) {
  const profile = bodyResponseProfiles[part];
  if (!profile) return;

  const canWriteNode = (node) => node === part || !lockedParts.has(node);

  if (profile.limb) {
    const { root, joint, end, bend, rootLag, upperLength, lowerLength } = profile.limb;
    const rootPoint = laggedRoot(base[root], target, rootLag);
    if (canWriteNode(root)) {
      pose[root] = rootPoint;
    }
    if (canWriteNode(joint)) {
      pose[joint] = solveTwoBone(
        rootPoint,
        target,
        limbLength(base, root, joint, upperLength),
        limbLength(base, joint, end, lowerLength),
        bend,
      );
    }
  }

  profile.influences?.forEach((influence) => {
    if (!base[influence.node] || !base[influence.source]) return;
    if (!canWriteNode(influence.node)) return;
    pose[influence.node] = pointWithDelta(base, influence.node, deltaFrom(base, influence.source, target), influence.weights);
  });
  syncTorsoAlias(pose);
}

function responseNodesForPart(part) {
  const profile = bodyResponseProfiles[part === "torso" ? "stomach" : part];
  if (!profile) return [];
  return [
    ...(profile.limb ? [profile.limb.root, profile.limb.joint] : []),
    ...(profile.influences ?? [])
      .filter((influence) => influence.showArc !== false)
      .map((influence) => influence.node),
  ].filter((node, index, nodes) => node !== part && nodes.indexOf(node) === index);
}

function inSameRigidResponseArcGroup(sourceNode, responseNode) {
  return rigidResponseArcGroups.some((group) => group.has(sourceNode) && group.has(responseNode));
}

function connectedPose(part, target, sourcePose = state.base, options = {}) {
  if (part === "torso") part = "stomach";
  const pose = normalizeTorsoNodes(structuredClone(sourcePose));
  const base = normalizeTorsoNodes(structuredClone(sourcePose));
  const lockedParts = options.lockedParts ?? new Set();
  pose[part] = target;
  if (part === "stomach") syncTorsoAlias(pose);
  applyResponseProfile(pose, base, part, target, lockedParts);
  return normalizeTorsoNodes(pose);
}

function applyConnectedMotion(part, target) {
  const lockedParts = new Set(activeMotionPaths().map((clip) => clip.part));
  state.pose = connectedPose(part, target, state.pose, { lockedParts });
}

function pathData(points) {
  if (!points.length) return "";
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function smoothPathData(points) {
  if (points.length < 2) return pathData(points);
  if (points.length === 2) return pathData(points);
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const mid = midpoint(points[i], points[i + 1]);
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${mid.x.toFixed(1)} ${mid.y.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
}

function renderPuppet() {
  puppetRenderParent = puppet;
  puppet.innerHTML = "";
  nodeLayer.innerHTML = "";
  if (state.character === "stickman") {
    renderStickmanPuppet();
  } else {
    renderAnimePuppet();
  }
  renderNodeHandles();

  puppet.querySelectorAll("[data-part]").forEach((node) => {
    node.addEventListener("pointerdown", (event) => {
      state.selectedPart = event.currentTarget.dataset.part;
      render();
    });
  });
  renderShapeHandles();
}

function renderNodeHandles() {
  const torsoNodes = ["hips", "stomach", "chest"]
    .map((nodeName) => state.pose[nodeName])
    .filter(Boolean);
  if (torsoNodes.length === 3) {
    makeNode("polyline", {
      class: "torso-node-line",
      points: pointsString(torsoNodes),
    }, nodeLayer);
  }

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
    rightRib: offsetPoint(p.chest, 43, 12),
    rightWaist: offsetPoint(p.stomach, 27 * waist + rightWaistEdit.dx, 20 + rightWaistEdit.dy),
    rightHip: offsetPoint(p.rightHip, 30, 23),
    pelvisTip: offsetPoint(p.hips, 0, 54),
    leftHip: offsetPoint(p.leftHip, -30, 23),
    leftWaist: offsetPoint(p.stomach, -27 * waist + leftWaistEdit.dx, 20 + leftWaistEdit.dy),
    leftRib: offsetPoint(p.chest, -43, 12),
  };
}

function renderShapeHandles() {
  if (state.mode !== "layout") return;
  const p = state.pose;
  const torso = torsoControlPoints(p);
  const handles = [
    { key: "waist", part: "torso", editId: "torsoLeftWaist", drag: "free", point: torso.leftWaist, label: "Left waist" },
    { key: "waist", part: "torso", editId: "torsoRightWaist", drag: "free", point: torso.rightWaist, label: "Right waist" },
    ...limbShapeHandles("leftUpperArm", "upperArm", "leftHand", "Left upper arm", p.leftShoulder, p.leftElbow, 24, 18),
    ...limbShapeHandles("leftForearm", "forearm", "leftHand", "Left forearm", p.leftElbow, p.leftHand, 18, 13),
    ...limbShapeHandles("rightUpperArm", "upperArm", "rightHand", "Right upper arm", p.rightShoulder, p.rightElbow, 25, 18),
    ...limbShapeHandles("rightForearm", "forearm", "rightHand", "Right forearm", p.rightElbow, p.rightHand, 18, 13),
    ...limbShapeHandles("leftThigh", "thigh", "leftFoot", "Left thigh", p.leftHip, p.leftKnee, 28, 21),
    ...limbShapeHandles("leftCalf", "calf", "leftFoot", "Left calf", p.leftKnee, p.leftFoot, 21, 15),
    ...limbShapeHandles("rightThigh", "thigh", "rightFoot", "Right thigh", p.rightHip, p.rightKnee, 29, 21),
    ...limbShapeHandles("rightCalf", "calf", "rightFoot", "Right calf", p.rightKnee, p.rightFoot, 21, 15),
    ...extremityShapeHandles("leftHand", "Left hand", handControlPoints("leftHand", p.leftElbow, p.leftHand)),
    ...extremityShapeHandles("rightHand", "Right hand", handControlPoints("rightHand", p.rightElbow, p.rightHand)),
    ...extremityShapeHandles("leftFoot", "Left foot", footControlPoints("leftFoot", p.leftKnee, p.leftFoot, -1)),
    ...extremityShapeHandles("rightFoot", "Right foot", footControlPoints("rightFoot", p.rightKnee, p.rightFoot, 1)),
    ...(state.character === "stickman" ? [] : extremityShapeHandles("head", "Head", headControlPoints("head", p.head))),
  ].filter(shapeHandleBelongsToSelection);

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
      "aria-valuenow": String(Math.round(state.shape[handle.key] ?? 100)),
      transform: `rotate(45 ${handle.point.x.toFixed(1)} ${handle.point.y.toFixed(1)})`,
    }, nodeLayer);
    node.addEventListener("pointerdown", (event) => startShapeHandleDrag(event, handle));
  });
}

function shapeHandleBelongsToSelection(handle) {
  if (!state.selectedPart) return false;
  if (handle.part === "torso") return ["chest", "stomach", "hips"].includes(state.selectedPart);
  return handle.part === state.selectedPart;
}

function limbShapeHandles(segmentId, key, part, label, start, end, startWidth, endWidth) {
  const axis = unitVector(start, end);
  const normal = { x: -axis.y, y: axis.x };
  const length = distance(start, end);
  return [-1, 1].map((edgeSide) => {
    const handle = limbHandlePoint(segmentId, key, edgeSide, start, end, startWidth, endWidth);
    return {
      segmentId,
      key,
      part,
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

function extremityShapeHandles(part, label, controlPoints) {
  return Object.entries(controlPoints)
    .filter(([, control]) => control.editable)
    .map(([name, control]) => ({
      key: part,
      part,
      label: `${label} ${control.label}`,
      drag: "free",
      editId: `${part}${name[0].toUpperCase()}${name.slice(1)}`,
      point: control.point,
    }));
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
  state.pose = normalizeTorsoNodes(structuredClone(state.base));
  render();
  saveState();
}

function setPolygonPointHandle(editId, dx, dy) {
  state.polygonEdits[editId] = {
    dx: clamp(dx, -80, 80),
    dy: clamp(dy, -80, 80),
  };
  state.currentFrame = 0;
  state.pose = normalizeTorsoNodes(structuredClone(state.base));
  render();
  saveState();
}

function layoutSelectedClass(part) {
  return state.mode === "layout" && state.selectedPart === part ? "selected" : "";
}

function renderStickmanPuppet() {
  const p = state.pose;
  const torso = torsoControlPoints(p);

  makeNode("line", { class: "limb arm", "data-part": "leftHand", x1: p.leftShoulder.x, y1: p.leftShoulder.y, x2: p.leftElbow.x, y2: p.leftElbow.y });
  makeNode("line", { class: "limb arm", "data-part": "leftHand", x1: p.leftElbow.x, y1: p.leftElbow.y, x2: p.leftHand.x, y2: p.leftHand.y });
  makeNode("line", { class: "limb arm", "data-part": "rightHand", x1: p.rightShoulder.x, y1: p.rightShoulder.y, x2: p.rightElbow.x, y2: p.rightElbow.y });
  makeNode("line", { class: "limb arm", "data-part": "rightHand", x1: p.rightElbow.x, y1: p.rightElbow.y, x2: p.rightHand.x, y2: p.rightHand.y });

  makeNode("line", { class: "limb leg", "data-part": "leftFoot", x1: p.leftHip.x, y1: p.leftHip.y, x2: p.leftKnee.x, y2: p.leftKnee.y });
  makeNode("line", { class: "limb leg", "data-part": "leftFoot", x1: p.leftKnee.x, y1: p.leftKnee.y, x2: p.leftFoot.x, y2: p.leftFoot.y });
  makeNode("line", { class: "limb leg", "data-part": "rightFoot", x1: p.rightHip.x, y1: p.rightHip.y, x2: p.rightKnee.x, y2: p.rightKnee.y });
  makeNode("line", { class: "limb leg", "data-part": "rightFoot", x1: p.rightKnee.x, y1: p.rightKnee.y, x2: p.rightFoot.x, y2: p.rightFoot.y });

  makeNode("path", {
    class: `torso ${["chest", "stomach", "hips"].includes(state.selectedPart) ? "selected" : ""}`,
    "data-part": "stomach",
    d: [
      `M ${torso.leftShoulder.x} ${torso.leftShoulder.y}`,
      `C ${torso.leftRib.x} ${torso.leftRib.y}, ${torso.leftWaist.x} ${torso.leftWaist.y}, ${torso.leftHip.x} ${torso.leftHip.y}`,
      `L ${torso.pelvisTip.x} ${torso.pelvisTip.y}`,
      `L ${torso.rightHip.x} ${torso.rightHip.y}`,
      `C ${torso.rightWaist.x} ${torso.rightWaist.y}, ${torso.rightRib.x} ${torso.rightRib.y}, ${torso.rightShoulder.x} ${torso.rightShoulder.y}`,
      "Z",
    ].join(" "),
  });

  makeNode("circle", {
    class: `head ${layoutSelectedClass("head")}`,
    "data-part": "head",
    cx: p.head.x,
    cy: p.head.y,
    r: 42,
  });
  makeNode("path", { class: "eye", d: `M ${p.head.x - 22} ${p.head.y - 8} Q ${p.head.x - 12} ${p.head.y - 14} ${p.head.x - 2} ${p.head.y - 8}` });
  makeNode("path", { class: "eye", d: `M ${p.head.x + 8} ${p.head.y - 8} Q ${p.head.x + 18} ${p.head.y - 14} ${p.head.x + 28} ${p.head.y - 8}` });
  makeNode("path", { class: "mouth", d: `M ${p.head.x - 16} ${p.head.y + 20} Q ${p.head.x + 2} ${p.head.y + 32} ${p.head.x + 22} ${p.head.y + 16}` });

  ["leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftKnee", "rightKnee"].forEach((joint) => {
    makeNode("circle", { class: "joint", cx: p[joint].x, cy: p[joint].y, r: 12 });
  });

  [
    ["leftHand", "hand", handPolygon("leftHand", p.leftElbow, p.leftHand)],
    ["rightHand", "hand", handPolygon("rightHand", p.rightElbow, p.rightHand)],
    ["leftFoot", "foot", footPolygon("leftFoot", p.leftKnee, p.leftFoot, -1)],
    ["rightFoot", "foot", footPolygon("rightFoot", p.rightKnee, p.rightFoot, 1)],
  ].forEach(([part, className, points]) => {
    makeNode("polygon", {
      class: `joint ${className} ${layoutSelectedClass(part)}`,
      "data-part": part,
      points,
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
    class: `anime-torso ${["chest", "stomach", "hips"].includes(state.selectedPart) ? "selected" : ""}`,
    "data-part": "stomach",
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
    points: headPolygon("head", p.head),
  });
  makeNode("polygon", {
    class: `anime-limb front-limb ${layoutSelectedClass("rightHand")}`,
    "data-part": "rightHand",
    points: limbPolygon("rightForearm", "forearm", p.rightElbow, p.rightHand, 18, 13),
  });
  makeNode("polygon", {
    class: `anime-hand ${layoutSelectedClass("leftHand")}`,
    "data-part": "leftHand",
    points: handPolygon("leftHand", p.leftElbow, p.leftHand),
  });
  makeNode("polygon", {
    class: `anime-hand ${layoutSelectedClass("rightHand")}`,
    "data-part": "rightHand",
    points: handPolygon("rightHand", p.rightElbow, p.rightHand),
  });
  makeNode("polygon", {
    class: `anime-limb front-leg ${layoutSelectedClass("rightFoot")}`,
    "data-part": "rightFoot",
    points: limbPolygon("rightCalf", "calf", p.rightKnee, p.rightFoot, 21, 15),
  });
  makeNode("polygon", {
    class: `anime-foot ${layoutSelectedClass("leftFoot")}`,
    "data-part": "leftFoot",
    points: footPolygon("leftFoot", p.leftKnee, p.leftFoot, -1),
  });
  makeNode("polygon", {
    class: `anime-foot ${layoutSelectedClass("rightFoot")}`,
    "data-part": "rightFoot",
    points: footPolygon("rightFoot", p.rightKnee, p.rightFoot, 1),
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

function editablePoint(editId, point, label, editable = true) {
  const edit = state.polygonEdits[editId] ?? { dx: 0, dy: 0 };
  return {
    editable,
    label,
    point: offsetPoint(point, edit.dx ?? 0, edit.dy ?? 0),
  };
}

function headControlPoints(part, head) {
  const point = (name, base, label, editable = true) => editablePoint(`${part}${name[0].toUpperCase()}${name.slice(1)}`, base, label, editable);
  return {
    crownLeft: point("crownLeft", offsetPoint(head, -33, -48), "crown left"),
    crownRight: point("crownRight", offsetPoint(head, 30, -42), "crown right"),
    cheekRight: point("cheekRight", offsetPoint(head, 42, -5), "right cheek"),
    chin: point("chin", offsetPoint(head, 6, 47), "chin"),
    cheekLeft: point("cheekLeft", offsetPoint(head, -41, 10), "left cheek"),
  };
}

function headPolygon(part, head) {
  const controls = headControlPoints(part, head);
  return pointsString(Object.values(controls).map((control) => control.point));
}

function handControlPoints(part, elbow, hand) {
  const axis = unitVector(elbow, hand);
  const normal = { x: -axis.y, y: axis.x };
  const point = (name, base, label, editable = true) => editablePoint(`${part}${name[0].toUpperCase()}${name.slice(1)}`, base, label, editable);
  return {
    wristTop: point("wristTop", addScaled(addScaled(hand, axis, -12), normal, 10), "wrist top"),
    knuckleTop: point("knuckleTop", addScaled(addScaled(hand, axis, 6), normal, 16), "knuckle top"),
    fingertip: point("fingertip", addScaled(addScaled(hand, axis, 25), normal, 1), "fingertip"),
    palmBottom: point("palmBottom", addScaled(addScaled(hand, axis, 6), normal, -16), "palm bottom"),
    wristBottom: point("wristBottom", addScaled(addScaled(hand, axis, -12), normal, -11), "wrist bottom"),
  };
}

function handPolygon(part, elbow, hand) {
  const controls = handControlPoints(part, elbow, hand);
  return pointsString(Object.values(controls).map((control) => control.point));
}

function footControlPoints(part, knee, foot, direction) {
  const axis = unitVector(knee, foot);
  const normal = { x: -axis.y, y: axis.x };
  const forward = unitVector(foot, { x: foot.x + direction * 48, y: foot.y + 8 });
  const toeBase = addScaled(foot, forward, 28);
  const toeTip = addScaled(foot, forward, 43);
  const point = (name, base, label, editable = true) => editablePoint(`${part}${name[0].toUpperCase()}${name.slice(1)}`, base, label, editable);
  return {
    ankleTop: point("ankleTop", addScaled(addScaled(foot, axis, -14), normal, 11), "ankle top"),
    toeTop: point("toeTop", addScaled(toeTip, normal, 5), "toe top"),
    toeBottom: point("toeBottom", addScaled(toeTip, normal, -8), "toe bottom"),
    sole: point("sole", addScaled(toeBase, normal, -14), "sole"),
    heelBack: point("heelBack", addScaled(addScaled(foot, axis, -18), normal, -4), "heel back"),
  };
}

function footPolygon(part, knee, foot, direction) {
  const controls = footControlPoints(part, knee, foot, direction);
  return pointsString(Object.values(controls).map((control) => control.point));
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

function renderTimingArcMarkers(path, motionSettings = currentMotionSettings()) {
  if (path.length < 2) return;
  const motion = normalizeMotionSettings(motionSettings);
  const { anticipationEnd, settle } = timingBounds(motion);
  const anticipationPath = sampledPathData(path, 0, anticipationEnd);
  const overshootPath = sampledPathData(path, settle, 1);
  const markerSize = 8 / clamp(state.camera.zoom, cameraZoomMin, cameraZoomMax);
  const markerRadius = Math.max(0.75, markerSize * 0.12);
  const markerOffset = markerSize / 2;
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
      x: point.x - markerOffset,
      y: point.y - markerOffset,
      width: markerSize,
      height: markerSize,
      rx: markerRadius,
      role: "slider",
      tabindex: "0",
      "aria-label": `${marker} timing`,
      "aria-valuemin": "0",
      "aria-valuemax": "35",
      "aria-valuenow": String(Math.round((marker === "anticipation" ? motion.anticipationTime : motion.overshootTime) * 100)),
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

function movementLength(points) {
  return points.reduce((total, point, index) => {
    if (index === 0) return total;
    return total + distance(points[index - 1], point);
  }, 0);
}

function sampledResponsePoints(clip, nodeName) {
  const frameCount = Math.max(2, state.totalFrames);
  const timeline = buildAnchorTimeline();
  const timingWindow = clipMotionTimingWindow(clip, timeline);
  const effectiveStartFrame = clipEffectiveStartFrame(timingWindow, timeline);
  const motion = motionSettingsForClip(clip, timeline);
  const samples = Array.from({ length: frameCount }, (_, frame) => {
    const localProgress = clipProgressForFrame(clip, frame, timeline);
    const t = localProgress === null
      ? (frame < effectiveStartFrame ? 0 : 1)
      : pathProgressForTime(localProgress, motion);
    const target = pointAlong(clip.path, t);
    const pose = connectedPose(clip.part, target, state.base);
    return pose[nodeName];
  }).filter(Boolean);
  return samples;
}

function renderBodyResponsePaths(primaryClipId, clips = activeMotionPaths()) {
  if (state.mode !== "motion") return;
  const explicitlyPathedParts = new Set(clips.map((clip) => clip.part));
  clips.forEach((clip) => {
    if (clip.path.length < 2) return;
    if (state.isDrawing && clip.id === state.drawingPathId) return;
    const isPrimary = clip.id === primaryClipId;
    responseNodesForPart(clip.part).forEach((nodeName) => {
      if (explicitlyPathedParts.has(nodeName)) return;
      if (inSameRigidResponseArcGroup(clip.part, nodeName)) return;
      const points = sampledResponsePoints(clip, nodeName);
      if (points.length < 2 || movementLength(points) < 2.5) return;
      makeNode("path", {
        class: `body-response-path ${isPrimary ? "is-selected" : "is-subtle"}`.trim(),
        "data-response-path": "true",
        "data-response-source": clip.part,
        "data-response-node": nodeName,
        d: smoothPathData(points),
      }, pathLayer);
      renderTimingTicks(points, isPrimary, "response-timing-tick", {
        source: clip.part,
        node: nodeName,
      }, clipMotionTimingWindow(clip, buildAnchorTimeline()), motionSettingsForClip(clip, buildAnchorTimeline()));
      if (!isPrimary) return;
      [points[0], points[points.length - 1]].forEach((point, index) => {
        makeNode("circle", {
          class: `body-response-point ${index === 0 ? "is-start" : "is-end"}`,
          "data-response-source": clip.part,
          "data-response-node": nodeName,
          cx: point.x.toFixed(1),
          cy: point.y.toFixed(1),
          r: index === 0 ? 2.2 : 2.8,
        }, pathLayer);
      });
    });
  });
}

function renderTimingTicks(path, isPrimary, className = "timing-tick", dataset = {}, timingWindow = null, motionSettings = currentMotionSettings()) {
  if (path.length < 2) return;
  const subtleClass = isPrimary ? "" : " is-subtle";
  const majorEvery = Math.max(2, Math.round(state.frameRate / 4));
  const startFrame = Number.isFinite(timingWindow?.startFrame) ? timingWindow.startFrame : 0;
  const durationFrames = Number.isFinite(timingWindow?.endFrame) && Number.isFinite(timingWindow?.startFrame)
    ? Math.max(1, timingWindow.endFrame - timingWindow.startFrame)
    : Math.max(1, state.totalFrames - 1);
  for (let frame = 1; frame < durationFrames; frame += 1) {
    const absoluteFrame = startFrame + frame;
    const t = pathProgressForTime(clamp(frame / durationFrames, 0, 1), motionSettings);
    const point = pointAlong(path, t);
    const tangent = tangentAt(path, t);
    const normal = { x: -tangent.y, y: tangent.x };
    const isMajor = absoluteFrame % majorEvery === 0;
    const length = isPrimary ? (isMajor ? 6 : 3.5) : (isMajor ? 4 : 2.5);
    makeNode("line", {
      class: `${className} ${isMajor ? "major-tick" : "minor-tick"}${subtleClass}`.trim(),
      "data-frame": absoluteFrame + 1,
      ...(dataset.source ? { "data-response-source": dataset.source } : {}),
      ...(dataset.node ? { "data-response-node": dataset.node } : {}),
      ...(dataset.pathId ? { "data-path-id": dataset.pathId } : {}),
      x1: point.x - normal.x * length * 0.5,
      y1: point.y - normal.y * length * 0.5,
      x2: point.x + normal.x * length * 0.5,
      y2: point.y + normal.y * length * 0.5,
    }, pathLayer);
  }
}

function renderPathDelayBadge(clip, isSelected) {
  const delayFrames = pathStartDelayFrames(clip, buildAnchorTimeline());
  if (!Number.isFinite(delayFrames) || delayFrames <= 0 || clip.path.length < 2) return;
  const subtleClass = isSelected ? "" : " is-subtle";
  const start = clip.path[0];
  const tangent = tangentAt(clip.path, 0);
  const normal = { x: -tangent.y, y: tangent.x };
  makeNode("text", {
    class: `path-delay-badge${subtleClass}`,
    "data-path-id": clip.id,
    x: (start.x + normal.x * 16).toFixed(1),
    y: (start.y + normal.y * 16 - 3).toFixed(1),
  }, pathLayer).textContent = `${delayFrames}f`;
}

function renderPathDirectionAndTicks(clip, isSelected) {
  const path = clip.path ?? [];
  if (path.length < 2) return;
  const subtleClass = isSelected ? "" : " is-subtle";
  const end = path[path.length - 1];
  const prev = path[path.length - 8] ?? path[path.length - 2];
  const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
  const wing = isSelected ? 18 : 12;
  makeNode("line", {
    class: `path-arrow${subtleClass}`,
    x1: end.x,
    y1: end.y,
    x2: end.x - Math.cos(angle - 0.55) * wing,
    y2: end.y - Math.sin(angle - 0.55) * wing,
  }, pathLayer);
  makeNode("line", {
    class: `path-arrow${subtleClass}`,
    x1: end.x,
    y1: end.y,
    x2: end.x - Math.cos(angle + 0.55) * wing,
    y2: end.y - Math.sin(angle + 0.55) * wing,
  }, pathLayer);

  const timingWindow = clipMotionTimingWindow(clip, buildAnchorTimeline());
  renderPathDelayBadge(clip, isSelected);
  renderTimingTicks(path, isSelected, "timing-tick", { pathId: clip.id }, timingWindow, motionSettingsForClip(clip, buildAnchorTimeline()));
}

function renderPath() {
  pathLayer.innerHTML = "";
  const timeline = buildAnchorTimeline();
  const visiblePaths = allMotionPaths().filter((clip) => clipIsInCurrentCelRange(clip, timeline));
  const selectedCandidate = editingMotionPath();
  const selectedClip = selectedCandidate && visiblePaths.some((clip) => clip.id === selectedCandidate.id)
    ? selectedCandidate
    : null;
  const selectedClipId = selectedClip?.id;
  const visibleActivePaths = activeMotionPaths().filter((clip) => visiblePaths.some((path) => path.id === clip.id));
  const primaryClipId = selectedClipId ?? visibleActivePaths[0]?.id;
  const hoverClipId = visiblePaths.some((clip) => clip.id === state.hoveredPathId) ? state.hoveredPathId : null;

  const paths = visiblePaths;
  if (state.redrawingPathId && state.redrawReferencePath?.length >= 2) {
    makeNode("path", {
      class: "redraw-reference-path",
      d: pathData(state.redrawReferencePath),
    }, pathLayer);
  }
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
      if (state.redrawingPathId === clip.id) return;
      event.preventDefault();
      event.stopPropagation();
      selectMotionPath(clip.id);
    });
  };

  renderBodyResponsePaths(selectedClipId ?? hoverClipId ?? primaryClipId, visibleActivePaths);
  paths.forEach(renderCurve);
  paths.forEach((clip) => renderPathDirectionAndTicks(clip, clip.id === primaryClipId));

  const path = selectedClip?.path ?? [];
  if (path.length < 2) {
    renderPathSelection();
    return;
  }
  renderTimingArcMarkers(path, motionSettingsForClip(selectedClip, timeline));
  renderPathSelection(selectedClip);
}

function renderPathSelection(selectedClip = null) {
  if (state.mode !== "motion") return;
  if (!selectedClip?.path?.length) return;
  if (state.isDrawing && selectedClip.id === state.drawingPathId) return;
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
}

function renderGhosts() {
  ghostLayer.innerHTML = "";
}

function frameProgress(frameIndex) {
  return state.totalFrames <= 1 ? 0 : frameIndex / (state.totalFrames - 1);
}

function poseForFrame(frameIndex) {
  const timeline = buildAnchorTimeline();
  const segment = anchorSegmentForFrame(frameIndex, timeline);
  const anchor = timeline.anchors.find((entry) => entry.anchorIndex === segment.anchorIndex);
  const startPose = resolveAnchorPose(anchor, timeline);
  let pose = startPose;
  if (frameIsInsideSegmentHold(frameIndex, segment, timeline)) {
    return pose;
  }
  const activeClips = activeMotionPathsForSegment(segment.segmentIndex, timeline);
  const lockedParts = new Set(activeClips.map((clip) => clip.part));
  activeClips.forEach((clip) => {
    const clipProgress = clipProgressForFrame(clip, frameIndex, timeline, { holdFinal: true });
    if (clipProgress === null) return;
    pose = connectedPose(clip.part, pointAlong(clip.path, pathProgressForTime(clipProgress, motionSettingsForClip(clip, timeline))), pose, { lockedParts });
  });
  // Layered backfill: tween any node the arcs did not move from this segment's
  // start pose toward the next anchor's pose. Arcs (and the chains they solve)
  // win; this fills the remaining static nodes so a reposed keyframe produces
  // smooth in-betweens without requiring a hand-drawn or generated arc per node.
  const nextAnchor = timeline.anchors[segment.segmentIndex + 1];
  if (nextAnchor) {
    const endPose = resolveAnchorPose(nextAnchor, timeline);
    const holdEnd = segmentHoldEndFrame(segment, timeline);
    const span = segment.endFrame - holdEnd;
    if (span > 0) {
      const linearT = clamp((frameIndex - holdEnd) / span, 0, 1);
      const easedT = clamp(pathProgressForTime(linearT, motionSettingsForSegment(segment, timeline)), 0, 1);
      Object.keys(startPose).forEach((node) => {
        const start = startPose[node];
        const end = endPose[node];
        if (!start || !end) return;
        if (pose[node] && distance(start, pose[node]) > 0.001) return; // already moved by an arc
        pose[node] = interpolatePoint(start, end, easedT);
      });
    }
  }
  return pose;
}

function resolveAnchorPose(anchor, timeline = buildAnchorTimeline()) {
  if (!anchor) return normalizeTorsoNodes(structuredClone(state.base));
  return normalizeTorsoNodes(structuredClone(anchor.pose ?? state.base));
}

function incomingPoseForAnchor(anchor, timeline = buildAnchorTimeline()) {
  const anchorOrder = timeline.anchors.findIndex((entry) => entry.anchorIndex === anchor?.anchorIndex);
  if (anchorOrder <= 0) return resolveAnchorPose(anchor, timeline);
  const previousAnchor = timeline.anchors[anchorOrder - 1];
  let pose = resolveAnchorPose(previousAnchor, timeline);
  const activeClips = activeMotionPathsForSegment(anchorOrder - 1, timeline);
  const lockedParts = new Set(activeClips.map((clip) => clip.part));
  activeClips.forEach((clip) => {
    const timing = clipMotionTimingWindow(clip, timeline);
    if (timing.segmentIndex !== anchorOrder - 1) return;
    const clipProgress = clipProgressForFrame(clip, anchor.frameIndex, timeline, { holdFinal: true });
    if (clipProgress === null) return;
    pose = connectedPose(clip.part, pointAlong(clip.path, pathProgressForTime(clipProgress, motionSettingsForClip(clip, timeline))), pose, { lockedParts });
  });
  return pose;
}

function poseDistanceAcrossNodes(a, b, nodes = autonomousNodes) {
  if (!a || !b) return 0;
  return nodes.reduce((total, node) => (
    a[node] && b[node] ? total + distance(a[node], b[node]) : total
  ), 0);
}

function adoptIncomingMotionPosesForKeyframes(anchorIndexes = new Set()) {
  const explicitIndexes = anchorIndexes instanceof Set ? anchorIndexes : new Set(anchorIndexes);
  let changed = false;
  orderedAnchors().forEach((anchor, anchorOrder) => {
    if (anchorOrder <= 0) return;
    const timeline = buildAnchorTimeline();
    const liveAnchor = timeline.anchors.find((entry) => entry.anchorIndex === anchor.anchorIndex);
    if (!liveAnchor) return;
    const incomingPose = incomingPoseForAnchor(liveAnchor, timeline);
    const currentPose = normalizeTorsoNodes(structuredClone(liveAnchor.pose ?? state.base));
    const shouldAdoptExplicitComputed = explicitIndexes.has(liveAnchor.anchorIndex);
    const looksUnaccepted = poseDistanceAcrossNodes(currentPose, state.base) < 1
      && poseDistanceAcrossNodes(incomingPose, currentPose) > 1;
    if (!shouldAdoptExplicitComputed && !looksUnaccepted) return;
    setAnchorPose(liveAnchor.anchorIndex, incomingPose);
    changed = true;
  });
  return changed;
}

function frameSourceForTimeline(frameIndex, timeline) {
  const anchorIndex = timeline.anchorIndexByFrame.get(frameIndex);
  return anchorIndex === undefined ? "computed" : "directed";
}

function frameIsWithinAnchorHold(frameIndex, timeline) {
  const segment = anchorSegmentForFrame(frameIndex, timeline);
  return frameIsInsideSegmentHold(frameIndex, segment, timeline);
}

function frameTimingPhase(frameIndex, timeline) {
  const anchorIndex = timeline.anchorIndexByFrame.get(frameIndex);
  if (anchorIndex !== undefined) return "key";
  return frameIsWithinAnchorHold(frameIndex, timeline) ? "hold" : "motion";
}

function renderTimelineCel(frameLabel, { source }) {
  const starIcon = `
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M8 1.8l1.7 4 4.3.4-3.3 2.8 1 4.2L8 11l-3.7 2.2 1-4.2L2 6.2l4.3-.4L8 1.8z" />
    </svg>
  `;
  return `
    <span class="frame-cell-tag">${String(frameLabel)}</span>
    <span class="frame-cell-source" aria-hidden="true">${source === "directed" ? starIcon : ""}</span>
  `;
}

function previewPoint(point, bounds, scale, pad = 18) {
  return {
    x: pad + (point.x - bounds.minX) * scale,
    y: pad + (point.y - bounds.minY) * scale,
  };
}

function previewLine(pose, bounds, scale, a, b, className = "preview-limb") {
  const p1 = previewPoint(pose[a], bounds, scale);
  const p2 = previewPoint(pose[b], bounds, scale);
  return `<line class="${className}" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" />`;
}

function renderFigurePreview() {
  if (!newFigurePreview) return;
  const layout = {
    height: Number(newBaseHeightInput.value),
    build: Number(newBaseBuildInput.value),
    legs: Number(newBaseLegInput.value),
    arms: Number(newBaseArmInput.value),
  };
  const pose = baseFromLayout(layout);
  const bounds = pathBounds(Object.values(pose));
  if (!bounds) return;
  const pad = 18;
  const scale = Math.min(
    (180 - pad * 2) / Math.max(1, bounds.maxX - bounds.minX),
    (220 - pad * 2) / Math.max(1, bounds.maxY - bounds.minY),
  );
  const head = previewPoint(pose.head, bounds, scale);
  newFigurePreview.innerHTML = `
    ${previewLine(pose, bounds, scale, "leftHip", "rightHip", "preview-hip")}
    ${previewLine(pose, bounds, scale, "leftShoulder", "rightShoulder", "preview-shoulder")}
    ${previewLine(pose, bounds, scale, "head", "neck", "preview-spine")}
    ${previewLine(pose, bounds, scale, "neck", "chest", "preview-spine")}
    ${previewLine(pose, bounds, scale, "chest", "stomach", "preview-spine")}
    ${previewLine(pose, bounds, scale, "stomach", "hips", "preview-spine")}
    ${previewLine(pose, bounds, scale, "leftShoulder", "leftElbow")}
    ${previewLine(pose, bounds, scale, "leftElbow", "leftHand")}
    ${previewLine(pose, bounds, scale, "rightShoulder", "rightElbow")}
    ${previewLine(pose, bounds, scale, "rightElbow", "rightHand")}
    ${previewLine(pose, bounds, scale, "leftHip", "leftKnee", "preview-leg")}
    ${previewLine(pose, bounds, scale, "leftKnee", "leftFoot", "preview-leg")}
    ${previewLine(pose, bounds, scale, "rightHip", "rightKnee", "preview-leg")}
    ${previewLine(pose, bounds, scale, "rightKnee", "rightFoot", "preview-leg")}
    <circle class="preview-head" cx="${head.x.toFixed(1)}" cy="${head.y.toFixed(1)}" r="${Math.max(5, 17 * scale).toFixed(1)}" />
  `;
}

function renderPlayButton() {
  playButton.classList.toggle("is-playing", state.isPlaying);
  playButton.setAttribute("aria-label", state.isPlaying ? "Pause animation" : "Play animation");
  playButton.setAttribute("title", state.isPlaying ? "Pause" : "Play");
  reverseButton.setAttribute("aria-pressed", String(state.playbackPingPong));
  reverseButton.classList.toggle("is-active", state.playbackPingPong);
  loopButton.setAttribute("aria-pressed", String(state.playbackLoop));
  loopButton.classList.toggle("is-active", state.playbackLoop);
}

function setFrame(frameIndex, shouldRenderPuppet = true) {
  state.currentFrame = Math.max(0, Math.min(state.totalFrames - 1, frameIndex));
  const currentAnchorIndex = buildAnchorTimeline().anchorIndexByFrame.get(state.currentFrame);
  if (currentAnchorIndex !== undefined) {
    state.selectedAnchorIndex = currentAnchorIndex;
  }
  state.pose = poseForFrame(state.currentFrame);
  if (shouldRenderPuppet) renderPuppet();
  renderTimeline();
  renderState();
  renderPath();
}

function renderTimeline() {
  timelineTrack.innerHTML = "";
  const timeline = buildAnchorTimeline();
  const anchorIndexByFrame = timeline.anchorIndexByFrame;
  const cellCount = timeline.totalFrames + 1;
  const availableWidth = timelineTrack.clientWidth || timelineTrack.parentElement?.clientWidth || 720;
  const gapWidth = 3;
  const fitWidth = Math.floor((availableWidth - gapWidth * Math.max(0, cellCount - 1) - 16) / Math.max(1, cellCount));
  const celWidth = clamp(fitWidth * state.timelineCellScale, 10, 72);
  const frameCellWidth = Math.round(celWidth);
  const frameStepWidth = frameCellWidth + gapWidth;
  const timelineWidth = Math.max(frameCellWidth, timeline.totalFrames * frameCellWidth + Math.max(0, timeline.totalFrames - 1) * gapWidth);
  timelineTrack.style.setProperty("--frame-cell-width", `${frameCellWidth}px`);
  timelineTrack.style.setProperty("--timeline-gap", `${gapWidth}px`);
  timelineTrack.classList.toggle("is-compact", frameCellWidth < 42);
  timelineTrack.classList.toggle("is-tiny", frameCellWidth < 31);
  timelineTrack.classList.toggle("is-micro", frameCellWidth < 18);

  const ruler = document.createElement("div");
  ruler.className = "timeline-ruler";
  ruler.style.width = `${timelineWidth}px`;
  const minorTickFrames = Math.max(1, Math.round(state.frameRate / 2));
  for (let frame = 0; frame < timeline.totalFrames; frame += minorTickFrames) {
    const isMajor = frame % Math.max(1, state.frameRate) === 0;
    const marker = document.createElement("span");
    marker.className = `timeline-ruler-marker ${isMajor ? "is-major" : ""}`;
    marker.style.left = `${frame * frameStepWidth}px`;
    if (isMajor) {
      marker.innerHTML = `<span>${Math.round(frame / Math.max(1, state.frameRate))}s</span>`;
    }
    ruler.append(marker);
  }
  timelineTrack.append(ruler);

  const celRow = document.createElement("div");
  celRow.className = "timeline-cel-row";
  celRow.style.width = `${timelineWidth + frameCellWidth + gapWidth}px`;

  for (let i = 0; i < timeline.totalFrames; i += 1) {
    const button = document.createElement("button");
    const anchorIndex = anchorIndexByFrame.get(i);
    const frameTag = timelineFrameLabel(i, timeline);
    const source = frameSourceForTimeline(i, timeline);
    const isHold = frameIsWithinAnchorHold(i, timeline);
    const timingPhase = frameTimingPhase(i, timeline);
    const segment = anchorSegmentForFrame(i, timeline);
    const holdEndFrame = segmentHoldEndFrame(segment, timeline);
    const startsHoldRun = anchorIndex !== undefined && holdEndFrame > i;
    const continuesHoldRun = isHold;
    const endsHoldRun = isHold && i === holdEndFrame;
    button.type = "button";
    button.className = `frame-cell ${i === state.currentFrame ? "is-current" : ""} ${anchorIndex !== undefined ? "is-key is-anchor" : ""} ${startsHoldRun ? "starts-hold-run" : ""} ${continuesHoldRun ? "continues-hold-run" : ""} ${endsHoldRun ? "ends-hold-run" : ""} ${isHold ? "is-hold" : ""} ${source === "directed" ? "is-directed" : "is-computed"}`;
    button.setAttribute("aria-label", `Cel ${frameTag}${anchorIndex !== undefined ? ", keyframe" : ""}, ${source}, ${timingPhase}${startsHoldRun || continuesHoldRun ? ", held" : ""}`);
    button.innerHTML = renderTimelineCel(frameTag, {
      source,
    });
    button.addEventListener("click", () => {
      state.isPlaying = false;
      if (anchorIndex !== undefined) {
        state.selectedAnchorIndex = anchorIndex;
      }
      setFrame(i);
      saveState();
    });
    celRow.append(button);
  }

  const addFrameButton = document.createElement("button");
  addFrameButton.type = "button";
  addFrameButton.className = "frame-cell is-key is-anchor-add";
  addFrameButton.setAttribute("aria-label", "Add new keyframe");
  addFrameButton.innerHTML = '<span class="frame-cell-label" aria-hidden="true">＋</span>';
  addFrameButton.addEventListener("click", () => {
    state.isPlaying = false;
    addAnchorKeyframe();
    saveState();
  });
  celRow.append(addFrameButton);
  timelineTrack.append(celRow);

  renderPlayButton();
}

function zoomTimelineCels(delta) {
  const nextScale = clamp(state.timelineCellScale * Math.exp(delta * -0.0018), 0.18, 1.6);
  if (Math.abs(nextScale - state.timelineCellScale) < 0.001) return;
  state.timelineCellScale = nextScale;
  renderTimeline();
  saveState();
}

function timelinePointerDistance(points) {
  const [first, second] = points;
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function updateTimelineTouchPinch(event) {
  if (!timelinePinch || !timelinePinch.points.has(event.pointerId)) return;
  timelinePinch.points.set(event.pointerId, event);
  if (timelinePinch.points.size < 2) return;
  const distanceNow = timelinePointerDistance([...timelinePinch.points.values()]);
  if (!Number.isFinite(distanceNow) || distanceNow <= 0) return;
  const nextScale = clamp(timelinePinch.startScale * (distanceNow / timelinePinch.startDistance), 0.18, 1.6);
  if (Math.abs(nextScale - state.timelineCellScale) < 0.001) return;
  state.timelineCellScale = nextScale;
  renderTimeline();
  saveState();
}

function graphPoint(point) {
  return {
    x: BEZIER_GRAPH_ORIGIN_X + point.x * BEZIER_GRAPH_WIDTH,
    y: BEZIER_GRAPH_ORIGIN_Y + BEZIER_GRAPH_HEIGHT - point.y * BEZIER_GRAPH_HEIGHT,
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
  bezierControlLineA.setAttribute("x1", `${BEZIER_GRAPH_ORIGIN_X}`);
  bezierControlLineA.setAttribute("y1", `${BEZIER_GRAPH_ORIGIN_Y + BEZIER_GRAPH_HEIGHT}`);
  bezierControlLineA.setAttribute("x2", a.x.toFixed(1));
  bezierControlLineA.setAttribute("y2", a.y.toFixed(1));
  bezierControlLineB.setAttribute("x1", `${BEZIER_GRAPH_ORIGIN_X + BEZIER_GRAPH_WIDTH}`);
  bezierControlLineB.setAttribute("y1", `${BEZIER_GRAPH_ORIGIN_Y}`);
  bezierControlLineB.setAttribute("x2", b.x.toFixed(1));
  bezierControlLineB.setAttribute("y2", b.y.toFixed(1));
  bezierHandleA.setAttribute("cx", a.x.toFixed(1));
  bezierHandleA.setAttribute("cy", a.y.toFixed(1));
  bezierHandleB.setAttribute("cx", b.x.toFixed(1));
  bezierHandleB.setAttribute("cy", b.y.toFixed(1));
  bezierValue.textContent = `cubic-bezier(${state.easingBezier.x1.toFixed(2)}, ${state.easingBezier.y1.toFixed(2)}, ${state.easingBezier.x2.toFixed(2)}, ${state.easingBezier.y2.toFixed(2)})`;
}

function renderState() {
  const timeline = buildAnchorTimeline();
  const motion = currentMotionSettings(timeline);
  syncGlobalMotionSettings(motion);
  const { anticipationEnd, settle } = timingBounds(motion);
  renderMode();
  selectedLabel.textContent = `${state.mode === "layout" ? "Layout" : "Motion"}: ${selectedPartLabel()}`;
  renderBezierEditor();
  anticipationValue.textContent = `${Math.round(motion.anticipationTime * 100)}%`;
  overshootValue.textContent = `${Math.round(motion.overshootTime * 100)}%`;
  timingRail.style.setProperty("--anticipation-pos", `${Math.round(anticipationEnd * 100)}%`);
  timingRail.style.setProperty("--overshoot-pos", `${Math.round(settle * 100)}%`);
  anticipationMarker.setAttribute("aria-valuenow", String(Math.round(motion.anticipationTime * 100)));
  overshootMarker.setAttribute("aria-valuenow", String(Math.round(motion.overshootTime * 100)));
  const currentAnchorIndex = timeline.anchorIndexByFrame.get(state.currentFrame);
  const hasKeyframeSettings = currentAnchorIndex !== undefined;
  if (keyframeSettingsPanel) {
    keyframeSettingsPanel.hidden = !hasKeyframeSettings;
  }
  if (hasKeyframeSettings) {
    state.selectedAnchorIndex = currentAnchorIndex;
  }
  const keyframeDuration = selectedAnchorDuration();
  state.duration = keyframeDuration;
  if (hasKeyframeSettings) {
    syncKeyframeHoldInput();
  }
  if (deleteKeyframeButton) {
    const anchorOrder = timeline.anchors.findIndex((anchor) => anchor.anchorIndex === state.selectedAnchorIndex);
    deleteKeyframeButton.disabled = !hasKeyframeSettings || anchorOrder <= 0 || timeline.anchors.length <= 2;
  }
  const selectedArcCandidate = state.selectedPathId ? selectedClipById(state.selectedPathId) : null;
  const selectedArc = selectedArcCandidate && clipIsInCurrentCelRange(selectedArcCandidate, timeline)
    ? selectedArcCandidate
    : null;
  const selectedClip = selectedArc;
  const hasArcSettings = state.mode === "motion" && !!selectedArc?.id;
  if (arcSettingsPanel) {
    arcSettingsPanel.hidden = !hasArcSettings;
  }
  if (arcTimingControl) {
    arcTimingControl.hidden = !hasArcSettings;
  }
  if (arcDurationInput) {
    arcDurationInput.hidden = !hasArcSettings;
  }
  if (hasArcSettings && arcDurationInput !== document.activeElement) {
    syncArcDurationInput();
  } else if (!hasArcSettings && arcDurationValue) {
    arcDurationValue.textContent = "0.00s (0f)";
  }
  if (motionPathDelayInput && hasArcSettings && document.activeElement !== motionPathDelayInput) {
    syncMotionPathDelayInput();
  }
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
    shotCamera: state.shotCamera,
    currentFrame: state.currentFrame + 1,
    totalFrames: state.totalFrames,
    keyedFrames: orderedAnchors().map((anchor) => ({
      index: anchor.anchorIndex + 1,
      durationMs: anchor.durationMs,
      holdMs: anchor.holdMs,
    })),
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
  const tether = state.motionTether;
  const source = tether?.from ?? selectedNodePoint();
  const target = tether?.to ?? motionCursorPoint;
  if (
    state.mode !== "motion"
    || !selectedNodeCanStartPath()
    || state.isPanningFrame
    || state.isPlaying
    || !source
    || !target
    || distance(source, target) < 1
  ) {
    motionGuideLine.style.display = "none";
    return;
  }
  motionGuideLine.style.display = "block";
  motionGuideLine.setAttribute("x1", source.x.toFixed(1));
  motionGuideLine.setAttribute("y1", source.y.toFixed(1));
  motionGuideLine.setAttribute("x2", target.x.toFixed(1));
  motionGuideLine.setAttribute("y2", target.y.toFixed(1));
}

function normalizedCamera(camera = state.camera) {
  return {
    x: clamp(camera?.x ?? 0, -260, 260),
    y: clamp(camera?.y ?? 0, -220, 220),
    zoom: clamp(camera?.zoom ?? cameraZoomDefault, cameraZoomMin, cameraZoomMax),
  };
}

function cameraViewBoxForZoom(zoom, rect = stage.getBoundingClientRect(), camera = state.camera) {
  const baseCamera = normalizedCamera(camera);
  const safeZoom = clamp(zoom, cameraZoomMin, cameraZoomMax);
  const viewportAspect = rect.width > 0 && rect.height > 0 ? rect.width / rect.height : 900 / 640;
  const baseAspect = 900 / 640;
  let width = 900 / safeZoom;
  let height = 640 / safeZoom;
  if (viewportAspect > baseAspect) {
    width = height * viewportAspect;
  } else {
    height = width / viewportAspect;
  }
  return {
    x: baseCamera.x + (900 - width) / 2,
    y: baseCamera.y + (640 - height) / 2,
    width,
    height,
    zoom: safeZoom,
  };
}

function zoomCameraAt(clientX, clientY, nextZoom) {
  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const currentView = cameraViewBoxForZoom(state.camera.zoom, rect);
  const nextView = cameraViewBoxForZoom(nextZoom, rect);
  const rx = clamp((clientX - rect.left) / rect.width, 0, 1);
  const ry = clamp((clientY - rect.top) / rect.height, 0, 1);
  const anchor = {
    x: currentView.x + rx * currentView.width,
    y: currentView.y + ry * currentView.height,
  };
  const viewX = anchor.x - rx * nextView.width;
  const viewY = anchor.y - ry * nextView.height;
  setCamera({
    x: viewX - (900 - nextView.width) / 2,
    y: viewY - (640 - nextView.height) / 2,
    zoom: nextView.zoom,
  });
}

function panEditorCamera(deltaX, deltaY) {
  const rect = stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const view = cameraViewBoxForZoom(state.camera.zoom, rect);
  setCamera({
    ...state.camera,
    x: state.camera.x + (deltaX / rect.width) * view.width,
    y: state.camera.y + (deltaY / rect.height) * view.height,
  });
}

function stageZoomDelta(event) {
  const lineMode = typeof WheelEvent === "undefined" ? 1 : WheelEvent.DOM_DELTA_LINE;
  const unit = event.deltaMode === lineMode ? 18 : 1;
  return event.deltaY * unit;
}

function renderShotCropMarks() {
  if (!shotCropMarks) return;
  shotCropMarks.innerHTML = "";
  shotCropMarks.classList.toggle("is-visible", state.isPanningFrame);
  if (!state.isPanningFrame) return;
  const view = cameraViewBoxForZoom(state.shotCamera?.zoom ?? state.camera.zoom, stage.getBoundingClientRect(), state.shotCamera ?? state.camera);
  const len = Math.min(34, Math.max(14, Math.min(view.width, view.height) * 0.045));
  const corners = [
    [view.x, view.y, 1, 1],
    [view.x + view.width, view.y, -1, 1],
    [view.x, view.y + view.height, 1, -1],
    [view.x + view.width, view.y + view.height, -1, -1],
  ];
  corners.forEach(([x, y, sx, sy]) => {
    makeNode("line", {
      x1: x.toFixed(1),
      y1: y.toFixed(1),
      x2: (x + sx * len).toFixed(1),
      y2: y.toFixed(1),
    }, shotCropMarks);
    makeNode("line", {
      x1: x.toFixed(1),
      y1: y.toFixed(1),
      x2: x.toFixed(1),
      y2: (y + sy * len).toFixed(1),
    }, shotCropMarks);
  });
}

function renderCamera() {
  const { zoom, x, y, width, height } = cameraViewBoxForZoom(state.camera.zoom);
  stage.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`);
  [stageBg, motionDrawVeil].forEach((rectNode) => {
    if (!rectNode) return;
    rectNode.setAttribute("x", x.toFixed(1));
    rectNode.setAttribute("y", y.toFixed(1));
    rectNode.setAttribute("width", width.toFixed(1));
    rectNode.setAttribute("height", height.toFixed(1));
  });
  stage.classList.toggle("is-panning-frame", state.isPanningFrame);
  stage.classList.toggle("is-drawing", state.isDrawing);
  renderShotCropMarks();
  panButton.classList.toggle("is-active", state.isPanningFrame);
  panButton.setAttribute("aria-pressed", String(state.isPanningFrame));
  cameraFrameBadge.hidden = !state.isPanningFrame;
  zoomInput.value = String(Math.round(zoom * 100));
}

function setCamera(nextCamera) {
  state.camera = {
    x: clamp(nextCamera.x, -260, 260),
    y: clamp(nextCamera.y, -220, 220),
    zoom: clamp(nextCamera.zoom, cameraZoomMin, cameraZoomMax),
  };
  renderCamera();
  saveState();
}

function finishPanFrame() {
  state.isPanningFrame = false;
  renderCamera();
  saveState();
}

function setMode(mode, options = {}) {
  if (state.mode !== mode) recordHistory();
  hideDrawOverHint();
  state.mode = mode;
  state.isDrawing = false;
  state.isPlaying = false;
  state.isPanningFrame = false;
  state.motionTether = null;
  state.selectedPathId = null;
  state.hoveredPathId = null;
  if (mode === "motion") {
    state.selectedPart = null;
    stage.classList.remove("pen-ready", "is-drawing");
  } else {
    ensureSelectedPart();
  }
  render();
  if (options.showHint) {
    showCanvasHint(toolHintForMode(mode));
  }
  saveState();
}

function renderMode() {
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("aria-pressed", String(isActive));
  });
  stage.classList.toggle("layout-mode", state.mode === "layout");
  stage.classList.toggle("motion-mode", state.mode === "motion");
  const showsPoseSource = state.mode === "layout" || state.mode === "motion";
  const isDirectedPose = showsPoseSource && currentAnchorSource() === "directed";
  stage.classList.toggle("directed-pose", isDirectedPose);
  stage.classList.toggle("computed-pose", showsPoseSource && !isDirectedPose);
  if (poseSourceBadge) {
    const timeline = buildAnchorTimeline();
    const source = showsPoseSource && currentAnchorSource(timeline) === "directed" ? "Directed" : "Computed";
    poseSourceBadge.hidden = !showsPoseSource;
    const star = source === "Directed"
      ? '<svg class="pose-source-star" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1.8l1.7 4 4.3.4-3.3 2.8 1 4.2L8 11l-3.7 2.2 1-4.2L2 6.2l4.3-.4L8 1.8z" /></svg>'
      : "";
    poseSourceBadge.innerHTML = `${star}<span>${source} · ${timelineFrameLabel(state.currentFrame, timeline)}</span>`;
    poseSourceBadge.dataset.source = source.toLowerCase();
  }
}

function renderBaseOptions() {
  characterSelect.innerHTML = "";
  [
    { name: "Polyman", value: "animeHuman" },
    { name: "Stickman", value: "stickman" },
    ...(state.customBaseName ? [{ name: state.customBaseName, value: "customBase" }] : []),
  ].forEach((base) => {
    const option = document.createElement("option");
    option.value = base.value;
    option.textContent = base.name;
    characterSelect.append(option);
  });
}

function layoutPoint(point, heightScale, buildScale, floorY = 620, centerX = 450) {
  return {
    x: centerX + (point.x - centerX) * buildScale,
    y: floorY - (floorY - point.y) * heightScale,
  };
}

function baseFromLayout(layout) {
  const heightScale = (layout.height / 100) * layoutAverageScale.height;
  const buildScale = (layout.build / 100) * layoutAverageScale.build;
  const armScale = (layout.arms / 100) * layoutAverageScale.arms;
  const legScale = (layout.legs / 100) * layoutAverageScale.legs;
  const nextBase = {};

  ["head", "neck", "chest", "stomach", "hips", "leftShoulder", "rightShoulder", "leftHip", "rightHip"].forEach((node) => {
    nextBase[node] = layoutPoint(defaultBase[node], heightScale, buildScale);
  });
  nextBase.torso = { ...nextBase.stomach };

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

  return normalizeTorsoNodes(nextBase);
}

function applyLayoutProportions() {
  state.base = baseFromLayout(state.layout);
  state.pose = normalizeTorsoNodes(structuredClone(state.base));
  state.currentFrame = 0;
}

function bezierEditorPoint(event) {
  const pt = bezierEditor.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const transformed = pt.matrixTransform(bezierEditor.getScreenCTM().inverse());
  return {
    x: clamp((transformed.x - BEZIER_GRAPH_ORIGIN_X) / BEZIER_GRAPH_WIDTH, 0, 1),
    y: clamp((BEZIER_GRAPH_ORIGIN_Y + BEZIER_GRAPH_HEIGHT - transformed.y) / BEZIER_GRAPH_HEIGHT, 0, 1),
  };
}

function applyBezierHandle(handle, point) {
  const motion = currentMotionSettings();
  const easingBezier = structuredClone(motion.easingBezier);
  if (handle === "a") {
    easingBezier.x1 = point.x;
    easingBezier.y1 = point.y;
  } else {
    easingBezier.x2 = point.x;
    easingBezier.y2 = point.y;
  }
  setCurrentMotionSettings({ ...motion, easingBezier });
  setFrame(state.currentFrame, true);
  renderPath();
  renderGhosts();
  saveState();
}

function startBezierDrag(event, handle) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();
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
  const timeline = buildAnchorTimeline();
  const isAnchorEdit = timeline.anchorIndexByFrame.has(state.currentFrame);
  state.pose[nodeName] = point;
  if (nodeName === "stomach") {
    state.pose.torso = { ...point };
  }
  const nextPose = normalizeTorsoNodes(structuredClone(state.pose));
  setCurrentAnchorPose(state.pose);
  if (isAnchorEdit) {
    const part = nodeName === "torso" ? "stomach" : nodeName;
    const current = currentAnchorEntry(timeline);
    if (current?.anchorOrder > 0) {
      clearLayoutGeneratedMotionSuppression(part, timeline.anchors[current.anchorOrder - 1].anchorIndex);
    }
    syncLayoutGeneratedMotionPath(part, nextPose);
  }
  render();
  saveState();
}

function startShapeHandleDrag(event, handle) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();
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
      setPolygonPointHandle(handle.editId, (startEdit.dx ?? 0) + dx, (startEdit.dy ?? 0) + dy);
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
  recordHistory();
  state.selectedPart = nodeName;
  state.motionTether = null;
  if (state.mode !== "layout") {
    if (selectedNodeCanStartPath()) {
      startPendingMotionStroke(event, state.pose[nodeName], true);
    }
    render();
    saveState();
    return;
  }

  const startPoint = stagePoint(event);
  const startNode = { ...state.pose[nodeName] };
  render();
  saveState();

  const move = (moveEvent) => {
    const point = stagePoint(moveEvent);
    setLayoutNode(nodeName, {
      x: startNode.x + point.x - startPoint.x,
      y: startNode.y + point.y - startPoint.y,
    });
  };
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

function hideDrawOverHint() {
  if (!drawOverHint) return;
  window.clearTimeout(drawOverHintTimer);
  drawOverHintTimer = null;
  drawOverHint.classList.remove("is-visible");
  drawOverHint.setAttribute("aria-hidden", "true");
}

function showCanvasHint(messageHtml) {
  if (!drawOverHint) return;
  window.clearTimeout(drawOverHintTimer);
  drawOverHint.innerHTML = messageHtml;
  drawOverHint.setAttribute("aria-hidden", "false");
  drawOverHint.classList.remove("is-visible");
  requestAnimationFrame(() => {
    drawOverHint.classList.add("is-visible");
  });
  drawOverHintTimer = window.setTimeout(hideDrawOverHint, 1900);
}

function showDrawOverHint() {
  showCanvasHint("Press <kbd>D</kbd> to Drawover");
}

function toolHintForMode(mode) {
  return mode === "layout"
    ? "Edit the key pose"
    : "Click on a node and draw an arrow to direct its movement";
}

function selectMotionPath(pathId) {
  state.selectedPathId = pathId;
  const clip = selectedClipById(pathId);
  if (clip && clip.part && partLabels[clip.part]) {
    state.selectedPart = clip.part;
  }
  showDrawOverHint();
  render();
}

function getDeletableMotionPathId() {
  if (state.selectedPathId) return state.selectedPathId;
  if (state.hoveredPathId) return state.hoveredPathId;
  if (state.selectedPart) {
    const selectedPartPaths = state.motionPaths[state.selectedPart];
    if (selectedPartPaths?.length) {
      const timeline = buildAnchorTimeline();
      const segment = anchorSegmentForFrame(state.currentFrame, timeline);
      const segmentPaths = selectedPartPaths.filter((clip) => clipIsInSegment(clip, segment.segmentIndex, timeline));
      const paths = segmentPaths.length ? segmentPaths : selectedPartPaths;
      const activeId = state.activePathIdByPart[state.selectedPart];
      return paths.find((clip) => clip.id === activeId)?.id ?? paths[paths.length - 1].id;
    }
  }
  return null;
}

function deleteSelectedMotionPath() {
  const targetPathId = getDeletableMotionPathId();
  const clip = selectedClipById(targetPathId);
  if (!clip) return;
  recordHistory();
  const timeline = buildAnchorTimeline();
  const timing = clipMotionTimingWindow(clip, timeline);
  if (clip.source === "layout-keyframe" && Number.isFinite(timing.segmentIndex)) {
    const previousAnchor = timeline.anchors[timing.segmentIndex];
    const targetAnchor = timeline.anchors[timing.segmentIndex + 1];
    if (previousAnchor && targetAnchor) {
      suppressLayoutGeneratedMotion(clip.part, previousAnchor.anchorIndex);
      const previousPose = resolveAnchorPose(previousAnchor, timeline);
      const nextPose = normalizeTorsoNodes(structuredClone(targetAnchor.pose ?? state.pose));
      if (previousPose?.[clip.part]) {
        nextPose[clip.part] = { ...previousPose[clip.part] };
        if (clip.part === "stomach") nextPose.torso = { ...nextPose.stomach };
        setAnchorPose(targetAnchor.anchorIndex, nextPose);
      }
    }
  }
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
  state.motionTether = null;
  syncFrameCount();
  state.currentFrame = clamp(state.currentFrame, 0, state.totalFrames - 1);
  state.pose = poseForFrame(state.currentFrame);
  render();
  saveState();
}

function startFramePan(event) {
  event.preventDefault();
  event.stopPropagation();
  stage.setPointerCapture(event.pointerId);
  const startX = event.clientX;
  const startY = event.clientY;
  const startCamera = normalizedCamera(state.shotCamera ?? state.camera);
  const rect = stage.getBoundingClientRect();
  const shotView = cameraViewBoxForZoom(startCamera.zoom, rect, startCamera);
  const unitsPerPixelX = shotView.width / Math.max(1, rect.width);
  const unitsPerPixelY = shotView.height / Math.max(1, rect.height);

  const move = (moveEvent) => {
    state.shotCamera = normalizedCamera({
      ...startCamera,
      x: startCamera.x - (moveEvent.clientX - startX) * unitsPerPixelX,
      y: startCamera.y - (moveEvent.clientY - startY) * unitsPerPixelY,
    });
    renderCamera();
    saveState();
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
  if (state.redrawingPathId && selectedClipById(state.redrawingPathId)) {
    return !target.closest?.("[data-timing-marker]")
      && !target.closest?.("[data-action]")
      && !target.closest?.("[data-shape-handle]");
  }
  return selectedNodeCanStartPath()
    && !target.closest?.("[data-timing-marker]")
    && !target.closest?.("[data-motion-path]")
    && !target.closest?.("[data-action]")
    && !target.closest?.("[data-shape-handle]");
}

function updateStageCursor(event) {
  if (event) {
    motionCursorPoint = stagePoint(event);
  }
  const isPenReady = Boolean(event && canDrawAtTarget(event.target));
  stage.classList.toggle("pen-ready", isPenReady);
  stage.classList.toggle("is-drawing", state.isDrawing);
  renderMotionGuideLine();
}

function beginMotionStroke(event) {
  stage.setPointerCapture(event.pointerId);
  if (!pendingMotionStroke?.historyRecorded) recordHistory();
  state.isDrawing = true;
  const start = pendingMotionStroke?.startPoint ?? stagePoint(event);
  const replacementClip = selectedClipById(state.redrawingPathId);
  if (replacementClip) {
    state.redrawReferencePath ??= structuredClone(replacementClip.path);
    replacementClip.path = [start, start];
    state.selectedPart = replacementClip.part;
    state.activePathIdByPart[replacementClip.part] = replacementClip.id;
    state.drawingPathId = replacementClip.id;
    state.selectedPathId = replacementClip.id;
    state.motionTether = null;
    saveState();
    render();
    return;
  }
  const original = selectedNodePoint();
  const timing = clipTimingForFrame(state.currentFrame);
  const motion = currentMotionSettings();
  clearLayoutGeneratedMotionSuppression(state.selectedPart, timing.anchorIndex);
  const timeline = buildAnchorTimeline();
  const segment = anchorSegmentForFrame(state.currentFrame, timeline);
  const existingClips = state.motionPaths[state.selectedPart] ?? [];
  const retainedClips = existingClips.filter((pathClip) => (
    pathClip.source !== "layout-keyframe" || !clipIsInSegment(pathClip, segment.segmentIndex, timeline)
  ));
  const clip = createMotionPath(state.selectedPart, [start, start], undefined, {
    ...timing,
    easing: "cubic-bezier",
    ...motion,
  });
  state.motionPaths[state.selectedPart] = [
    ...retainedClips,
    clip,
  ];
  state.activePathIdByPart[state.selectedPart] = clip.id;
  state.drawingPathId = clip.id;
  state.selectedPathId = clip.id;
  setMotionTether(original, start);
  applyConnectedMotion(state.selectedPart, start);
  saveState();
  render();
}

function startPendingMotionStroke(event, startPoint = stagePoint(event), historyRecorded = false) {
  const targetNode = event.target.closest?.("[data-node]")?.dataset.node ?? null;
  pendingMotionStroke = {
    pointerId: event.pointerId,
    startPoint,
    targetNode,
    historyRecorded,
  };
  stage.setPointerCapture(event.pointerId);
}

function clearPendingMotionStroke() {
  pendingMotionStroke = null;
}

function startSelectedArcRedraw() {
  const clip = state.selectedPathId ? selectedClipById(state.selectedPathId) : null;
  if (state.mode !== "motion" || !clip?.path?.length) return false;
  hideDrawOverHint();
  state.redrawingPathId = clip.id;
  state.redrawReferencePath = structuredClone(clip.path);
  state.selectedPathId = clip.id;
  state.selectedPart = clip.part;
  state.activePathIdByPart[clip.part] = clip.id;
  state.isDrawing = false;
  state.drawingPathId = null;
  state.motionTether = null;
  render();
  saveState();
  return true;
}

function cancelArcRedraw() {
  const clip = selectedClipById(state.redrawingPathId);
  if (clip && state.redrawReferencePath?.length >= 2) {
    clip.path = structuredClone(state.redrawReferencePath);
  }
  state.isDrawing = false;
  state.drawingPathId = null;
  state.redrawingPathId = null;
  state.redrawReferencePath = null;
  state.motionTether = null;
}

function play() {
  syncFrameCount();
  renderTimeline();
  renderState();
  if (state.totalFrames <= 1) return;
  if (state.isPlaying) {
    state.isPlaying = false;
    renderPlayButton();
    return;
  }
  const lastFrameIndex = state.totalFrames - 1;
  const pingPongPeriod = Math.max(1, lastFrameIndex * 2);
  const startFrame = state.playbackPingPong
    ? state.currentFrame
    : (state.currentFrame >= lastFrameIndex ? 0 : state.currentFrame);
  const startPosition = startFrame;
  setFrame(startFrame);
  state.isPlaying = true;
  renderPlayButton();
  const start = performance.now();
  const frameDuration = 1000 / state.frameRate;
  let lastFrame = -1;

  function frame(now) {
    const elapsedFrames = Math.floor((now - start) / frameDuration);
    const rawPosition = startPosition + elapsedFrames;
    const didPassEnd = state.playbackPingPong ? rawPosition >= pingPongPeriod : rawPosition >= lastFrameIndex;
    const loopedPosition = state.playbackPingPong
      ? rawPosition % pingPongPeriod
      : rawPosition % state.totalFrames;
    const clampedPosition = state.playbackLoop ? loopedPosition : rawPosition;
    const nextFrame = state.playbackPingPong
      ? lastFrameIndex - Math.abs(lastFrameIndex - clamp(clampedPosition, 0, pingPongPeriod))
      : clamp(clampedPosition, 0, lastFrameIndex);
    if (nextFrame !== lastFrame) {
      setFrame(nextFrame);
      lastFrame = nextFrame;
    }
    if (state.isPlaying && (state.playbackLoop || !didPassEnd)) {
      requestAnimationFrame(frame);
    } else {
      state.isPlaying = false;
      setFrame(state.playbackPingPong ? 0 : lastFrameIndex);
      renderState();
      saveState();
    }
  }

  requestAnimationFrame(frame);
}

function applyTimingValue(marker, value) {
  const motion = currentMotionSettings();
  const nextMotion = structuredClone(motion);
  if (marker === "anticipation") {
    nextMotion.anticipationTime = Math.max(0, Math.min(0.35, 1 - motion.overshootTime - 0.05, value));
  } else {
    nextMotion.overshootTime = Math.max(0, Math.min(0.35, 1 - motion.anticipationTime - 0.05, value));
  }
  setCurrentMotionSettings(nextMotion);
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
  recordHistory();
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
  recordHistory();
  const motion = currentMotionSettings();
  if (marker === "anticipation") {
    applyTimingValue("anticipation", motion.anticipationTime + direction * 0.01);
  } else {
    applyTimingValue("overshoot", motion.overshootTime + direction * 0.01);
  }
}

stage.addEventListener("pointerdown", (event) => {
  if (state.isPanningFrame) {
    startFramePan(event);
    return;
  }
  if (!canDrawAtTarget(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  startPendingMotionStroke(event);
}, true);

stage.addEventListener("pointermove", (event) => {
  updateStageCursor(event);
  if (pendingMotionStroke && !state.isDrawing) {
    const point = stagePoint(event);
    if (distance(pendingMotionStroke.startPoint, point) > 4) {
      beginMotionStroke(event);
    }
  }
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
  if (!state.isDrawing) stage.classList.remove("is-drawing");
  motionCursorPoint = null;
  renderMotionGuideLine();
});

stage.addEventListener("pointerup", () => {
  const pendingTargetNode = pendingMotionStroke?.targetNode;
  const completedStroke = state.isDrawing;
  clearPendingMotionStroke();
  if (!completedStroke) {
    if (pendingTargetNode && partLabels[pendingTargetNode]) {
      state.selectedPart = pendingTargetNode;
      state.selectedPathId = null;
      state.hoveredPathId = null;
      state.motionTether = null;
      render();
      saveState();
    }
    return;
  }
  state.isDrawing = false;
  state.drawingPathId = null;
  state.redrawingPathId = null;
  state.redrawReferencePath = null;
  state.motionTether = null;
  state.selectedPart = null;
  stage.classList.remove("is-drawing");
  stage.classList.remove("pen-ready");
  render();
  saveState();
});

stage.addEventListener("wheel", (event) => {
  if (state.isDrawing) return;
  event.preventDefault();
  if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    panEditorCamera(event.deltaX, event.deltaY);
    return;
  }
  const delta = stageZoomDelta(event);
  const nextZoom = state.camera.zoom * Math.exp(delta * -0.0032);
  zoomCameraAt(event.clientX, event.clientY, nextZoom);
}, { passive: false });

stage.addEventListener("gesturestart", (event) => {
  event.preventDefault();
  const rect = stage.getBoundingClientRect();
  stageGestureStart = {
    zoom: state.camera.zoom,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  };
});

stage.addEventListener("gesturechange", (event) => {
  if (!stageGestureStart) return;
  event.preventDefault();
  zoomCameraAt(
    stageGestureStart.clientX,
    stageGestureStart.clientY,
    stageGestureStart.zoom * (event.scale || 1),
  );
});

stage.addEventListener("gestureend", () => {
  stageGestureStart = null;
});

panButton.addEventListener("click", () => {
  state.isPanningFrame = !state.isPanningFrame;
  if (state.isPanningFrame && !state.shotCamera) {
    state.shotCamera = normalizedCamera(state.camera);
  }
  state.isDrawing = false;
  state.motionTether = null;
  state.redrawingPathId = null;
  state.redrawReferencePath = null;
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
    const motion = currentMotionSettings();
    const point = handle === "a"
      ? { x: motion.easingBezier.x1, y: motion.easingBezier.y1 }
      : { x: motion.easingBezier.x2, y: motion.easingBezier.y2 };
    const step = event.shiftKey ? 0.05 : 0.01;
    if (event.key === "ArrowLeft") point.x -= step;
    else if (event.key === "ArrowRight") point.x += step;
    else if (event.key === "ArrowDown") point.y -= step;
    else if (event.key === "ArrowUp") point.y += step;
    else return;
    event.preventDefault();
    recordHistory();
    applyBezierHandle(handle, { x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) });
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode, { showHint: true }));
});

toolPaletteToggle?.addEventListener("click", () => {
  const isCompact = toolPalette?.classList.toggle("is-compact");
  toolPaletteToggle.setAttribute("aria-label", isCompact ? "Expand tool labels" : "Collapse tool labels");
  toolPaletteToggle.setAttribute("title", isCompact ? "Expand tools" : "Collapse tools");
});

[legInput, armInput].filter(Boolean).forEach((input) => {
  input.addEventListener("pointerdown", recordHistory);
  input.addEventListener("keydown", (event) => {
    if (event.key.startsWith("Arrow")) recordHistory();
  });
  input.addEventListener("input", () => {
    state.layout = {
      ...state.layout,
      legs: Number(legInput.value),
      arms: Number(armInput.value),
    };
    applyLayoutProportions();
    render();
    saveState();
  });
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
  const motion = currentMotionSettings();
  const overshootProgress = 1 - motion.overshootTime;
  const marker = Math.abs(raw - motion.anticipationTime) <= Math.abs(raw - overshootProgress) ? "anticipation" : "overshoot";
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
  recordHistory();
  state.character = event.target.value;
  render();
  saveState();
});

function syncNewBaseForm() {
  newBaseNameInput.value = state.customBaseName ?? "New model";
  newBaseHeightInput.value = String(state.layout.height);
  newBaseBuildInput.value = String(state.layout.build);
  newBaseLegInput.value = String(state.layout.legs);
  newBaseArmInput.value = String(state.layout.arms);
  renderFigurePreview();
}

function closeNewBaseModal() {
  newBaseModal.close();
}

newBaseButton.addEventListener("click", () => {
  syncNewBaseForm();
  newBaseModal.showModal();
  newBaseNameInput.focus();
  newBaseNameInput.select();
});

closeNewBaseButton.addEventListener("click", closeNewBaseModal);
cancelNewBaseButton.addEventListener("click", closeNewBaseModal);

[newBaseHeightInput, newBaseBuildInput, newBaseLegInput, newBaseArmInput].forEach((input) => {
  input.addEventListener("input", renderFigurePreview);
});

newBaseModal.addEventListener("click", (event) => {
  if (event.target === newBaseModal) closeNewBaseModal();
});

newBaseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  recordHistory();
  state.customBaseName = newBaseNameInput.value.trim() || "New model";
  state.character = "customBase";
  state.layout = {
    height: Number(newBaseHeightInput.value),
    build: Number(newBaseBuildInput.value),
    legs: Number(newBaseLegInput.value),
    arms: Number(newBaseArmInput.value),
  };
  applyLayoutProportions();
  syncControls();
  closeNewBaseModal();
  render();
  saveState();
});

function setKeyframeTimingDragMode(mode) {
  if (!keyframeTimingBar) return;
  keyframeTimingBar.classList.toggle("is-hold-active", mode === "hold");
  keyframeTimingBar.classList.toggle("is-duration-active", mode === "duration");
}

function keyframeTimingMetrics() {
  const anchors = orderedAnchors();
  const anchor = anchors.find(({ anchorIndex }) => anchorIndex === state.selectedAnchorIndex);
  const durationFrames = anchor ? anchorDurationsFrames(anchor.durationMs) : anchorDurationsFrames(state.duration);
  const holdFrames = anchorHoldFrames(anchor);
  return {
    durationFrames,
    holdFrames,
    maxFrames: maxKeyframeDurationFrames(),
  };
}

function frameFromKeyframeTimingPointer(event) {
  const rect = keyframeTimingBar.getBoundingClientRect();
  const progress = clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  return Math.round(progress * maxKeyframeDurationFrames());
}

function applyKeyframeTimingHandle(handle, frame) {
  if (handle === "hold") {
    setSelectedAnchorHoldFrames(frame);
  } else {
    setSelectedAnchorDurationFrames(frame);
  }
  setFrame(state.currentFrame, true);
  syncKeyframeHoldInput();
}

function startKeyframeTimingDrag(event) {
  if (!keyframeTimingBar || keyframeSettingsPanel?.hidden) return;
  event.preventDefault();
  if (!keyframeTimingBar.dataset.historyStarted) {
    recordHistory();
    keyframeTimingBar.dataset.historyStarted = "true";
  }
  const frame = frameFromKeyframeTimingPointer(event);
  const { durationFrames, holdFrames } = keyframeTimingMetrics();
  const handle = Math.abs(frame - holdFrames) < Math.abs(frame - durationFrames) ? "hold" : "duration";
  setKeyframeTimingDragMode(handle);
  applyKeyframeTimingHandle(handle, frame);
  const move = (moveEvent) => applyKeyframeTimingHandle(handle, frameFromKeyframeTimingPointer(moveEvent));
  const finish = () => {
    delete keyframeTimingBar.dataset.historyStarted;
    setKeyframeTimingDragMode(null);
    saveState();
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", finish, { once: true });
}

keyframeTimingBar?.addEventListener("pointerdown", startKeyframeTimingDrag);

durationInput.addEventListener("pointerdown", () => setKeyframeTimingDragMode("duration"));
durationInput.addEventListener("focus", () => setKeyframeTimingDragMode("duration"));
durationInput.addEventListener("blur", () => setKeyframeTimingDragMode(null));

durationInput.addEventListener("input", (event) => {
  if (!durationInput.dataset.historyStarted) {
    recordHistory();
    durationInput.dataset.historyStarted = "true";
  }
  setSelectedAnchorDurationFrames(Number(event.target.value));
  setFrame(state.currentFrame, true);
  syncKeyframeHoldInput();
});

frameRateSelect.addEventListener("change", (event) => {
  recordHistory();
  state.frameRate = Number(event.target.value);
  syncFrameCount();
  setFrame(state.currentFrame, true);
  renderPath();
  saveState();
});

durationInput.addEventListener("change", () => {
  delete durationInput.dataset.historyStarted;
  setKeyframeTimingDragMode(null);
  syncKeyframeHoldInput();
  saveState();
});

if (keyframeHoldInput) {
  keyframeHoldInput.addEventListener("pointerdown", () => setKeyframeTimingDragMode("hold"));
  keyframeHoldInput.addEventListener("focus", () => setKeyframeTimingDragMode("hold"));
  keyframeHoldInput.addEventListener("blur", () => setKeyframeTimingDragMode(null));

  keyframeHoldInput.addEventListener("input", (event) => {
    if (!keyframeHoldInput.dataset.historyStarted) {
      recordHistory();
      keyframeHoldInput.dataset.historyStarted = "true";
    }
    setSelectedAnchorHoldFrames(Number(event.target.value));
    setFrame(state.currentFrame, true);
    syncKeyframeHoldInput();
  });

  keyframeHoldInput.addEventListener("change", () => {
    delete keyframeHoldInput.dataset.historyStarted;
    setKeyframeTimingDragMode(null);
    syncKeyframeHoldInput();
    saveState();
  });
}

deleteKeyframeButton?.addEventListener("click", deleteSelectedAnchorKeyframe);

arcTimingBar?.addEventListener("pointerdown", (event) => startArcTimingDrag(event));
arcTimingDelayHandle?.addEventListener("pointerdown", (event) => startArcTimingDrag(event, "delay"));
arcTimingEndHandle?.addEventListener("pointerdown", (event) => startArcTimingDrag(event, "end"));

[
  [arcTimingDelayHandle, "delay"],
  [arcTimingEndHandle, "end"],
].forEach(([handleNode, handle]) => {
  handleNode?.addEventListener("keydown", (event) => {
    const delta = event.key === "ArrowLeft" || event.key === "ArrowDown"
      ? -1
      : event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : 0;
    if (!delta) return;
    event.preventDefault();
    nudgeArcTimingHandle(handle, delta);
  });
});

if (arcDurationInput) {
  arcDurationInput.addEventListener("pointerdown", () => {
    if (!arcDurationInput.dataset.historyStarted) {
      recordHistory();
      arcDurationInput.dataset.historyStarted = "true";
    }
  });

  arcDurationInput.addEventListener("input", (event) => {
    if (!arcDurationInput.dataset.historyStarted) {
      recordHistory();
      arcDurationInput.dataset.historyStarted = "true";
    }
    setSelectedPathDurationFrames(Number(event.target.value));
    syncArcDurationInput();
  });

  arcDurationInput.addEventListener("change", () => {
    delete arcDurationInput.dataset.historyStarted;
    syncArcDurationInput();
  });

  arcDurationInput.addEventListener("blur", () => {
    delete arcDurationInput.dataset.historyStarted;
    syncArcDurationInput();
  });
}

if (motionPathDelayInput) {
  const startMotionPathDelayEdit = () => {
    if (!motionPathDelayInput.dataset.historyStarted) {
      recordHistory();
      motionPathDelayInput.dataset.historyStarted = "true";
    }
  };

  motionPathDelayInput.addEventListener("pointerdown", startMotionPathDelayEdit);
  motionPathDelayInput.addEventListener("focus", startMotionPathDelayEdit);

  motionPathDelayInput.addEventListener("input", () => {
    if (!motionPathDelayInput.value) return;
    setSelectedPathDelayFrames(Number(motionPathDelayInput.value));
    syncMotionPathDelayFrameReadoutFromInput();
  });

  motionPathDelayInput.addEventListener("change", () => {
    setSelectedPathDelayFrames(Number(motionPathDelayInput.value || 0));
    syncMotionPathDelayInput();
    delete motionPathDelayInput.dataset.historyStarted;
  });

  motionPathDelayInput.addEventListener("blur", () => {
    syncMotionPathDelayInput();
    delete motionPathDelayInput.dataset.historyStarted;
  });
}

openSaveAnimationModalButton?.addEventListener("click", openSaveAnimationModal);

openLoadAnimationModalButton?.addEventListener("click", openLoadAnimationModal);

saveAnimationForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveNamedAnimation();
});

closeSaveAnimationButton?.addEventListener("click", () => saveAnimationModal?.close());

cancelSaveAnimationButton?.addEventListener("click", () => saveAnimationModal?.close());

loadAnimationForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  loadNamedAnimation();
});

closeLoadAnimationButton?.addEventListener("click", () => loadAnimationModal?.close());

cancelLoadAnimationButton?.addEventListener("click", () => loadAnimationModal?.close());

animationFileInput?.addEventListener("change", () => {
  setLoadAnimationStatus(animationFileInput.files?.[0]?.name ?? "");
});

timelineTrack.addEventListener("wheel", (event) => {
  if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
  event.preventDefault();
  zoomTimelineCels(event.deltaY);
}, { passive: false });

document.addEventListener("wheel", (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
}, { passive: false });

["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
  document.addEventListener(eventName, (event) => {
    if (event.target?.closest?.("#stage")) return;
    event.preventDefault();
  }, { passive: false });
});

timelineTrack.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch") return;
  timelineTrack.setPointerCapture(event.pointerId);
  if (!timelinePinch) {
    timelinePinch = { points: new Map(), startDistance: 0, startScale: state.timelineCellScale };
  }
  timelinePinch.points.set(event.pointerId, event);
  if (timelinePinch.points.size === 2) {
    timelinePinch.startDistance = timelinePointerDistance([...timelinePinch.points.values()]);
    timelinePinch.startScale = state.timelineCellScale;
  }
});

timelineTrack.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "touch") return;
  updateTimelineTouchPinch(event);
});

["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
  timelineTrack.addEventListener(eventName, (event) => {
    if (!timelinePinch) return;
    timelinePinch.points.delete(event.pointerId);
    if (timelinePinch.points.size < 2) timelinePinch = null;
  });
});

playButton.addEventListener("click", play);

reverseButton.addEventListener("click", () => {
  recordHistory();
  state.playbackPingPong = !state.playbackPingPong;
  renderPlayButton();
  saveState();
});

loopButton.addEventListener("click", () => {
  recordHistory();
  state.playbackLoop = !state.playbackLoop;
  renderPlayButton();
  saveState();
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const interactive = target.closest?.("input, select, textarea, button, [role='slider']");
  const textEntry = target.closest?.("input, select, textarea");
  const normalizedKey = event.key.toLowerCase();
  const isBrowserZoomShortcut = (event.metaKey || event.ctrlKey)
    && ["+", "=", "-", "_", "0"].includes(normalizedKey);
  if (isBrowserZoomShortcut) {
    event.preventDefault();
    return;
  }
  const isUndoRedo = (event.metaKey || event.ctrlKey) && normalizedKey === "z";
  if (isUndoRedo) {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    recordHistory();
    if (state.redrawingPathId) {
      cancelArcRedraw();
    } else {
      state.isDrawing = false;
    }
    state.isPlaying = false;
    state.isPanningFrame = false;
    state.drawingPathId = null;
    state.selectedPart = null;
    state.selectedPathId = null;
    state.hoveredPathId = null;
    state.motionTether = null;
    state.redrawingPathId = null;
    state.redrawReferencePath = null;
    stage.classList.remove("pen-ready", "is-drawing");
    render();
    saveState();
    return;
  }
  if (state.isPanningFrame && event.key === "Enter" && !interactive) {
    event.preventDefault();
    finishPanFrame();
    return;
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (state.mode === "motion" && !interactive && getDeletableMotionPathId()) {
      event.preventDefault();
      deleteSelectedMotionPath();
      return;
    }
  }
  if (normalizedKey === "d" && !textEntry) {
    if (startSelectedArcRedraw()) {
      event.preventDefault();
      return;
    }
  }
  if ((normalizedKey === "m" || normalizedKey === "l") && !textEntry) {
    event.preventDefault();
    setMode(normalizedKey === "m" ? "motion" : "layout", { showHint: true });
    return;
  }
  if ((event.key === "," || event.key === ".") && !interactive) {
    event.preventDefault();
    state.isPlaying = false;
    if (event.key === ",") {
      setFrame(Math.max(0, state.currentFrame - 1), true);
    } else {
      setFrame(Math.min(state.totalFrames - 1, state.currentFrame + 1), true);
    }
    return;
  }
  if (!["Space", "Slash"].includes(event.code) || interactive) return;
  event.preventDefault();
  play();
});

resetPoseButton.addEventListener("click", () => {
  recordHistory();
  state.isPlaying = false;
  state.currentFrame = 0;
  state.drawingPathId = null;
  state.redrawingPathId = null;
  state.redrawReferencePath = null;
  state.selectedPathId = null;
  state.hoveredPathId = null;
  state.motionTether = null;
  state.layout = structuredClone(defaultLayout);
  state.shape = structuredClone(defaultShape);
  state.polygonEdits = structuredClone(defaultPolygonEdits);
  state.base = normalizeTorsoNodes(structuredClone(defaultBase));
  state.pose = normalizeTorsoNodes(structuredClone(state.base));
  state.camera = structuredClone(defaultCamera);
  state.shotCamera = structuredClone(defaultCamera);
  state.isPanningFrame = false;
  syncControls();
  render();
  saveState();
});

clearMotionButton.addEventListener("click", () => {
  recordHistory();
  state.isPlaying = false;
  state.currentFrame = 0;
  state.motionPaths = {};
  state.activePathIdByPart = {};
  state.suppressedGeneratedMotionPaths = {};
  state.selectedAnchorIndex = 0;
  state.keyframes = normalizeKeyframeStore({});
  state.drawingPathId = null;
  state.redrawingPathId = null;
  state.redrawReferencePath = null;
  state.selectedPathId = null;
  state.hoveredPathId = null;
  state.motionTether = null;
  state.pose = normalizeTorsoNodes(structuredClone(state.base));
  state.isPanningFrame = false;
  syncFrameCount();
  render();
  saveState();
});

function isIdeateOpen() {
  return ideatePopover && !ideatePopover.hidden;
}

function setIdeateOpen(open) {
  if (!ideatePopover || !ideateToggle) return;
  ideatePopover.hidden = !open;
  ideateToggle.setAttribute("aria-expanded", String(open));
  if (open) ideateInput?.focus();
}

// AI hook: this is where the prompt gets wired up to the model. For now it just
// surfaces the idea text; replace the body with the real ideate call.
function runIdeate(idea) {
  const text = idea.trim();
  if (!text) {
    ideateInput?.focus();
    return;
  }
  console.log("[ideate] prompt:", text);
}

if (ideateToggle && ideatePopover) {
  ideateToggle.addEventListener("click", () => setIdeateOpen(!isIdeateOpen()));

  ideateSubmit?.addEventListener("click", () => runIdeate(ideateInput?.value ?? ""));

  ideateInput?.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      runIdeate(ideateInput.value);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isIdeateOpen()) {
      setIdeateOpen(false);
      ideateToggle.focus();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (isIdeateOpen() && !ideateDock?.contains(event.target)) setIdeateOpen(false);
  });
}

const SIDE_PANEL_MIN = 200;
const SIDE_PANEL_MAX = 520;
const SIDE_PANEL_DEFAULT = 360;
const SIDE_PANEL_STORAGE_KEY = "motiondirector.sidePanelWidth";

function clampSidePanelWidth(width) {
  return Math.round(Math.min(SIDE_PANEL_MAX, Math.max(SIDE_PANEL_MIN, width)));
}

function setSidePanelWidth(width, { persist = true } = {}) {
  if (!appShell) return;
  const clamped = clampSidePanelWidth(width);
  appShell.style.setProperty("--side-width", `${clamped}px`);
  if (persist) {
    try {
      localStorage.setItem(SIDE_PANEL_STORAGE_KEY, String(clamped));
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }
}

function loadSidePanelWidth() {
  let stored = null;
  try {
    stored = localStorage.getItem(SIDE_PANEL_STORAGE_KEY);
  } catch {
    stored = null;
  }
  const width = stored == null ? SIDE_PANEL_DEFAULT : Number(stored);
  setSidePanelWidth(Number.isFinite(width) ? width : SIDE_PANEL_DEFAULT, { persist: false });
}

if (sidePanelResizer && appShell) {
  let resizePointerId = null;

  const onResizeMove = (event) => {
    if (event.pointerId !== resizePointerId) return;
    setSidePanelWidth(event.clientX - appShell.getBoundingClientRect().left, { persist: false });
    renderTimeline();
    renderCamera();
    renderMotionGuideLine();
  };

  const endResize = (event) => {
    if (resizePointerId == null || event.pointerId !== resizePointerId) return;
    sidePanelResizer.releasePointerCapture?.(resizePointerId);
    resizePointerId = null;
    sidePanelResizer.classList.remove("is-dragging");
    document.body.classList.remove("is-resizing-side");
    const current = parseFloat(getComputedStyle(appShell).getPropertyValue("--side-width"));
    if (Number.isFinite(current)) setSidePanelWidth(current);
  };

  sidePanelResizer.addEventListener("pointerdown", (event) => {
    resizePointerId = event.pointerId;
    sidePanelResizer.setPointerCapture?.(event.pointerId);
    sidePanelResizer.classList.add("is-dragging");
    document.body.classList.add("is-resizing-side");
    event.preventDefault();
  });
  sidePanelResizer.addEventListener("pointermove", onResizeMove);
  sidePanelResizer.addEventListener("pointerup", endResize);
  sidePanelResizer.addEventListener("pointercancel", endResize);

  sidePanelResizer.addEventListener("dblclick", () => {
    setSidePanelWidth(SIDE_PANEL_DEFAULT);
    renderTimeline();
    renderCamera();
    renderMotionGuideLine();
  });

  sidePanelResizer.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 32 : 12;
    const current = parseFloat(getComputedStyle(appShell).getPropertyValue("--side-width")) || SIDE_PANEL_DEFAULT;
    if (event.key === "ArrowLeft") {
      setSidePanelWidth(current - step);
    } else if (event.key === "ArrowRight") {
      setSidePanelWidth(current + step);
    } else {
      return;
    }
    event.preventDefault();
    renderTimeline();
    renderCamera();
    renderMotionGuideLine();
  });
}

window.addEventListener("resize", () => {
  renderTimeline();
  renderCamera();
  renderMotionGuideLine();
});

loadSidePanelWidth();
loadSavedState();
syncFrameCount();
syncControls();
state.pose = poseForFrame(state.currentFrame);
render();

// TEMP-DEBUG: verification hook for the auto-interpolation check. REMOVE before commit.
window.__md = { state, poseForFrame, buildAnchorTimeline, resolveAnchorPose,
  incomingPoseForAnchor, poseDistanceAcrossNodes, activeMotionPathsForSegment, defaultBase,
  pathProgressForTime, timingBounds, phaseDurations, pointAlong, clipProgressForFrame,
  motionSettingsForSegment, motionSettingsForClip, clipMotionTimingWindow,
  anchorSegmentForFrame, segmentHoldEndFrame, frameIsInsideSegmentHold };
