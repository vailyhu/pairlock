// Scratch reveal module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'scratch_reveal', title: 'R', options: { top: 'images/t.png', bottom: 'images/b.png', brush: 0.1, need: 0.5, cols: 16, rows: 12, okText: 'ok' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: false, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'x', r, 0, m);
check('starts covered', Mod.view(cfg, 'x', r, 1).view.done, 0);
let w = A({ points: [[.5, .5]], live: true }); const d = Mod.view(cfg, 'x', r, 1).view.done;
check('a dab uncovers a round spot', d > 0.02 && d < 0.08, true);
check('live move never solves', !!w.view.justSolved, false);
A({ points: [[NaN, 1], ['x', 2]] }); check('bad points ignored', Mod.view(cfg, 'x', r, 1).view.done, d);
const row = y => Array.from({ length: 11 }, (_, i) => [i / 10, y]);
w = A({ points: [...row(.1), ...row(.3)], live: true }); check('not solved while live even past the need', !!w.view.justSolved, false);
w = A({ points: [...row(.5), ...row(.7)] }); check('release past the need solves', [w.view.justSolved, w.msgs[0].text], [true, '(GAME: SOLVED, R)']);
check('mask saved as plain text', typeof JSON.parse(JSON.stringify(r.mods.x.state)).mask, 'string');
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
