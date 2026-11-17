# roulette: a rigged wheel, control below, wheel above

A tampered roulette: one side sets a hidden control, the other spins the wheel. Neither sees the other's half, so they must talk. Built for Szezonzárás (2026-11-17); generic (any "rigged machine with a remote control"). Shared contract: `../CLAUDE.md`.

- Two-sided: usually `sides: {a: {at: '<control room>'}, b: {at: '<wheel room>'}}`. `a`: SECTOR switch (labels from `sectors`), FINE dial (1..`fineMax`), MAGNET lever; never the results. `b`: the drawn wheel (SVG, from `pockets`), a SPIN button, a short animation, the last 8 results; never the control. Alone with places the player reaches each half only standing there, so they walk up and down; alone without places (`side: "both"`) one sees both.
- `options`: see `types.ts`. `pockets` (`{n, color: 'green'|'red'|'black'}` in wheel order), `sectors` (`{label, pockets: [n, …]}`), `target` (server only), `fineMax` (default: the longest sector), `spinText` (`{n}`, `{color}` with `colorNames`), `doneText`, `notMagnetText`, `labels: {sector, fine, magnet, spin}`, `background` (side a's picture), `awayText`, `spinMs` (animation, default 2500).
- `move`: side a `{sector: index}`, `{fine: 1..fineMax}`, `{magnet: bool}`; side b `{spin: true}`. Moves from the wrong side are ignored.
- Spin: with the magnet on, the ball lands in `sectors[sector].pockets[fine - 1]`; if the dial points past that sector the magnet holds nothing and the spin is random, as without the magnet. Solved when a magnet spin lands on `target` (`spinText` + `doneText`; the panel stays open on the winning spin through `keep`). A random spin may hit the target by luck: it does not count and `notMagnetText` is added. Not `bad` either way.
- Test: `node tools/test_roulette.js`.
