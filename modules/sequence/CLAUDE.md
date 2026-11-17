# sequence: pictures on numbered slots

Pictures go onto slots in order (hooks on a wall). Tap a picture, then a slot or the tray; dragging works too; a picture dropped on a taken slot swaps with it. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `answer` is the item id per slot and stays on the server.
- **Inventory gate:** an item with `if` (a world condition, e.g. `{"has": "i_sunday"}`) is offered only while it holds; one already on a slot stays.
- **Two-sided** (panel `sides` + `sketchText`): side `a` arranges, side `b` sees the items' sketches in a mixed order, each with the number of its slot written by the client (the number is the clue, so the sketch side may see it). Side `b` cannot move. Solo play sees both. Without `sides`, everyone arranges.
- `move`: `{item, slot}` (slot `null` puts it back in the tray), `{check: true}`.
- Solved when every slot holds its item. A wrong check only says `badText`.
