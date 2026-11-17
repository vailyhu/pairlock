# puzzle: jigsaw on a shared board

Any image, cut by configuration. Both players see and move the same pieces live. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `cols` and `rows` set the cut, `jitter` how uneven it is, `snap` how close a drop must be, `trayWidth` the size of the loose area.
- `move`: `{piece, x, y, live: true}` while dragging, `{piece, x, y, drop: true}` on release. Coordinates are shares of the image size.
- `view`: every piece with its position, outline and corner.
- Saved state: seed, positions, locked pieces, stacking order. `live` moves are not written to disk.
- Mixing: pieces are shuffled at game start with a cryptographic generator, keeping the order with the fewest real neighbours side by side, and each game gets its own cut.
- Limit: the client must have the whole image and each piece's corner in order to draw, so a player reading the network traffic could find the answer. The server still decides what is locked and when the puzzle is solved. Hiding this would need pre-cut image files.
