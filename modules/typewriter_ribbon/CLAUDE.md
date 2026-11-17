# typewriter_ribbon: read a used typewriter ribbon

The last text typed on a machine, read off its ribbon: the strikes run backwards and mirrored, the lines slide into each other, and fainter old strikes are mixed in. Players page along the ribbon, turn mirroring on and type what they read. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `text` and `answer` stay on the server. The view holds only the strikes of the current window (letters with position, tilt and strength, sorted by position, old strikes mixed in), never the text.
- `move`: `{scroll: -1|1}`, `{mirror: true|false}` (shared by both players), `{answer}`.
- Solved when the normalised guess contains the normalised `answer` (accents, case and punctuation ignored, at most 40 extra letters). Then the view also carries `plain` (the whole text); use the panel's `keepAfterSolved` so it can be reread.
- Test: `node tools/test_typewriter_ribbon.js`.
