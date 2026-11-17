// Match matrix module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'match_matrix', title: 'M', options: {
  rows: [{ id: 'r1', label: 'Erdő', image: 'images/a.jpg' }, { id: 'r2', label: 'Tó', image: 'images/b.jpg' }],
  groups: [{ label: 'Ki', cols: [{ id: 'p1', label: 'Anna', image: 'images/p1.jpg' }, { id: 'p2', label: 'Béla' }] }, { label: 'Mit', cols: [{ id: 'q1', label: '1', text: 'hosszú idézet' }, { id: 'q2', label: '2', text: 'másik' }] }],
  answer: { r1: ['p2', 'q1'], r2: ['p1', 'q2'] }, rowReward: { r1: 'KOD-A', r2: { text: 'KOD-B', image: 'images/k.jpg' } },
  checkLabel: 'c', okText: 'ok', badText: 'no', countText: '{n} sor jó', sharedNote: 'közös' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: false, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'm', r, 0, m), B = m => Mod.act(cfg, 'm', r, 1, m), V = p => Mod.view(cfg, 'm', r, p).view;
const json = JSON.stringify(V(0));
check('view has no answer or reward before a check', [/answer|KOD/.test(json), V(0).note], [false, 'közös']);
A({ row: 'r1', col: 'p1' }); check('tap: ✓, shared with the partner', V(1).cells.r1, { p1: 'y' });
A({ row: 'r1', col: 'p1' }); check('tap again: ✗', V(1).cells.r1, { p1: 'n' });
A({ row: 'r1', col: 'p1' }); check('third tap: empty', V(1).cells.r1, {});
A({ row: 'r1', col: 'p1' }); B({ row: 'r1', col: 'p2' }); check('new ✓ in the group turns the old one into ✗', V(0).cells.r1, { p1: 'n', p2: 'y' });
A({ row: 'r9', col: 'p1' }); A({ row: 'r1', col: 'zz' }); check('unknown row or column ignored', Object.keys(V(0).cells), ['r1']);
let w = A({ check: true }); check('wrong check: count, no message', [w.view.wrong, w.view.text, w.msgs.map(m => m.text)], [true, '0 sor jó', ['(GAME: WRONG, M)']]);
A({ row: 'r1', col: 'q1' }); w = B({ check: true });
check('one row right: its message and the wrong one', w.msgs.map(m => m.text), ['(GAME: MATRIX r1 ok)', '(GAME: WRONG, M)']);
check('row message is silent', w.msgs[0].silent, true);
check('reward shown to both', [V(0).rewards, V(1).rewards.r1], [{ r1: { text: 'KOD-A' } }, { text: 'KOD-A' }]);
w = A({ check: true }); check('row message sent only once', w.msgs.map(m => m.text), ['(GAME: WRONG, M)']);
A({ row: 'r2', col: 'p1' }); A({ row: 'r2', col: 'q2' }); A({ row: 'r2', col: 'q1' });
check('the later ✓ wins in its group', V(0).cells.r2, { p1: 'y', q2: 'n', q1: 'y' });
w = A({ check: true }); check('wrong column: row not right', w.view.text, '1 sor jó');
A({ row: 'r2', col: 'q2' }); A({ row: 'r2', col: 'q2' }); check('back to the right ✓ (✗ → empty → ✓)', V(0).cells.r2, { p1: 'y', q1: 'n', q2: 'y' });
w = A({ check: true }); check('all right solves, last row message first', [w.view.justSolved, w.msgs.map(m => m.text)], [true, ['(GAME: MATRIX r2 ok)', '(GAME: SOLVED, M)']]);
check('stays open after solving with the rewards', [Mod.view(cfg, 'm', r, 1).keep, V(1).rewards.r2.text], [true, 'KOD-B']);
A({ row: 'r1', col: 'p1' }); check('no moves after solving', V(0).cells.r1.p1, 'n');
check('state is plain JSON', JSON.parse(JSON.stringify(r.mods.m.state)).done, ['r1', 'r2']);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
