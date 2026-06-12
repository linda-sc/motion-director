# Motion Director Working Notes

Last updated: 2026-06-12

## Current Prototype

- The app now has two top-level modes: Layout and Motion.
- Layout mode is the setup/keyframe area; avoid the word "rig" in product language.
- Polyman is the default base character, with much longer stylized anime legs; MVP is preserved as an alternate base.
- Body parts are selected directly by clicking the mannequin.
- Autonomous path-capable vertices are visible as node handles.
- Layout mode also shows amber polygon handles on the waist and limb midpoints for silhouette editing.
- The selected shape highlights in director red.
- The director draws red motion arcs on the canvas.
- Motion arc data persists in browser storage.
- Motion arcs are now stored per vertex/node as path stacks; the newest path for each node is active for playback, while older stored paths remain visible as reference lines.
- Timeline is bottom-mounted and plays one held frame at a time.
- Timeline thumbnails preview actual sampled poses.
- Spacebar toggles playback.
- FPS and base character controls live in the top-right toolbar for now, but should likely move into a settings modal later.
- Pan and zoom framing controls also live as small upper-right toolbar controls; pan is a temporary frame mode with an in-canvas camera badge and checkmark, or Enter to commit.
- The canvas grid is light and exists mainly for motion alignment.
- The mannequin stage background is transparent over the grid.
- Layout mode currently supports rough height, build, arm, and leg proportion controls.
- Polyman limbs render as editable hourglass-style polygons, with stable joint edges and independently draggable side points for perspective/silhouette changes.
- Limb polygon side points can slide along the limb and move independently outward/inward, so the shape can become asymmetric for foreshortening or sideways twists.
- Polyman torso uses paired rib/waist/hip vertices with a pointed pelvis tip; waist handles sit directly on the torso polygon vertices and can move independently.
- Layout mode also supports direct silhouette edits for waist, upper arms, forearms, thighs, and calves.
- Layout mode can save simple character presets and mark keyed poses in the timeline.
- Current limb polygon edits are preset-level handle values; a future step should let these polygon values be keyed over time per frame.

## Timing Model

- Anticipation and overshoot are path-boundary concepts, not beginner-friendly auto-polish.
- Anticipation diamond marks where the real action starts.
- The path before the anticipation diamond is the prep extreme.
- Overshoot diamond marks where the action settles.
- The path after the overshoot diamond, up to the red arrow tip, is the overshoot extreme.
- Anticipation and overshoot phases get cushioned frame windows so they do not snap.
- The main action spacing is controlled by a directly editable cubic-bezier curve.
- Export/readout stores the timing as `easing: "cubic-bezier"` and includes `easingBezier`.

## Connected Motion

- Hands have connected secondary motion through shoulders, elbows, torso, and head.
- Feet have connected secondary motion through hips, knees, torso, and head.
- Elbows, knees, shoulders, and hips are following decently as generated secondary motion.
- Current secondary motion is solver-generated and not directly editable yet.

## Next Direction: Editable Secondary Motion

The next useful step is to expose generated secondary motion paths and let the director edit them.

Suggested model:

1. Primary path:
   - The director draws the main red arc for an extremity, such as right hand or right foot.

2. Generated secondary paths:
   - The app computes follow paths for connected vertices.
   - For hands: shoulder, elbow, torso/head hints.
   - For feet: hip, knee, torso/head hints.

3. Visible secondary paths:
   - When the director clicks a shoulder, elbow, hip, or knee vertex, show its generated path.
   - The secondary path should probably be thinner and visually distinct from the primary red director path.
   - Avoid showing all secondary paths at once by default, or the canvas will become visually noisy.

4. Editable override:
   - The director can drag or redraw the visible secondary path.
   - Once edited, that vertex becomes director-authored instead of solver-only.
   - The system should preserve the generated path as a fallback or reference.

5. Path stacking:
- Each vertex/extremity now remembers its own motion path stack.
   - This allows stacking multiple authored paths over time.
   - Playback should sample authored paths first, then solve/blend missing connected vertices.

## Open Questions

- Should secondary paths be auto-generated first, then editable?
- When a secondary path is edited, does it fully override the solver or blend with it?
- Do secondary paths belong to vertices, bones, or named body parts?
- Every vertex can now have its own path stack, but conflict/priority rules still need refinement.
- How do we show multiple active paths without turning the canvas into spaghetti?
- What are the priority rules when paths conflict?
- Should director edits be stored as intent paths rather than final pose positions?
- Should onion-skin or ghost poses show primary and secondary vertices differently?
- Should the timeline eventually show separate lanes for authored vertices?

## Near-Term Implementation Notes

- Per-vertex path store exists as `motionPaths`; newest path per node is active for playback.
- Keep `selectedPart`, now expanded to include vertices such as `rightElbow`, `rightShoulder`, `rightKnee`, and `rightHip`.
- Store whether a path is `generated` or `authored`.
- Show the selected active path in director red and all other stored paths as faint reference lines.
- Preserve the current red primary path language for director-authored extremity arcs.
- Use a distinct secondary color for generated/editable follow paths.
- Playback should resolve poses from authored paths, then generated paths, then IK fallback.
- Deepen Layout mode so saved presets include polished polygon proportions, not only skeleton handle positions.
- Expand shape handles into more explicit per-side controls if we want asymmetrical body shapes.
- Deepen keyframes so keyed poses affect interpolation/playback, not only timeline marking.
