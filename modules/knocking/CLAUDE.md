# knocking: a series of knocks heard in two places

Each of two players, in two different rooms, hears their own series of knocks through a wall; each series is half of a message (pairs of numbers, e.g. a row and a column in a grid). A general "signal from afar" module (knocking, dripping, a distant lamp). Never solved by itself: the answer is entered elsewhere (e.g. a `code_lock`). Shared contract: `../CLAUDE.md`.

- Panel: `sides: {a: {at: '<room>'}, b: {at: '<room>'}}`: the side follows where the player stands (framework, see `../CLAUDE.md`), so there is no picker; elsewhere the view is empty and shows `texts.silence`. Availability comes from the world's `panelAvail`, the end from the panel's `closed` (a list, or one condition with `closedText`). Without `sides`, alone, one player hears both series.
- `options`: see `types.ts`. `sequences: {a: [[row, col], …], b: […]}`; each pair is `row` knocks, `groupPauseMs`, `col` knocks, then `pairPauseMs` before the next pair; `knockMs` is the time from knock to knock. Texts: `listen`, `heard`, `silence`, `again`.
- `move`: `{listen: true}`: plays the own side from the start (both sides can play at the same time).
- `view`: per side heard, the pairs heard in full, the pair being knocked so far, the knock count and whether it plays. The series is never sent ahead: only what has been knocked. Timing runs on the server (start time per side, one panel timer that pushes at every knock).
- Client: a wall panel that trembles and a dot that flashes on every knock (no sound), the pairs heard as "1-5 · 4-2", a listen / again button.
- `leave` stops a playback still running (exit, restart); a finished one stays listed until the next listen.
- Test: `node tools/test_knocking.js`.
