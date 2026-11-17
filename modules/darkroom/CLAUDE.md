# darkroom: develop a glass plate

A turn-free but timed task: the plate goes through the trays of a recipe (developer, stop bath, fixer, wash), each for its time, under the right light. Time runs in in-game minutes (`secondsPerMinute` real seconds each) and is measured on the server between `dip` and `lift`. Shared contract: `../CLAUDE.md`.

- `options`: see `types.ts`. `steps` stay on the server; the view has the trays, the light, the tray the plate is in and how long, and the picture once it has started to develop (it fades in at the pace of the first step).
- `move`: `{light: 'white'|'red'|'off'}`, `{dip: tray}`, `{lift: true}`, `{reset: true}`.
- White light once the work has started, or dipping under white light, a tray out of order, or a time outside `minutes ± tolerance` fogs the plate: a text says why, and `reset` takes a fresh plate. Nothing is lost and no `bad` is sent (it is a trial, not a penalty).
- Solved after the last step. Test: `node tools/test_darkroom.js`.
