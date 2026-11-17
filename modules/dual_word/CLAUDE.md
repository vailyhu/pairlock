# dual_word: two-key word lock

Two players each type one word; it opens only if both words are right and arrive within a few seconds of each other. A two-key lock, a two-person password. Built for A Szerelmi Szimuláció (2026-11-15); generic. Shared contract: `../CLAUDE.md`.

- Two-sided: `sides: {a, b}` in `panels.json`: with labels the players pick, with `at` each side follows where the player stands (same room or two places), or `sidesByPlayer`. Alone (`side: "both"`) one person types both words at once, with no time window.
- `options`: see `types.ts`. `answers: {a, b}` stays on the server; `anyOrder: true` lets either side type either word (the two must still be the two different answers). `windowMs` (default 5000), texts `waitText`, `lateText`, `wrongText`, `okText`, `placeholder`, `sendLabel`, `otherTypedText`, `awayText`, `soloLabels`.
- `move`: `{word}`; alone `{words: {a, b}}`.
- A word alone is never judged: the first one waits (`waitText`), and the partner sees only that something was typed. When the second arrives in the window, both are checked together: right solves, wrong sends `(GAME: WRONG, title)` and both start again (`wrongText`, shown to both). A word after the window finds the earlier one expired (`lateText`) and waits itself. A waiting word expires on its own timer.
- Saved state: only which answers a waiting word matched and when, never the word. `leave` drops waiting words.
- **Press mode** (`mode: 'press'`, 2026-11-17, Szezonzárás): a two-key lock, nothing to type. Each side has one turn button (`pressLabel`); move `{press: true}`, alone `{press: 'a'|'b'}` (alone the player holds both keys: two buttons with `soloLabels`, the window still applies). `requires: {a?, b?}`: a world condition per side; while it fails the side sees `noKeyText` instead of the button and a press is refused. Two turns within `windowMs` open (`okText`), unless `blockedIf` (a world condition) holds: then `blockedText` to both and nothing opens (not `bad`). A turn nobody followed in time springs back: `missText` to both when its timer runs out, or to the late turner. No `(GAME: WRONG)` in this mode.
- Test: `tools/test_dual_word.js`.
