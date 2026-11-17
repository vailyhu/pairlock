# code_lock: code lock

Digit dials, letter dials, or free text. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. The texts are required; the module has no defaults.
- `move`: `{guess}`.
- `view`: `kind`, `n`, `placeholder`, `button`.
- No saved state and no live part.
- Use `answer`: the file never reaches the browser. `hash` is salted with the panel id, so renaming a panel breaks it.
