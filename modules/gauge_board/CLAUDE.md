# gauge_board: controls and gauges for two players

One player sets the controls, the other reads the gauges and confirms when all are in the accepted band. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. Each gauge is a weighted sum of the controls plus a constant, clamped to `0..gaugeMax`.
- `move`: `{control, delta}` (side `a` only), `{confirm: true}` (side `b` only, accepted only when every gauge is in the band).
- `view`: side `a` gets labels and control values, side `b` gets gauge values and the band. `matrix` is never sent.
- Saved state: the control values. There is no live timer, so no `leave`.
