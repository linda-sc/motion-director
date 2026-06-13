# Implement keyframe interpolation with backfill

> Workstream A: implementing auto-interpolation (layered backfill) between keyframes.

**Session:** `346fbad0-1014-4489-b4a2-210809b2bd71`  
**Model:** claude-opus-4-8  
**Window:** 2026-06-13T18:06:20.688Z → 2026-06-13T18:11:41.149Z  
**Turns:** 12 user · 24 assistant

---

### 🧑 User

Hey i want to work on some app features while my other thread is cooking up generative abilities. can we start by working on keyframe interpolation, where if a new keyframe is created, it immediately backfills the motion? first let me know if you need more context or if that makes sense

### 🤖 Claude

Let me get oriented in the codebase before I weigh in — I want to ground my answer in how keyframes and motion actually work here.

### 🤖 Claude

> 🔧 **Bash** — List tracked files and top-level dirs

> ↳ _result:_ README.md
docs/motion-director-working-notes.md
index.html
package.json
scripts/dev-server.mjs
src/app.js
src/motion-format.js
src/styles.css
---DIRS---
total 48
drwxr-xr-x@ 12 lindaawad  staff    384 Jun 13 10:49 .
drwxr-xr-x  13 lindaawad  staff    416 Jun 13 10:40 ..
drwxr-xr-x@  3 lindaawad  staff     96 Jun 13 10:49 .claude
drwxr-xr-x@ 12 lindaawad  staff    384 Jun 13 11:05 .git
-rw-r--r--@ …[truncated]

### 🤖 Claude

> 🔧 **Read** — /Users/lindaawad/VoidpetInc/MotionDirector/src/motion-format.js

> ↳ _result:_ 1	export const motionDirectorFormatVersion = 1;
2	
3	export function createMotionClip({ character, durationMs, frameRate, path, part, poses, timing, motionPaths = [] }) {
4	  return {
5	    format: "voidpet.motion-director.clip",
6	    version: motionDirectorFormatVersion,
7	    character,
8	    durationMs,
9	    frameRate,
10	    timing,
11	    part,
12	    path: path.map(toPoint),
13	    motionP …[truncated]

### 🤖 Claude

> 🔧 **Read** — /Users/lindaawad/VoidpetInc/MotionDirector/docs/motion-director-working-notes.md

> ↳ _result:_ 1	# Motion Director Working Notes
2	
3	Last updated: 2026-06-12
4	
5	## Current Prototype
6	
7	- The app now has two top-level modes: Layout and Motion.
8	- Layout mode is the setup/keyframe area; avoid the word "rig" in product language.
9	- Polyman is the default base character, with much longer stylized anime legs; MVP is preserved as an alternate base.
10	- Body parts are selected directly by …[truncated]

### 🤖 Claude

Now let me look at the main app logic, especially how keyframes and interpolation currently work.

### 🤖 Claude

> 🔧 **Bash** — Size and grep key terms in app.js

> ↳ _result:_     5088 /Users/lindaawad/VoidpetInc/MotionDirector/src/app.js
---
9:const keyframeDurationMaxMs = 8000;
64:  frameRate: 12,
65:  totalFrames: 14,
92:  keyframes: {},
93:  selectedAnchorIndex: 0,
348:const keyframeSettingsPanel = document.querySelector("#keyframeSettingsPanel");
379:const motionPathDelayFrames = document.querySelector("#motionPathDelayFrames");
382:const deleteKeyframeButton = doc …[truncated]

### 🤖 Claude

Let me see how poses are computed/interpolated and how a keyframe gets created.

### 🤖 Claude

> 🔧 **Bash** — Find pose/interpolation/keyframe functions

> ↳ _result:_ 523:function normalizeTorsoNodes(pose) {
537:function isPoseLike(value) {
1224:function setAnchorPose(anchorIndex, pose) {
1238:function setCurrentAnchorPose(pose) {
1336:function syncLayoutGeneratedMotionPath(part, nextPose) {
2344:function syncTorsoAlias(pose) {
2348:function applyResponseProfile(pose, base, part, target, lockedParts = new Set()) {
2394:function connectedPose(part, target, sourc …[truncated]

### 🤖 Claude

> 🔧 **Read** — /Users/lindaawad/VoidpetInc/MotionDirector/src/app.js

> ↳ _result:_ 3210	function poseForFrame(frameIndex) {
3211	  const timeline = buildAnchorTimeline();
3212	  const segment = anchorSegmentForFrame(frameIndex, timeline);
3213	  const anchor = timeline.anchors.find((entry) => entry.anchorIndex === segment.anchorIndex);
3214	  let pose = resolveAnchorPose(anchor, timeline);
3215	  if (frameIsInsideSegmentHold(frameIndex, segment, timeline)) {
3216	    return pose …[truncated]

### 🤖 Claude

Let me read the keyframe-creation flow and the generated-arc mechanism, since that seems central to the request.

### 🤖 Claude

> 🔧 **Read** — /Users/lindaawad/VoidpetInc/MotionDirector/src/app.js

> ↳ _result:_ 1224	function setAnchorPose(anchorIndex, pose) {
1225	  const anchors = orderedAnchors();
1226	  if (!anchors.length) return;
1227	  const normalizedPose = normalizeTorsoNodes(structuredClone(pose));
1228	  state.keyframes = Object.fromEntries(
1229	    anchors.map((anchor) => [anchor.anchorIndex, {
1230	      pose: anchor.anchorIndex === anchorIndex ? normalizedPose : anchor.pose,
1231	      dura …[truncated]

### 🤖 Claude

> 🔧 **Read** — /Users/lindaawad/VoidpetInc/MotionDirector/src/app.js

> ↳ _result:_ 1343	  if (isLayoutGeneratedMotionSuppressed(part, previousAnchor.anchorIndex)) return;
1344	  const previousPose = resolveAnchorPose(previousAnchor, timeline);
1345	  const start = previousPose?.[part];
1346	  const end = nextPose?.[part];
1347	  if (!start || !end || distance(start, end) < 1) return;
1348	
1349	  const previousSegmentIndex = current.anchorOrder - 1;
1350	  const clips = state.mo …[truncated]

### 🤖 Claude

Now let me find where a keyframe actually gets created (the add/mark keyframe action) and how `ensureGeneratedMotionPathsForDirectedKeyframes` / `adopt...` get called.

### 🤖 Claude

> 🔧 **Bash** — Find keyframe creation call sites

> ↳ _result:_ 1380:function ensureGeneratedMotionPathsForDirectedKeyframes() {
1481:function addAnchorKeyframe() {
1863:    adoptIncomingMotionPosesForKeyframes();
2048:  adoptIncomingMotionPosesForKeyframes();
2126:  ensureGeneratedMotionPathsForDirectedKeyframes();
3257:function adoptIncomingMotionPosesForKeyframes(anchorIndexes = new Set()) {
3447:  addFrameButton.setAttribute("aria-label", "Add new keyframe …[truncated]

### 🤖 Claude

> 🔧 **Read** — /Users/lindaawad/VoidpetInc/MotionDirector/src/app.js

> ↳ _result:_ 1481	function addAnchorKeyframe() {
1482	  const anchors = orderedAnchors();
1483	  const nextIndex = anchors.length || 0;
1484	  const durationMs = 0;
1485	  const timeline = buildAnchorTimeline();
1486	  const previousAnchor = timeline.anchors[timeline.anchors.length - 1];
1487	  const previousPose = previousAnchor ? incomingPoseForAnchor(previousAnchor, timeline) : state.pose;
1488	  const base …[truncated]

### 🤖 Claude

I read through the motion model — `src/app.js`, `src/motion-format.js`, and the working notes. It makes sense, and I have enough to engage. Let me reflect back what I found so we're aligned, then nail down two forks before I touch anything.

## How motion is filled today

The thing that surprised me: **there is no direct pose-to-pose interpolation between keyframes.** In-between frames are driven *entirely* by motion arcs. [`poseForFrame`](src/app.js:3210) resolves the anchor's pose, then applies whatever motion clips are active in that segment. If a segment has no arc, the whole span just **holds the anchor pose and snaps** to the next one.

The backfill mechanism you're describing actually already exists in partial form — "generated arcs":
- [`syncLayoutGeneratedMotionPath`](src/app.js:1336) fires *while you edit a pose* in Layout mode. It draws a `layout-keyframe`-source arc from the previous anchor into the moved node, which then drives the in-betweens.
- [`ensureGeneratedMotionPathsForDirectedKeyframes`](src/app.js:1380) is a batch version, but it only runs on load ([app.js:2126](src/app.js:2126)).

## Why "create a keyframe → backfill" doesn't happen now

[`addAnchorKeyframe`](src/app.js:1481) **appends** a new anchor at the tail, **copies the previous pose verbatim**, and gives it **`durationMs: 0`**. So a freshly created keyframe is an identical twin of its predecessor with zero span between them — there's literally nothing to interpolate into yet. Backfill only becomes meaningful once you give it a duration *and* repose it.

So the gap between your request and the code is mostly about **trigger + method**. Two real forks:

### 🤖 Claude

> 🔧 **AskUserQuestion**

> ↳ _result:_ Your questions have been answered: "Where should a newly created keyframe land relative to the playhead? "Backfilling" needs a span behind the new keyframe to fill."="Insert at playhead", "How should the backfilled in-between frames be computed?"="Both / layered". You can now continue with these answers in mind.

