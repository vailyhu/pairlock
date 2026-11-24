# Colorizer (`colorize.js`, built 2026-11-07)

Rewords the engine's fixed room, look and move texts each turn with one history-free JSON call (`AI.colorize`), beside the narrator. Off unless `game.json` `colorize: {on, kinds, timeoutMs, style}`; every game has it, off. **Not switched on in any game yet: the user decides after reading a trial run.**

- Input: blocks with `keep` (names of things the text mentions), `details` (mood facts of the room or thing), `nth`, the player's words, `usedBefore`.
- Checks in code (any failure, error or timeout keeps the fixed text): every `keep` word present (Hungarian endings allowed, `hasTerm`); „…” quotes letter for letter; no new or lost digits or number words; no names of things not here (unless also named here or in the details); no `sensitiveWords`; no emphasis words (`locales` `engine.colorize`); length 0.5–1.8×; own thread in second person; moves keep names, rooms and outcome.
- Not colorized: entities with `literal: true` (documents, clue texts), texts with an author's emphasis word, actions.
- Save keeps per message `color: [{kind, fixed, out, fail}]`; the log line shows ok/fixed.
- World fields: `details` (list of strings on items and rooms; `validate` refuses hidden names and sensitive words in them), `literal`, `sensitiveWords`, `emphasisWords`.

## Decisions

- Only room, look and move texts are colorized. Actions (`say`, `otherwise`, `forbidden`), documents and codes, "not here" replies, status and inventory lines stay word for word; the narrator is never colorized.
- `keep` holds only names the fixed text itself mentions (all room items would fail every look).
- Gets no secrets (hidden things, solution, vars, other rooms); uses at most two `details`; avoids `usedBefore`; gets shorter by the third look (`nth`); may react to how the player said it; never adds things, names or numbers; never makes anything seem important; never tells players what to do.
- Voice by audience: shared thread third person with names, own thread second person.
- Moves: the engine decides who goes where; the text may never reverse the outcome (no "together" on a split, no "alone" on together) or put words in the other player's mouth.
- `details` hold mood only, never anything that could read as a clue; only the author's fixed text may point.

## Tests and trial

`node tools/test_colorize.js` (offline). `node tools/colorize_trial.js <game> [runs]` (real model, small cost, writes `saves/colorize-trial/<game>.md`). Trial 2026-11-07: ≈1.2 s per call; fixed text kept in 10% (A Modell), 13% (Őrség), 4% (Tihany).
