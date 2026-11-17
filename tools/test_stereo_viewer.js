// Stereo viewer module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'stereo_viewer', title: 'S', keepAfterSolved: true, options: { left: 'images/l.png', right: 'images/r.png', target: { dx: -0.05, dy: 0.02 }, tolerance: 0.01, range: 0.1, okText: 'ok' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: true, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 's', r, 0, m), V = () => Mod.view(cfg, 's', r, 0).view;
check('view holds no target', JSON.stringify(V()).includes('target') || JSON.stringify(V()).includes('-0.05'), false);
A({ dx: 0.5, dy: -0.5 }); check('clamped to range', [V().dx, V().dy], [0.1, -0.1]);
let w = A({ dx: -0.03, dy: 0.02 }); check('off target: not solved', [w.view.justSolved || false, V().solved], [false, false]);
w = A({ dx: -0.056, dy: 0.015 }); check('within tolerance: solved and snapped', [w.view.justSolved, w.msgs[0].text, V().dx, V().dy], [true, '(GAME: SOLVED, S)', -0.05, 0.02]);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
