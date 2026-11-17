// Morse module without the server, on a made-up signal: timing, restart, views. No game data.
const Mod = require('../engine/modules'), T = Mod.types.morse, cfg = { type: 'morse', title: 'T', sides: { a: 'Kar', b: 'Lámpa' }, options: { pattern: '.- -', unit: 0.1, answer: 'AT', textA: 'a', textB: 'b', badText: 'n', holdLabel: 'h', guessLabel: 'g', button: 'b', runText: 'r', idleText: 'i', traceLabel: 't' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
(async () => {
  const r = { solo: false, messages: [], world: { solved: {} }, mods: { m: { frame: { sides: { 0: 'a', 1: 'b' } }, state: { run: false, on: false, step: -1, trace: '' } } } }, log = []; let t0;
  Mod.setPush((x, id) => { const v = Mod.view(cfg, id, x, 1).view; log.push([Math.round(performance.now() - t0), v.on]); });
  const A = m => Mod.act(cfg, 'm', r, 0, m), B = m => Mod.act(cfg, 'm', r, 1, m);
  check('lamp side cannot hold the lever', (B({ hold: true }), !!r.mods.m.state.run), false);
  const va = Mod.view(cfg, 'm', r, 0).view, vb = Mod.view(cfg, 'm', r, 1).view;
  check('lever side cannot see the lamp', 'on' in va, false); check('pattern in no view', JSON.stringify([va, vb]).includes('.-'), false);
  t0 = performance.now(); A({ hold: true }); await sleep(1250); const s1 = r.mods.m.state.trace; A({ hold: false });
  const ons = []; for (let i = 0; i + 1 < log.length; i++) if (log[i][1] && !log[i + 1][1]) ons.push(log[i + 1][0] - log[i][0]);
  check('flash count and marks', s1.replace(/\s/g, ''), '•——');
  check('short and long lengths', ons.map(x => Math.abs(x - 0) >= 80), ons.map(() => true));
  console.log('   measured flashes (ms, expected 100/300/300):', ons);
  check('measured timing within 40 ms', ons.every((x, i) => Math.abs(x - [100, 300, 300][i]) <= 40), true);
  check('no signal after release', [r.mods.m.state.run, r.mods.m.state.on], [false, false]);
  const n = log.length; await sleep(300); check('no steps after release', log.length, n);
  A({ hold: true }); await sleep(50); check('new press restarts', [r.mods.m.state.step, r.mods.m.state.trace], [0, '']); 
  Mod.act(cfg, 'm', r, 0, { side: 'b' }); check('side change stops it', r.mods.m.state.run, false);
  r.mods.m.frame.sides[0] = 'a'; A({ hold: true }); Mod.leaveAll({ panels: { m: cfg } }, r, 0); check('leaving stops it', r.mods.m.state.run, false);
  check('wrong answer', !!B({ guess: 'xx' }).view.wrong, true);
  const ok = B({ guess: 'át' }); check('correct answer', [ok.view.justSolved, ok.msgs[0].text], [true, '(GAME: SOLVED, T)']);
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
