// Dual word module without the server, on made-up values and a fake clock. No game data.
const Mod = require('../engine/modules');
let now = 1e6; Date.now = () => now;
const opts = { answers: { a: 'alma', b: 'körte' }, windowMs: 5000, waitText: 'vár', lateText: 'késő', wrongText: 'rossz', okText: 'nyitva', otherTypedText: 'a másik írt' };
const cfg = { type: 'dual_word', title: 'D', sides: { a: 'A', b: 'B' }, options: opts };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
Mod.setPush(() => {});
const r = { solo: false, messages: [], world: { solved: {} } }, A = m => Mod.act(cfg, 'd', r, 0, m), B = m => Mod.act(cfg, 'd', r, 1, m), V = p => Mod.view(cfg, 'd', r, p).view;
A({ side: 'a' }); B({ side: 'b' });
check('view has no answer', /alma|k[öo]rte/i.test(JSON.stringify(V(0)) + JSON.stringify(V(1))), false);
let w = A({ word: 'körte' }); check('a wrong word alone is not judged', [w.view.text, w.msgs.length], ['vár', 0]);
check('partner sees only that something was typed', [V(1).otherTyped, V(1).mine, V(0).mine], [true, false, true]);
check('the word is not saved', JSON.stringify(r.mods.d.state).includes('rte'), false);
now += 2000; w = B({ word: 'alma' }); check('both wrong in the window', [w.view.wrong, w.msgs[0].text, V(0).status], [true, '(GAME: WRONG, D)', 'rossz']);
check('both start again', [V(0).mine, V(1).otherTyped], [false, false]);
A({ word: 'ALMA!' }); now += 6000; w = B({ word: 'körte' }); check('second word too late', [w.view.text, w.msgs.length, V(0).otherTyped], ['késő', 0, true]);
now += 1000; w = A({ word: 'alma' }); check('then right within the window solves', [w.view.justSolved, w.msgs[0].text], [true, '(GAME: SOLVED, D)']);
// anyOrder
const c2 = { ...cfg, title: 'E', options: { ...opts, anyOrder: true } }, r2 = { solo: false, messages: [], world: { solved: {} } };
const A2 = m => Mod.act(c2, 'e', r2, 0, m), B2 = m => Mod.act(c2, 'e', r2, 1, m); A2({ side: 'a' }); B2({ side: 'b' });
A2({ word: 'alma' }); now += 100; check('anyOrder: the same word twice is wrong', B2({ word: 'alma' }).view.wrong, true);
A2({ word: 'körte' }); now += 100; check('anyOrder: swapped words solve', B2({ word: 'alma' }).view.justSolved, true);
const r3 = { solo: false, messages: [], world: { solved: {} } }; Mod.act(cfg, 'f', r3, 0, { side: 'a' }); Mod.act(cfg, 'f', r3, 1, { side: 'b' });
Mod.act(cfg, 'f', r3, 0, { word: 'körte' }); now += 100; check('ordered: swapped words are wrong', Mod.act(cfg, 'f', r3, 1, { word: 'alma' }).view.wrong, true);
// alone
const r4 = { solo: true, messages: [], world: { solved: {} } }, S = m => Mod.act(cfg, 'g', r4, 0, m);
check('alone: side both, two fields', Mod.view(cfg, 'g', r4, 0).view.side, 'both');
check('alone: one word is ignored', S({ word: 'alma' }).msgs.length, 0);
check('alone: wrong pair', S({ words: { a: 'alma', b: 'alma' } }).view.wrong, true);
check('alone: right pair solves', S({ words: { a: 'alma', b: 'körte' } }).view.justSolved, true);
// leave drops a waiting word
const r5 = { solo: false, messages: [], world: { solved: {} } }; Mod.act(cfg, 'h', r5, 0, { side: 'a' }); Mod.act(cfg, 'h', r5, 1, { side: 'b' });
Mod.act(cfg, 'h', r5, 0, { word: 'alma' }); Mod.leaveAll({ panels: { h: cfg } }, r5, 0); check('leave drops the waiting word', Mod.view(cfg, 'h', r5, 1).view.otherTyped, false);
// press mode: a two-key lock, each side turns its key
const po = { mode: 'press', windowMs: 1500, requires: { a: { has: 'key_a' }, b: { has: 'key_b' } }, blockedIf: { var: 'timer', is: 'off' }, pressLabel: 'FORDÍT', noKeyText: 'nincs kulcs', blockedText: 'zárva', missText: 'visszaugrik', waitText: 'vár', okText: 'nyitva', soloLabels: { a: 'bal', b: 'jobb' } };
const pc = { type: 'dual_word', title: 'P', sidesByPlayer: true, options: po };
const pw = () => ({ solved: {}, inv: [], vars: { timer: 'off' } });
const r6 = { solo: false, messages: [], world: pw() }, PA = m => Mod.act(pc, 'p', r6, 0, m), PB = m => Mod.act(pc, 'p', r6, 1, m), PV = p => Mod.view(pc, 'p', r6, p).view;
check('press: no key, no button', [PV(0).mode, PV(0).canPress, PV(0).noKeyText], ['press', { a: false }, 'nincs kulcs']);
check('press: without the key a press does nothing', [PA({ press: true }).view.text, PV(1).otherTyped], ['nincs kulcs', false]);
r6.world.inv.push({ id: 'key_a', name: 'A' });
check('press: key a held, side b still has none', [PV(0).canPress, PV(1).canPress], [{ a: true }, { b: false }]);
r6.world.inv.push({ id: 'key_b', name: 'B' });
let p6 = PA({ press: true }); check('press: first turn waits', [p6.view.text, p6.msgs.length, PV(1).otherTyped], ['vár', 0, true]);
now += 3000; p6 = PB({ press: true }); check('press: second turn too late springs back', [p6.view.text, p6.msgs.length, PV(0).status], ['visszaugrik', 0, 'visszaugrik']);
now += 500; p6 = PA({ press: true }); check('press: in time but blocked does not open', [p6.view.text, p6.view.justSolved, p6.msgs.length, PV(1).status], ['zárva', false, 0, 'zárva']);
r6.world.vars.timer = 'done';
PA({ press: true }); now += 1600; check('press: a press after the window does not open', PB({ press: true }).view.justSolved, false);
now += 1000; p6 = PA({ press: true }); check('press: in time and not blocked opens', [p6.view.justSolved, p6.msgs[0].text], [true, '(GAME: SOLVED, P)']);
const r7 = { solo: true, messages: [], world: { ...pw(), inv: [{ id: 'key_a' }, { id: 'key_b' }], vars: { timer: 'done' } } }, S7 = m => Mod.act(pc, 'q', r7, 0, m);
check('press alone: both keys, two buttons', [Mod.view(pc, 'q', r7, 0).view.side, Mod.view(pc, 'q', r7, 0).view.canPress, Mod.view(pc, 'q', r7, 0).view.soloLabels], ['both', { a: true, b: true }, { a: 'bal', b: 'jobb' }]);
check('press alone: the same key twice does not open', [S7({ press: 'a' }).view.justSolved, S7({ press: 'a' }).view.justSolved], [false, false]);
now += 200; check('press alone: the other key in time opens', S7({ press: 'b' }).view.justSolved, true);
check('press: no condition or setting leaks to the view', /key_|timer|has/.test(JSON.stringify(PV(0)) + JSON.stringify(Mod.view(pc, 'q', r7, 0))), false);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
