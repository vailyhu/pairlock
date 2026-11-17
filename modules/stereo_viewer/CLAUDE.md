# stereo_viewer: put a cut stereo card back together

The two halves of a stereo card lie in a viewer; the right half sits shifted and must be slid back over the left one. When they line up, what is drawn in pieces on the two halves (digits, a word) reads clearly. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `target` stays on the server; the view holds both pictures and the current shift.
- `move`: `{dx, dy}` (absolute shift in shares, clamped to `range`). Within `tolerance` of `target` it snaps into place and is solved; use the panel's `keepAfterSolved` so the joined picture stays readable.
- The pictures carry the clue: the game builds them (the same photo on both, the right one shifted, the clue's strokes split between the two). Drag on the picture or use the two sliders (phones).
- Test: `node tools/test_stereo_viewer.js`.
