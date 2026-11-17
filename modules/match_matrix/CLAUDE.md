# match_matrix: picture logic grid with ✓ / ✗

Rows (e.g. places, shown as small pictures) against one or more column groups (pictures or short texts, e.g. people and requests). Each cell takes ✓ or ✗, like a paper logic puzzle. Both players see and fill the same table live. The picture-and-tap sibling of `logic_grid`. Built for A Szerelmi Szimuláció (2026-11-15); generic. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. Column ids are unique across groups. `answer` is the right column id per row in group order and stays on the server. `rowReward` per row: a text or `{text, image}`.
- `move`: `{row, col}` cycles the cell: empty → ✓ → ✗ → empty. Within a row and group only one ✓ stays: a new ✓ turns the earlier one into ✗. `{check: true}` checks.
- A row is right when in every group its only ✓ is the answer's column. A check shows, for every row it finds right, the row's reward (to both players, kept from then on) and sends a silent world message once per row, by default `(GAME: MATRIX <row id> ok)` (`rowMessage`, `{row}`). Solved when every row is right; otherwise `badText` or `countText` (`{n}` right rows) and the usual wrong message.
- Several messages from one move use the framework's `messages` (see `../types.ts`).
- With any `rowReward` the table stays open after solving (`keep`), read-only, so the last reward can still be read.
- `view`: rows, groups, marks, the rewards earned. Never the answer or which rows are right before a check.
- Saved state: the marks and the rows found right, so it can be left half done.
- Client: pictures small in the headings, large on tap; long column texts clamped, whole on tap; the first column and the heading stick while the table scrolls on a phone.
- Test: `tools/test_match_matrix.js`.
