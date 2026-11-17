// Puzzle module without the server, on made-up settings. No game data.
const Mod = require('../engine/modules'), T = Mod.types.puzzle;
const { neighbourPairs, mixedOrder } = require('../modules/puzzle/server.ts');
const opt = { image: 'x.png', cols: 3, rows: 4, jitter: .5, snap: .05, trayWidth: 1, okText: 'done', sharedNote: 'shared' }, cfg = { type: 'puzzle', title: 'P', options: opt };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
Mod.setPush(() => {});
const r = { solo: false, messages: [], world: { solved: {} } }, view = () => Mod.view(cfg, 'p', r, 0).view, A = m => Mod.act(cfg, 'p', r, 0, m);
let v = view();
check('piece count follows the settings', v.pieces.length, 12);
check('all pieces start outside the image', v.pieces.every(p => p.x >= 1), true);
check('all pieces stay on the board', v.pieces.every(p => p.x + p.width <= 2.0201 && p.y >= 0 && p.y + p.height <= 1.0001), true);
check('other sizes work', [T.view({ ...opt, cols: 5, rows: 2 }, T.init({ ...opt, cols: 5, rows: 2 }), { solo: true }).pieces.length, T.view({ ...opt, cols: 1, rows: 1 }, T.init({ ...opt, cols: 1, rows: 1 }), { solo: true }).pieces.length], [10, 1]);
check('solo game has no shared note', T.view(opt, T.init(opt), { solo: true }).note, undefined);
// Neighbouring pieces must trace the same edge, or gaps appear in the finished image.
{ const s = T.init(opt), ps = T.view(opt, s, { solo: true }).pieces.sort((a, b) => a.id - b.id), abs = p => p.outline.map(([x, y]) => `${(x + p.corner[0]).toFixed(6)},${(y + p.corner[1]).toFixed(6)}`);
  let ok = true; for (let i = 0; i < 12; i++) { if ((i + 1) % 3) { const a = abs(ps[i]), b = new Set(abs(ps[i + 1])); if (a.filter(q => b.has(q)).length < 4) ok = false; } if (i + 3 < 12) { const a = abs(ps[i]), b = new Set(abs(ps[i + 3])); if (a.filter(q => b.has(q)).length < 4) ok = false; } }
  check('neighbours share their edge', ok, true); }
// Mixing, measured over many games.
{ const N = 500; let pairs = 0, same = 0, firstRow = 0; const seen = new Set(), place = Array.from({ length: 12 }, () => Array(12).fill(0));
  for (let i = 0; i < N; i++) { const o = mixedOrder(12, 3, 3); pairs += neighbourPairs(o, 3, 3); seen.add(o.join()); if (o.every((p, s) => p === s)) same++; if (o[0] === 0 && o[1] === 1 && o[2] === 2) firstRow++; o.forEach((p, s) => place[p][s]++); }
  check('no real neighbours side by side', pairs, 0); check('never in original order', same, 0); check('first row never intact', firstRow, 0); check('every game differs', seen.size > N * .99, true);
  const counts = place.flat(); check('every piece reaches every slot', Math.min(...counts) > 0, true); console.log(`   slot visits per piece and slot, expected ${Math.round(N / 12)}: min ${Math.min(...counts)}, max ${Math.max(...counts)}`); }
{ const first = s => T.view(opt, s, { solo: true }).pieces.find(p => p.id === 4).corner.join(); check('different games get different cuts', first(T.init(opt)) !== first(T.init(opt)), true); }
// Moves.
const byId = id => view().pieces.find(p => p.id === id), target = id => byId(id).corner;
A({ piece: 0, x: .9, y: .9, drop: true }); check('far drop does not lock', byId(0).placed, false);
A({ piece: 0, x: target(0)[0] + .01, y: target(0)[1] + .01, live: true }); check('drag near does not lock', byId(0).placed, false);
A({ piece: 0, x: target(0)[0] + .01, y: target(0)[1] + .01, drop: true }); check('close drop locks exactly', [byId(0).placed, byId(0).x, byId(0).y], [true, target(0)[0], target(0)[1]]);
A({ piece: 0, x: 1.5, y: .5, drop: true }); check('locked piece does not move', byId(0).x, target(0)[0]);
A({ piece: 99, x: 0, y: 0, drop: true }); A({ piece: 1, x: NaN, y: 0, drop: true }); check('bad moves are ignored', byId(1).placed, false);
A({ piece: 1, x: 99, y: -5 }); { const p = byId(1); check('position stays on the board', p.x + p.width <= 2.0201 && p.y === 0, true); }
let last; for (let i = 1; i < 12; i++) last = A({ piece: i, x: target(i)[0], y: target(i)[1], drop: true });
check('last piece solves', [last.view.justSolved, last.msgs[0].text], [true, '(GAME: SOLVED, P)']);
check('state is plain JSON', JSON.parse(JSON.stringify(r.mods.p.state)).pieces.length, 12);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
