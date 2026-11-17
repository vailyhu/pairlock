// UV lamp module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'uv_lamp', title: 'U', options: { images: [{ image: 'images/a.png', marks: [{ x: .9, y: .9, text: 'EGY' }] }, { image: 'images/b.png', marks: [{ x: .1, y: .9, text: 'KETTŐ' }] }], solveWhenAllSeen: true, okText: 'ok' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: true, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'u', r, 0, m);
check('defaults in view', [Mod.view(cfg, 'u', r, 0).view.radius, Mod.view(cfg, 'u', r, 0).view.dim], [0.12, 0.35]);
check('bad mark ignored', A({ seen: [5, 0] }).view.view.seen, []);
let w = A({ seen: [0, 0] }); check('first mark seen, not solved', [w.view.view.seen, !!w.view.justSolved], [['0:0'], false]);
A({ seen: [0, 0] }); check('seen once', Mod.view(cfg, 'u', r, 0).view.seen.length, 1);
w = A({ seen: [1, 0] }); check('all seen solves', [w.view.justSolved, w.msgs[0].text], [true, '(GAME: SOLVED, U)']);
check('all seen in the view', Mod.view(cfg, 'u', r, 0).view, null);
const ck = { ...cfg, keepAfterSolved: true }, rk = { solo: true, messages: [], world: { solved: {} } };
Mod.act(ck, 'k', rk, 0, { seen: [0, 0] }); check('not all seen yet', Mod.view(ck, 'k', rk, 0).view.allSeen, false);
Mod.act(ck, 'k', rk, 0, { seen: [1, 0] }); const vk = Mod.view(ck, 'k', rk, 0); check('keepAfterSolved: solved, view kept, all marks shown', [vk.solved, vk.keep, vk.view.allSeen], [true, true, true]);
check('keepAfterSolved: no more moves', Mod.act(ck, 'k', rk, 0, { seen: [0, 0] }).msgs.length, 0);
const c2 = { ...cfg, options: { ...cfg.options, solveWhenAllSeen: false } }, r2 = { solo: true, messages: [], world: {} };
Mod.act(c2, 'u', r2, 0, { seen: [0, 0] }); check('clue-only panel never solves', !!Mod.act(c2, 'u', r2, 0, { seen: [1, 0] }).view.justSolved, false);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
