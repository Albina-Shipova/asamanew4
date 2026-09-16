# Belous screenshot correction — 2026-09-15

Local preview: http://127.0.0.1:4175/cases/?project=belous

## Restored behavior

`renderFrames`, `frameAtPoint`, hover handlers, orbit positions and scale factors
match the initial Git version. The only JavaScript difference is initializing
the requested project before the scene's first render, so the direct link stays
on Belous. The rejected change had moved each hovered target to the center,
making the pointer lose its target and repeatedly reset selection.

## Image pipeline

The live Belous page is captured at 1600 CSS px and DPR 2. Section bounds are
measured after fonts/reveal animations finish. Content sections exclude excess
outer padding, while retaining the complete content and 24px margins. The header
is hidden after frame 01. Exact crop coordinates are in `.capture-raw/belous/clips.json`.
Orbit WebP files preserve the raw PNG pixel dimensions and RGB values exactly.
No resize, fixed-aspect canvas fit, sharpening or lossy conversion is applied.
The focused visual is painted at four times its original small target size,
then reduced, preserving the original outer geometry and pointer targets.
Brightness/saturation filtering is removed from the selected visual.

## Verified

- All eight WebP images match their raw PNGs pixel for pixel (`verify-belous.py`).
- All eight captures visually reviewed in `.quality-check/all-belous.png`.
- Headless Chrome at 1440x900, 1024x768 and 390x844: every ring target remained
  selected through five small pointer movements after expansion; no hover resets.
- Keyboard arrows and next button advance the slide at all three sizes.
- A dispatched touch swipe advances the slide at 390x844.
- All eight images load at each size; no document horizontal overflow.
- Syntax check: `node --check cases/script.js` passes.
- The user's open local browser tab loads the new CSS and all eight native-size images.

Screenshots of the third and fifth expanded frames are in `.quality-check/`.
Small body copy still becomes physically small when a whole desktop section is
shown inside a roughly 620px frame; source resolution cannot make it full-size text.
The other eleven projects have not been recaptured in this correction.

## Direct rendering correction

A side-by-side Chrome capture of the same file at the same screen rectangle
confirmed additional text softening inside the perspective tree, even with the
4x backing visual. `sharp-preview.js` now paints the selected image in an
untransformed layer directly inside the orbit dialog. It follows the original
image's measured rectangle during the animation and has `pointer-events:none`.
The original buttons and hit tests are unchanged. The final badge is painted
once; its underlying transformed copy is hidden while the sharp layer is ready.
`check-belous.mjs` also checks layer visibility, matching image URL, alignment
within 0.1 CSS px and disabled pointer handling for every tested hover target.
