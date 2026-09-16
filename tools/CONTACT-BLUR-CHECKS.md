# Local portfolio contact blur

Scope: the nine visible projects other than `socvetie`, `touch`, `krasivaya`.
Hidden projects are not included. Only telephone numbers and physical-address
text are blurred. Labels, prices, registration numbers and other content stay.

The reviewed map covers 130 rectangles in 47 images: covers, thumbnails, long
previews, first slides and interior/footer slides. Windows OCR located candidate
text; manual rectangles cover missed small text, multiline addresses and signage.
The OCR audit and selected rectangles are in `tools/.contact-audit/`.

`cases/contact-blur.js` applies the reviewed rectangles when local HTML displays
an image. A native-size canvas produces a lossless PNG object URL. No resizing or
lossy recompression occurs, and original files remain available locally. This is
presentation blur, not deletion of the underlying contact data. External live
sites and external links are unchanged.

Both the homepage and case gallery load the mask script before their images.
The sharp active-image layer waits for masking to finish, so it does not bypass
the blur. Phone/address images stay hidden during processing. Existing frame
geometry, mouse events and keyboard navigation are not changed.

Verified with `node tools/check-belous.mjs --privacy`:

- All 47 masked outputs change pixels inside the reviewed rectangles.
- Every pixel outside those rectangles is unchanged.
- All twelve galleries load their images successfully.
- `socvetie`, `touch`, `krasivaya` have no masks or substituted image URLs.
- Detailed results: `.quality-check/contact-blur-checks.json`.
- Rendered masked samples: `.quality-check/blur-*.png`.

When recapturing any source screenshot, re-run the audit and review its rectangles;
coordinates refer to the current files, not to arbitrary future page layouts.
