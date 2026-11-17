// Planchette module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const T = { ready: 'R', waiting: 'W', written: 'Wr', left: 'L', right: 'Ri', up: 'U', down: 'D', clear: 'C' };
const cells = [{ label: 'A', x: 0.1, y: 0.2, r: 0.04 }, { label: 'B', x: 0.3, y: 0.2, r: 0.04 }, { label: 'C', x: 0.5, y: 0.2, r: 0.04 }, { label: '7', x: 0.5, y: 0.6, r: 0.04 }, { label: 'YES', x: 0.2, y: 0.8, r: 0.06 }];
const opts = { board: 'images/board.png', aspect: 1.5, cells, words: ['CAB', 'Yes7'], afterWords: 'BÁ', msPerLetter: 30, wrongText: 'wrong', wordOkText: ['ok1', 'ok2'], texts: T };
const cfg = { type: 'planchette', title: 'P', sides: { a: { axis: 'x' }, b: { axis: 'y' } }, options: opts };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const wait = ms => { const t = Date.now() + ms; while (Date.now() < t); };
Mod.setPush(() => {});
// --- two players: a moves x, b moves y, both must press ready
const r = { solo: false, messages: [], world: { solved: {} } };
const A = (p, m) => Mod.act(cfg, 'p', r, p, m), V = p => Mod.view(cfg, 'p', r, p);
check('object sides: picker labels are empty strings', V(0).sides, { a: '', b: '' });
A(0, { side: 'a' }); A(1, { side: 'b' });
const s = () => r.mods.p.state, go = (x, y) => { A(0, { dx: x - s().x }); A(1, { dy: y - s().y }); };
check('view holds no words', ['CAB', 'Yes7', 'words', 'afterWords'].some(w => JSON.stringify(V(0)).includes(w)), false);
check('axes per side', [V(0).view.axis, V(1).view.axis], ['x', 'y']);
A(0, { dy: 0.3 }); A(1, { dx: 0.3 }); check('a cannot move y, b cannot move x', [s().x, s().y], [0.5, 0.5]);
go(0.5, 0.21); let w = A(0, { ready: true }); check('one ready is not enough', [V(1).view.ready, V(0).view.cur], [{ a: true, b: false }, '']);
w = A(1, { ready: true }); check('both ready: C written, flags reset', [V(0).view.cur, V(0).view.ready], ['C', { a: false, b: false }]);
go(0.3, 0.2); A(0, { ready: true }); w = A(1, { ready: true }); check('wrong letter clears the word, no penalty', [w.view.text, w.view.wrong, w.msgs.length, V(0).view.cur], ['wrong', false, 0, '']);
go(0.4, 0.4); A(0, { ready: true }); A(1, { ready: true }); check('between cells nothing is written', V(0).view.cur, '');
go(0.5, 0.2); A(0, { ready: true }); A(1, { ready: true });
go(0.11, 0.21); A(0, { ready: true }); A(1, { ready: true });
// radius is in width shares: 0.03 of height is 0.02 of width at aspect 1.5, inside r 0.04
go(0.3, 0.23); A(0, { ready: true }); w = A(1, { ready: true }); check('word done: its own text', [w.view.text, V(0).view.done, V(0).view.cur], ['ok1', ['CAB'], '']);
A(0, { clear: true }); check('clear on an empty word', V(0).view.cur, '');
go(0.2, 0.8); A(0, { ready: true }); A(1, { ready: true }); check('a word cell counts for its letters', V(0).view.cur, 'YES');
go(0.5, 0.6); A(1, { ready: true }); w = A(0, { ready: true });
check('last word: solved, panel kept open while spelling', [w.view.justSolved, w.msgs[0].text, w.view.text, V(0).solved, V(0).keep, !!V(0).view.after], [true, '(GAME: SOLVED, P)', 'ok2', true, true, true]);
check('closing word as cells, accents folded', V(1).view.after.tokens, [{ ch: 'B', x: 0.3, y: 0.2 }, { ch: 'Á', x: 0.1, y: 0.2 }]);
A(0, { dx: 0.1 }); check('no moves after solving', s().x, 0.5);
wait(60 + 2600); check('after the spelling the panel closes', [V(0).keep, V(0).view], [false, null]);
// --- alone: one player moves both axes, one ready is enough
const r2 = { solo: true, messages: [], world: { solved: {} } }, A2 = m => Mod.act(cfg, 'p', r2, 0, m), V2 = () => Mod.view(cfg, 'p', r2, 0);
check('alone: no side picker, both axes', [V2().sides, V2().view.axis], [null, 'both']);
A2({ dy: -0.3 }); A2({ ready: true }); check('alone: one ready writes', V2().view.cur, 'C');
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
