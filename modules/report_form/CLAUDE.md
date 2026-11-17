# report_form: multiple-choice report signed once

A list of questions, each with a drop-down of choices. Signing scores the answers and sends the score to the game; there is no second try. Both players see and change the same picks. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. Each question has `text`, `choices` and the right `answer` (or `hash`, salted with `<panel id>.<index>`).
- `move`: `{pick: index, value}` (`value` null clears it), `{sign: true}` (only when every question has a pick).
- `view`: the questions, choices and picks. Answers are never sent, and the score is not shown before signing.
- Signing finishes the panel and sends `message`. `okText` stays as the panel's text afterwards. Placeholders: `{good}`, `{total}`, and one per key of `values`, which picks a value from world conditions (for example how the game went), so the narrator can write the ending.
