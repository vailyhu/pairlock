// Camera guide module without the server, on made-up pictures and values. No game data.
const Mod = require('../engine/modules');
const opts = { imageA: 'images/cam.jpg', imageB: 'images/room.jpg', target: [0.6, 0.3, 0.7, 0.4], okText: 'ok', missText: 'miss', waitText: 'wait', hintLine: 'signal', awayText: 'away',
  dirTexts: { line: 'fell {dir} ({dist})', left: 'L', right: 'R', up: 'U', down: 'D', join: '+', near: 'near', mid: 'mid', far: 'far' } };
const cfg = { type: 'camera_guide', title: 'C', sides: { a: { at: 'server' }, b: { at: 'spa' } }, options: opts };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
let pushes = 0; Mod.setPush(() => { pushes++; });
const r = { solo: false, messages: [], world: { solved: {}, loc: ['server', 'hall'] } }, A = (p, m) => Mod.act(cfg, 'c', r, p, m), V = p => Mod.view(cfg, 'c', r, p);
check('side a by place, b elsewhere', [V(0).side, V(1).side, V(1).view.awayText, V(1).view.canTap], ['a', null, 'away', false]);
check('a waits alone', [V(0).view.waiting, V(0).view.imageA, V(0).view.imageB, V(0).view.hintLine], ['wait', 'images/cam.jpg', undefined, 'signal']);
r.world.loc = ['hall', 'spa']; check('b alone cannot tap', [V(1).view.waiting, V(1).view.canTap, A(1, { x: .65, y: .35 }).view.text, r.mods.c.state.n], ['wait', false, 'wait', 0]);
r.world.loc = ['server', 'spa']; check('both at place: no wait, b taps', [V(0).view.waiting, V(1).view.canTap, V(0).view.canTap], [undefined, true, false]);
check('b sees only its picture, no hint line', [V(1).view.imageA, V(1).view.imageB, V(1).view.hintLine], [undefined, 'images/room.jpg', undefined]);
check('views hold no target', /0\.6|0\.7|target/.test(JSON.stringify(V(0)) + JSON.stringify(V(1))), false);
check('a cannot tap', [A(0, { x: .65, y: .35 }).msgs.length, r.mods.c.state.n], [0, 0]);
check('bad move ignored', [A(1, { x: 'a', y: 2 }).msgs.length, r.mods.c.state.n], [0, 0]);
pushes = 0; let w = A(1, { x: .2, y: .1 });
check('miss: not wrong, b gets miss text', [!!w.view.wrong, w.view.text, w.msgs.length, pushes > 0], [false, 'miss', 0, true]);
check('a gets direction and distance', V(0).view.feedback, 'fell L+U (far)');
check('b gets no direction', V(1).view.feedback, undefined);
check('tap shown on both', [V(0).view.poke.x, V(0).view.poke.onA, V(1).view.poke.hit, V(1).view.poke.n], [.2, true, false, 1]);
A(1, { x: .65, y: .45 }); check('near, below', V(0).view.feedback, 'fell D (near)');
A(1, { x: .85, y: .35 }); check('mid, right', V(0).view.feedback, 'fell R (mid)');
w = A(1, { x: .65, y: .35 }); check('hit solves', [w.view.justSolved, w.msgs[0].text], [true, '(GAME: SOLVED, C)']);
check('solved panel takes no more taps', A(1, { x: .65, y: .35 }).msgs.length, 0);
// alone, side by place: no waiting, can walk between
const r2 = { solo: true, messages: [], world: { solved: {}, loc: ['spa', 'spa'] } };
check('alone at b: taps without waiting', [Mod.view(cfg, 'd', r2, 0).view.canTap, Mod.act(cfg, 'd', r2, 0, { x: .1, y: .9 }).view.text], [true, 'miss']);
r2.world.loc[0] = 'server'; check('alone at a: sees the tap and direction', [Mod.view(cfg, 'd', r2, 0).view.poke.x, Mod.view(cfg, 'd', r2, 0).view.feedback], [.1, 'fell L+D (far)']);
// alone without sides: both pictures; {x,y,w,h} target; marker; showOnA off; no dirTexts; missIsBad
const c3 = { type: 'camera_guide', title: 'E', options: { ...opts, target: { x: .1, y: .1, w: .1, h: .1 }, marker: { x: .15, y: .15, r: .05 }, showOnA: false, dirTexts: undefined, missIsBad: true } };
const r3 = { solo: true, messages: [], world: { solved: {} } }, S = m => Mod.act(c3, 'e', r3, 0, m), V3 = () => Mod.view(c3, 'e', r3, 0).view;
check('both: two pictures and the marker', [V3().side, !!V3().imageA, !!V3().imageB, V3().marker], ['both', true, true, { x: .15, y: .15, r: .05 }]);
w = S({ x: .5, y: .5 }); check('missIsBad, no dirTexts, tap not on A', [w.view.wrong, V3().feedback, V3().poke.onA], [true, undefined, false]);
check('xywh target hit', S({ x: .15, y: .19 }).view.justSolved, true);
// sides picked by label (no at): partner not picked yet means waiting
const c4 = { type: 'camera_guide', title: 'F', sides: { a: 'eye', b: 'hand' }, options: opts }, r4 = { solo: false, messages: [], world: { solved: {} } };
Mod.act(c4, 'f', r4, 1, { side: 'b' }); check('picked b, partner not picked: wait', Mod.view(c4, 'f', r4, 1).view.waiting, 'wait');
Mod.act(c4, 'f', r4, 0, { side: 'a' }); check('both picked: tap works', Mod.act(c4, 'f', r4, 1, { x: .65, y: .35 }).view.justSolved, true);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
