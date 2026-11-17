# param_console: a world's settings on switches

A console that sets a world's parameters (time of day, torches, light), each to one of a few values; the effect shows somewhere else (a room picture chosen by state, a `notify` text). Built for A Szerelmi Szimuláció (2026-11-15); generic. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `params: [{id, label, values: [{id, label}], initial}]`. Locking: `unlock` (a world condition, checked with `ctx.test`, e.g. a variable set by a `MATRIX <row> ok` message) and/or `unlockCode` (a typed code, checked like every answer; once accepted it stays open). Neither: always open. `lockedText`, `texts` (`text`, `codeLabel`, `codeButton`, `wrongCode`, `unlockedText`).
- `move`: `{param, value}`; `{code}` to unlock.
- **World link:** every change answers with a silent game message, by default `(GAME: PARAM <param> <value>)` (`message`, `{param}`, `{value}`), like `power_router`'s `POWER`. The game's `world.json` `onMessage` turns it into a variable that room pictures (`image: [{if, image}]`), texts and rules read. The world's starting variables must match each parameter's `initial`. Handled at the start of the thread's next turn.
- One-sided: the other player sees the effect in the world (room picture, `notify`), not on the console.
- Never solved: a standing control panel; a combination of values triggers something through a world rule on the variables.
- `view`: locked or not, the parameters with their current values only when open. Never the code.
- Test: `tools/test_param_console.js`.
