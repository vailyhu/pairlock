// Spot the difference module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'spot_difference', title: 'S', options: { left: 'images/a.png', right: 'images/b.png', areas: [{ x: .6, y: .2, w: .1, h: .3 }, { x: .1, y: .1, w: .05, h: .05 }], okText: 'ok', missText: 'miss', foundText: 'found' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: true, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 's', r, 0, m);
check('view contains no areas before finding', Mod.view(cfg, 's', r, 0).view.found, []);
check('view has no area list', JSON.stringify(Mod.view(cfg, 's', r, 0).view).includes('0.6'), false);
let w = A({ x: .3, y: .5 }); check('miss is not a wrong attempt', [!!w.view.wrong, w.view.text, w.msgs.length], [false, 'miss', 0]);
w = A({ x: .65, y: .3 }); check('first found', [w.view.text, w.view.view.found.length, !!w.view.justSolved], ['found', 1, false]);
w = A({ x: .65, y: .3 }); check('same area twice is a miss', w.view.text, 'miss');
w = A({ x: .12, y: .12 }); check('last one solves', [w.view.justSolved, w.msgs[0].text], [true, '(GAME: SOLVED, S)']);
const c2 = { ...cfg, options: { ...cfg.options, missIsBad: true } }, r2 = { solo: true, messages: [], world: {} };
check('miss can be wrong', Mod.act(c2, 's', r2, 0, { x: .3, y: .5 }).view.wrong, true);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
