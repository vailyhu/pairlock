# locomotive: stop the train, segment by segment

A turn-based reasoning finale for two: no real-time simulation, no time pressure. The track ahead has segments; for each, the players set their levers once and run it. Side `a` and side `b` each work their own levers (alone, one player works all); both confirm "ready", then either may "go". Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `segments[].right` and `.track` and the `faults` stay on the server; the view shows only the levers, the segment number and km, the speed and the last run's text.
- `move`: `{set: {control, value}}` (own side only; resets both "ready"), `{ready: true|false}`, `{go: true}` (needs both ready when two play).
- A right run moves to the next segment (its `segmentOk` text, speed from `gauges.speedOk`); a wrong one tells the first matching fault's text and the same segment can be run again. Solved after the last segment. Wrong runs are not `bad`: no penalty message.
- `texts.segment` fills `{n}`, `{of}`, `{km}`; `texts.speed` fills `{speed}`; `texts.partner` labels the partner's levers (shown read-only; omit it to hide them).
- Test: `node tools/test_locomotive.js`.
