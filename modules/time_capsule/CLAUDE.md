# time_capsule: pick what to hide the evidence in, and where

One side (`a`, or `both` alone) chooses a container and a hiding place and presses the button. Every pair is accepted (no dead end); the game's world reads the message and sets its own variables. The other side only sees `textB`. Usually used with `sidesByPlayer` (the 1974 player decides). Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `containers`, `places`: `{id, label}`. `message` template, default `CAPSULE {container} {place}` (ids); `doneText` may use `{container}` and `{place}` (labels).
- `move`: `{container, place}` ids; an unknown id or the `b` side is ignored.
- One move solves the panel; the module's message replaces the default `SOLVED`, so the world must react to `CAPSULE …` (e.g. `onMessage` with `$1`, `$2`).
- No images of its own.
