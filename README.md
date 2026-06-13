# Fable Motion Director

A prototype for specifying premium-blend 2D motion — directing 2D animation reference with an SVG mannequin.

Run it with:

```sh
npm run dev
```

Then open `http://127.0.0.1:8787`.

The dev server live-reloads the browser when local files change.

What this proves:

- A layered SVG puppet is a good first representation for selectable body parts and exportable director marks.
- A red drawn motion path can become a first-pass animation curve.
- A hand target can pull the elbow, shoulder, torso, and head with a tiny inverse-kinematics-style solver.
- Motion clips can be exported as plain JSON through `src/motion-format.js`, which keeps it compatible with a future `voidpet-poc/apps/mmo` integration.

What this deliberately does not solve yet:

- Parsing JPEG annotations.
- Production rigging.
- Multi-keyframe timelines.
- Export to studio handoff formats.
