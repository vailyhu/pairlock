# scratch_reveal: scrape a layer off

The top picture covers the bottom one; scraping with the pointer or a finger uncovers it. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `top` and `bottom` must have the same aspect; `cols` × `rows` should match it (64 × 48 for 4:3) so the brush is round.
- `move`: `{points, live: true}` while scraping (shared with the partner, not written to disk), `{points}` on release. Points are shares of the image size, at most 400 per move.
- The server keeps the mask (one character per cell, `"1"` uncovered) and saves it; the client erases at once and redraws from the mask on every view.
- Solved on release when the uncovered share reaches `need` (default 0.7).
- What is needed first (solvent, scalpel, the picture on the easel) is the game's business: `panelAvail` or `closed`, not this module.
