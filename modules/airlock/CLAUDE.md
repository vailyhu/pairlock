# airlock: a pressure sequence worked from two places

Two sides work a fixed sequence of moves (doors, latches, pump, heating, equalising); each side sees only its own controls and its own gauges, so they have to tell each other what they see. Built for the Holdbázis hangar (2026-11-14); generic for any lock, bell or hatch. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `controls` and `gauges` each belong to side `a` or `b`; `steps` is the correct order (one control move per step, optional world condition `if` checked with `ctx.test`, gauge values after the step, a shared line); `faults` match wrong moves (first match wins) and may send the sequence back to an earlier step; any other wrong move is undone with `wrongText`. No penalty.
- `move`: `{set: {control, value}}` (only the side's own controls), `{reset: true}` (back to the start).
- `view`: the side's own controls with their positions, the side's own gauges, the last shared line (`note`), `done`. `steps` and `faults` are never sent. Alone (`side` `both`) one player sees everything.
- Solved when the last step is done; the framework then closes the panel as usual (with `keepAfterSolved` it stays open, showing the final positions, and takes no more moves).
- The client moves the gauge bars slowly (about one to two and a half seconds), so there is something to call out.
- Saved state: step, control positions, gauge values, last line. No live timer, so no `leave`.
- Test: `tools/test_airlock.js`.
