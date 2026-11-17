# logic_grid: shared assignment table

Rows (e.g. people) against one or more aspects (e.g. day, year): one select per row and aspect. Both players see and fill the same table live. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `answer` is the right value per row in column order and stays on the server.
- `move`: `{row, col, value}` sets a cell (`""` empties it), `{check: true}` checks.
- Solved when every cell of every row is right. A wrong check says only `badText`; with `countText` it says how many rows are fully right (`{n}`).
- Values may repeat across rows; the table does not enforce one-to-one, the clues do.
- `unordered: true` (or `unorderedRows: [row]`): such a row is right when its chosen values match the answer as a set, in any column order (e.g. picking the two owners of one world in two columns with the same values). A wrong pair gets `badText` as usual; it can be retried.
