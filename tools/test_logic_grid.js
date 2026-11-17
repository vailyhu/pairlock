// Logic grid module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'logic_grid', title: 'L', options: { rowLabel: 'Ki', rows: ['Ann', 'Bea'], columns: [{ label: 'Nap', values: ['H', 'K'] }, { label: 'Év', values: ['1990', '1991'] }], answer: { Ann: ['K', '1991'], Bea: ['H', '1990'] }, checkLabel: 'c', okText: 'ok', badText: 'no', emptyLabel: '–', countText: '{n} sor jó' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: false, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'l', r, 0, m), B = m => Mod.act(cfg, 'l', r, 1, m);
check('view contains no solution', JSON.stringify(Mod.view(cfg, 'l', r, 0).view).includes('1991","1990'), false);
check('view has no answer key', 'answer' in Mod.view(cfg, 'l', r, 0).view, false);
A({ row: 'Ann', col: 0, value: 'K' }); check('shared with the partner', Mod.view(cfg, 'l', r, 1).view.cells.Ann, ['K', '']);
A({ row: 'Ann', col: 0, value: 'X' }); check('unknown value ignored', Mod.view(cfg, 'l', r, 1).view.cells.Ann, ['K', '']);
A({ row: 'Zoe', col: 0, value: 'H' }); check('unknown row ignored', Object.keys(Mod.view(cfg, 'l', r, 1).view.cells), ['Ann', 'Bea']);
let w = B({ check: true }); check('wrong check', [w.view.wrong, w.view.text, w.msgs[0].text], [true, '0 sor jó', '(GAME: WRONG, L)']);
A({ row: 'Ann', col: 1, value: '1991' }); B({ row: 'Bea', col: 0, value: 'H' }); B({ row: 'Bea', col: 1, value: '1991' });
w = A({ check: true }); check('one row right', w.view.text, '1 sor jó');
B({ row: 'Bea', col: 1, value: '1990' }); w = A({ check: true }); check('correct check solves', [w.view.justSolved, w.msgs[0].text], [true, '(GAME: SOLVED, L)']);
check('state is plain JSON', JSON.parse(JSON.stringify(r.mods.l.state)).cells.Bea, ['H', '1990']);
// unordered row: the two owners in any order
const cu = { type: 'logic_grid', title: 'U', options: { rowLabel: 'Világ', rows: ['w'], columns: [{ label: '1', values: ['p', 'q', 'r'] }, { label: '2', values: ['p', 'q', 'r'] }], answer: { w: ['p', 'q'] }, unordered: true, checkLabel: 'c', okText: 'ok', badText: 'no', emptyLabel: '–' } };
const ru = { solo: true, messages: [], world: { solved: {} } }, U = m => Mod.act(cu, 'u', ru, 0, m);
U({ row: 'w', col: 0, value: 'p' }); U({ row: 'w', col: 1, value: 'r' }); w = U({ check: true }); check('unordered: wrong pair', [w.view.wrong, w.view.text], [true, 'no']);
U({ row: 'w', col: 0, value: 'q' }); U({ row: 'w', col: 1, value: 'q' }); w = U({ check: true }); check('unordered: same value twice is wrong', w.view.wrong, true);
U({ row: 'w', col: 1, value: 'p' }); w = U({ check: true }); check('unordered: reversed order solves', w.view.justSolved, true);
const co = { ...cu, title: 'O', options: { ...cu.options, unordered: false, unorderedRows: [] } }, ro = { solo: true, messages: [], world: { solved: {} } };
Mod.act(co, 'o', ro, 0, { row: 'w', col: 0, value: 'q' }); Mod.act(co, 'o', ro, 0, { row: 'w', col: 1, value: 'p' }); check('ordered: reversed order is wrong', Mod.act(co, 'o', ro, 0, { check: true }).view.wrong, true);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
