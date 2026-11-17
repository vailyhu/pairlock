# morse: light signal for two players

One player holds the lever, the other sees the lamp and enters the answer. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `pattern` is dots and dashes with letters separated by spaces, `unit` is the length of a short signal in seconds. The texts are required; the module has no defaults.
- `move`: `{hold: true|false}` (side `a` only), `{guess}`.
- `view`: always `run`, `canHold`, `canSee`, `guessLabel`, `button`. Side `a` also gets its texts; side `b` also gets `on` and `trace`. `pattern` is never sent.
- Timing: the server steps through the signal and calls `push()` on every change. Every press restarts from the beginning, and `trace` clears at the end of each cycle.
- `leave` stops the signal on release, side change, exit and restart.
