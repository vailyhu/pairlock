// Guard round module without the server, on made-up values (fast clock), sides by place. No game data.
const Mod = require('../engine/modules');
const st = [{ id: 's1', label: 'Kapu', x: .1, y: .2 }, { id: 's2', label: 'Tó', x: .5, y: .5, danger: true }, { id: 's3', label: 'Fal', x: .9, y: .8 }];
const opts = { stations: st, stepSeconds: 0.06, clock: { startMinute: 23 * 60 + 50, minutesPerStation: 5 }, steps: ['egy', 'kettő', 'három'], stepTexts: ['egy kész', 'kettő kész'], caughtText: 'elkaptak', doneText: 'kész', watchText: 'figyelsz', workText: 'dolgozol', background: 'images/garden.png', awayText: 'messze' };
const cfg = { type: 'guard_round', title: 'G', sides: { a: { at: 'gallery' }, b: { at: 'hall' } }, options: opts };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const sleep = ms => new Promise(f => setTimeout(f, ms));
let pushes = 0; Mod.setPush(() => { pushes++; });
/** Waits until the guard stands at station i (as the watcher sees it), plus a margin into the station. */
async function until(V, i) { for (let n = 0; n < 200; n++) { if (V(0).view.watch.at === i) { await sleep(5); if (V(0).view.watch.at === i) return; } await sleep(4); } throw new Error('guard never reached ' + i); }
(async () => {
  const r = { solo: false, messages: [], world: { solved: {}, loc: ['gallery', 'hall'] } };
  const A = (p, m) => Mod.act(cfg, 'g', r, p, m), V = p => Mod.view(cfg, 'g', r, p);
  check('sides by place', [V(0).side, V(1).side], ['a', 'b']);
  const w = V(0).view.watch, k = V(1).view;
  check('watcher sees stations with danger, no clock', [w.stations.map(s => s.danger), w.background, !!V(0).view.work], [[false, true, false], 'images/garden.png', false]);
  check('worker sees clock and steps, no stations or danger', [k.work.clock, k.work.steps.length, !!k.watch, /danger|Tó/.test(JSON.stringify(k))], ['23:50', 3, false, false]);
  check('paused until opened', V(0).view.running, false);
  A(0, { watch: true }); check('watch starts the guard', V(1).view.running, true);
  await sleep(70); check('the guard moves on and the clock with him', [V(0).view.watch.at, V(1).view.work.clock], [1, '23:55']);
  check('timer pushes views', pushes >= 2, true);
  check('the watcher cannot work', A(0, { step: 0 }).view.text, undefined);
  check('a step out of order is ignored', [A(1, { step: 1 }).msgs.length, V(1).view.work.done], [0, 0]);
  await until(V, 2); let x = A(1, { step: 0 }); check('a step at a safe station counts', [x.view.text, V(0).view.last, V(1).view.work.done], ['egy kész', 'egy kész', 1]);
  A(1, { step: 1 }); await until(V, 1); x = A(1, { step: 2 });
  check('caught at a dangerous station: progress lost, message, not bad', [x.view.text, x.view.wrong, x.msgs.map(m => [m.text, m.silent]), V(1).view.work.done, V(0).view.last], ['elkaptak', false, [['(GAME: GUARD CAUGHT)', false]], 0, 'elkaptak']);
  Mod.leaveAll({ panels: { g: cfg } }, r, 0); const at = V(0).view.watch.at, clk = V(1).view.work.clock;
  await sleep(150); check('leaving pauses the guard where he stands', [V(0).view.running, V(0).view.watch.at, V(1).view.work.clock], [false, at, clk]);
  A(1, { watch: true }); check('opening again goes on from there', [V(0).view.running, V(0).view.watch.at], [true, at]);
  for (let i = 0; i < 3; i++) { await until(V, 0); x = A(1, { step: i }); }
  check('all steps without being caught solves', [x.view.justSolved, x.view.text, x.msgs[0].text], [true, 'kész', '(GAME: SOLVED, G)']);
  r.world.loc[1] = 'kitchen'; check('elsewhere: away text, no moves', [V(1).side, Mod.view({ ...cfg, title: 'H' }, 'h', r, 1).view.awayText], [null, 'messze']);
  const c2 = { ...cfg, title: 'C', options: { ...opts, caughtMessage: 'ALARM UP' } }, r2 = { solo: true, messages: [], world: { solved: {}, loc: ['hall', 'hall'] } };
  check('alone at the work place: worker view', [Mod.view(c2, 'c', r2, 0).side, !!Mod.view(c2, 'c', r2, 0).view.work], ['b', true]);
  Mod.act(c2, 'c', r2, 0, { watch: true }); const V2 = p => Mod.view({ ...c2, sides: undefined }, 'c', { ...r2, solo: true }, p);
  await until(V2, 1); check('own caught message', Mod.act(c2, 'c', r2, 0, { step: 0 }).msgs[0].text, '(GAME: ALARM UP)');
  const plain = { ...cfg, sides: undefined, title: 'P' }; const vb = Mod.view(plain, 'p', r2, 0).view;
  check('without sides alone: both views', [vb.side, !!vb.watch, !!vb.work], ['both', true, true]);
  check('the state saves no option', JSON.stringify(r.mods.g.state).includes('Tó'), false);
  Mod.leaveAll({ panels: { c: c2, p: plain } }, r2, 0);
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
