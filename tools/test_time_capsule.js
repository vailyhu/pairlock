// Time capsule module and the sidesByPlayer / talkAfterSolved frame options, without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const opts = { containers: [{ id: 'jar', label: 'Jar' }, { id: 'tin', label: 'Tin' }], places: [{ id: 'cellar', label: 'Cellar' }, { id: 'attic', label: 'Attic' }], textA: 'choose', textB: 'wait', button: 'Hide', doneText: '{container} in {place}' };
const cfg = { type: 'time_capsule', title: 'T', sides: { a: 'past', b: 'now' }, sidesByPlayer: true, talkAfterSolved: true, options: opts };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
Mod.setPush(() => {});
for (const solo of [false, true]) {
  const r = { solo, messages: [], world: { solved: {} } }, tag = solo ? 'alone: ' : 'two: ';
  const v0 = Mod.view(cfg, 'tc', r, 0), v1 = Mod.view(cfg, 'tc', r, 1);
  check(tag + 'sides fixed by player', [v0.side, v1.side, v0.fixedSide, !!v0.sides], ['a', 'b', true, true]);
  check(tag + 'a chooses, b waits', [v0.view.canChoose, v1.view.canChoose, v1.view.text, 'containers' in v1.view], [true, false, 'wait', false]);
  check(tag + 'side pick ignored', Mod.act(cfg, 'tc', r, 1, { side: 'a' }).view.side, 'b');
  check(tag + 'b cannot choose', Mod.act(cfg, 'tc', r, 1, { container: 'jar', place: 'cellar' }).msgs, []);
  check(tag + 'unknown id ignored', Mod.act(cfg, 'tc', r, 0, { container: 'box', place: 'cellar' }).msgs, []);
  const w = Mod.act(cfg, 'tc', r, 0, { container: 'tin', place: 'attic' });
  check(tag + 'any pair solves with its message', [w.view.justSolved, w.view.text, w.msgs.map(m => m.text)], [true, 'Tin in Attic', ['(GAME: CAPSULE tin attic)']]);
  check(tag + 'second choice refused', Mod.act(cfg, 'tc', r, 0, { container: 'jar', place: 'cellar' }).msgs.length, 0);
  const t = Mod.act(cfg, 'tc', r, 1, { line: 'hello 1974' });
  check(tag + 'radio still talks after solving', [Mod.view(cfg, 'tc', r, 0).talk, Mod.view(cfg, 'tc', r, 0).tube], [true, [['partner', 'hello 1974']]]);
  check(tag + 'talk sends no game message', t.msgs, []);
}
const plain = { ...cfg, sidesByPlayer: false, talkAfterSolved: false }, r3 = { solo: false, messages: [], world: {} };
Mod.act(plain, 'p', r3, 0, { side: 'a' }); Mod.act(plain, 'p', r3, 0, { container: 'jar', place: 'cellar' });
Mod.act(plain, 'p', r3, 1, { line: 'late' });
check('without talkAfterSolved the tube closes', [Mod.view(plain, 'p', r3, 0).talk, (Mod.view(plain, 'p', r3, 0).tube || []).length], [false, 0]);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
