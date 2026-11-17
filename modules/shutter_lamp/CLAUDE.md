# shutter_lamp: shutter drum and ignition for two players

A ring of shutters turns around a lamp. Seen from outside, each open shutter is one flash per turn of the drum. One player holds the crank; the other sets the shutters and lights the lamp while the crank is held. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `start` is the shutter ring, `goal` is the flash groups (`runs`, e.g. `[2]`) and the drum period that count as right. The period is read from `ctx.vars[periodVar]` (for example a `gears` panel writes it), else `startPeriod`.
- `move`: `{hold: true|false}` (side `a`), `{toggle: index}` and `{fire: true}` (side `b`). Playing alone, both sides are one player and the crank is not needed.
- `view`: side `a` gets its texts and `crank`; side `b` gets the shutters, the period, ready-made `look` and `gate` texts and `ready`. `goal` is never sent.
- Ignition sends `message` with `{code}` set from `codes`: `good`, or `firstBad` for the first wrong try (the panel stays open and closes the window) or `bad` for a later one. `good` and `bad` finish the panel. The game reads the code, so the texts that follow belong to the game.
- `leave` lets the crank go when the holder leaves.
