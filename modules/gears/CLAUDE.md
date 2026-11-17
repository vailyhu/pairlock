# gears: gear pair between two axles

The players pick a gear for each axle from the gears on hand. The pair meshes only when the tooth counts add up to the axle distance. Installing it sets how fast the driven axle turns, and another panel can read that. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `teeth` lists the gears on hand, `sum` is the tooth total that meshes, `start` is the pair fitted at the start, `base` is the drive axle's turn in seconds.
- `move`: `{axle: 'a'|'b', teeth}` picks a gear, `{install: true}` installs a meshing pair.
- `view`: both axles, the gears on hand, `mesh` and ready-made `status` text.
- Install: writes the period (`base × b / a`, one decimal) into `ctx.vars[var]` and sends `message` with `{a}`, `{b}`, `{period}` filled in. It does not solve the panel, so it can be changed again. Use `closed` in panels.json to stop changes once they no longer make sense.
- Saved state: the two picked gears. Both players share them.
