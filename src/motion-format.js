export const motionDirectorFormatVersion = 1;

export function createMotionClip({ character, durationMs, frameRate, path, part, poses, timing, motionPaths = [] }) {
  return {
    format: "voidpet.motion-director.clip",
    version: motionDirectorFormatVersion,
    character,
    durationMs,
    frameRate,
    timing,
    part,
    path: path.map(toPoint),
    motionPaths: motionPaths.map((clip) => ({
      id: clip.id,
      part: clip.part,
      path: clip.path.map(toPoint),
      timing: clip.timing ?? timing,
    })),
    frames: poses.map((pose, index) => ({
      index,
      timeMs: Math.round((index / frameRate) * 1000),
      pose: toPose(pose),
    })),
  };
}

function toPoint(point) {
  return {
    x: round(point.x),
    y: round(point.y),
  };
}

function toPose(pose) {
  return Object.fromEntries(
    Object.entries(pose).map(([key, point]) => [key, toPoint(point)]),
  );
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
