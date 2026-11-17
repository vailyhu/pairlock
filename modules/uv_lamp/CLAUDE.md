# uv_lamp: hidden marks under ultraviolet light

One or more pictures, dimmed; a violet light follows the pointer or finger and shows hidden marks inside it. The marks are drawn by the client from `options`, never baked into the image, so they are exact and translatable. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. Per image a list of marks (`x`, `y`, `text`, `size`, `angle`), plus `radius` and `dim`.
- `move`: `{seen: [image, mark]}`, sent once per mark when it is inside the light.
- Solved only with `solveWhenAllSeen`, when every mark has been in the light; otherwise the panel just gives clues.
- Limit: the client must know the marks to draw them, so a player reading the network traffic could read them. They are clues, not a check, so this is accepted.
