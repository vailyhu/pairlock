# power_router: sharing scarce power between rooms

On reserve power only a few consumers can be on at once; the players choose which ones from one panel. Built for the Holdbázis control room (2026-11-14); generic for any base, ship or bunker. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `consumers` (`fixed` ones are always on, `start` ones are on at the start, `room` is the room a consumer feeds), `capacity` (switchable consumers on at once), `fullIf` (world condition, checked with `ctx.test`: full power, everything on, nothing can be switched), texts with `{capacity}`, `{label}`, `{used}`.
- `move`: `{toggle: id}`. Switching on beyond the capacity is refused with `fullText`; switching off a consumer whose room a player stands in (`ctx.test({player: "any", at: room})`) is refused with `occupiedText`, so nobody is shut in the dark.
- **World link:** the module's own state is not the world's. Each switch answers with a silent game message, by default `POWER <id> on|off`; the game's `world.json` `onMessage` turns it into a variable (e.g. `power_<id>`) that doors, exits and room pictures read. The world's starting variables must match the consumers' `start`. The silent message is handled at the start of the thread's next turn (any typed sentence or the room picker), before that turn's actions, so a door is open by the time a player walks to it. When full power comes back, the world sets all its variables itself (a rule on the repair), and the module shows everything on.
- `view`: every consumer with its state, the usage line. Never solved: a standing control panel.
- Saved state: on/off per consumer. No live timer, so no `leave`.
- Test: `tools/test_power_router.js`.
