# pipes: closed pipe network

Clicking a cell turns it a quarter. The network is solved when the fluid from the source reaches every exit with no open pipe end. Both players share the board. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `grid` holds the starting rotations, each cell a bitmask of open sides (north 1, east 2, south 4, west 8). `source` and `exits` are cells with the side that connects outside. `marks` are short labels on cells, plain text.
- `move`: `{row, col}`.
- `view`: current `grid`, the cells reached (`wet`), `leak`, `reached`, and ready-made `status` text.
- Saved state: the current rotations. No live timer, so no `leave`.
- Only cells connected to the source matter, so a disconnected cell can stay in any rotation.
- The `grid` is what the author wrote, so a new game must check it can be solved; `tools/pipes_solver.js` does this, and its result is a spoiler.
