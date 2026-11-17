# planchette: spell words together on a spirit board

Two players guide one pointer over a board: side `a` moves it left and right, side `b` up and down. A letter counts only when both agree it is on the right cell. A general "write something together" finale. Shared contract: `../CLAUDE.md`.

- Panel: `sides: {a: {axis: 'x', label?}, b: {axis: 'y', label?}}` (the module always gives `a` the x axis; `label` is what the side picker shows, else the frame's generic text). Alone (solo) one player moves both axes and one ready press is enough.
- `options`: see `types.ts`. `cells` are in shares of the board (`x`, `y` centre, `r` radius in shares of the width); give `aspect` (board width / height, e.g. 1600/1100) so the radius is round, default 1. `words` stay on the server: only letters and digits count, accents and case are not told apart, so a cell `YES` or the letters Y-E-S both write "YES".
- `move`: `{dx}` (side a), `{dy}` (side b), relative, clamped to the board; `{ready: true}` (either side); `{clear: true}` (clears the word being written).
- When both sides have pressed ready, the cell under the pointer (nearest whose radius covers it) is tried and both flags reset. Not on a cell: nothing. A letter that does not continue the current word clears it with `wrongText` (no `bad`, no penalty). A finished word gives `wordOkText` (one text, or one per word).
- `view`: board, pointer, own axis, both ready flags, the finished words and the current letters. Never `words` or `cells`.
- Solved when every word is written: `(GAME: SOLVED, title)` goes out at once (it can start a `scripted` scene), and the panel stays open without `keepAfterSolved` (the module's `keep()`) while the pointer spells `afterWords` by itself, one cell per `msPerLetter`; then the window closes. A letter without a cell (e.g. Á) uses the cell of its unaccented letter.
- Client: arrow buttons for the own axis (hold to repeat), a tap on the board moves the pointer there along the own axis, a big ready button.
- Test: `node tools/test_planchette.js`.
