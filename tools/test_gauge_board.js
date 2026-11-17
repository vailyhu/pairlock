// Gauge board module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'gauge_board', title: 'G', sides: { a: 'Controls', b: 'Gauges' }, options: { matrix: [[10, 0, 0], [0, 10, 5]], band: [40, 60], controls: ['x', 'y'], controlMax: 9, gaugeMax: 100, textA: 'a', textB: 'b', confirmLabel: 'c' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: false, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'g', r, 0, m), B = m => Mod.act(cfg, 'g', r, 1, m);
A({ side: 'a' }); B({ side: 'b' });
const va = Mod.view(cfg, 'g', r, 0).view, vb = Mod.view(cfg, 'g', r, 1).view;
check('controls side has no gauges', 'gauges' in va, false);
check('gauge side has no controls', 'controls' in vb, false);
check('weights in no view', JSON.stringify([va, vb]).includes('matrix'), false);
check('initial gauges', vb.gauges, [0, 5]);
check('confirm rejected out of band', !!B({ confirm: true }).view.justSolved, false);
B({ control: 0, delta: 1 }); check('gauge side cannot set controls', Mod.view(cfg, 'g', r, 0).view.controls, [0, 0]);
for (let i = 0; i < 5; i++) A({ control: 0, delta: 1 }); for (let i = 0; i < 5; i++) A({ control: 1, delta: 1 });
check('gauges follow controls', Mod.view(cfg, 'g', r, 1).view.gauges, [50, 55]);
check('ready in band', Mod.view(cfg, 'g', r, 1).view.ready, true);
check('controls side cannot confirm', !!A({ confirm: true }).view.justSolved, false);
for (let i = 0; i < 20; i++) A({ control: 0, delta: 1 }); check('control capped', Mod.view(cfg, 'g', r, 0).view.controls[0], 9);
for (let i = 0; i < 4; i++) A({ control: 0, delta: -1 });
const ok = B({ confirm: true }); check('confirm solves', [ok.view.justSolved, ok.msgs[0].text], [true, '(GAME: SOLVED, G)']);
check('state is saved plain JSON', JSON.parse(JSON.stringify(r.mods.g.state)).controls.length, 2);
// sides by place, one of them a one-person room (cage / lift): the side follows where each stands, elsewhere nothing to do
const pc = { ...cfg, title: 'H', sides: { a: { at: 'cage' }, b: { at: 'lift' } } }, rp = { solo: false, messages: [], world: { solved: {}, loc: ['cage', 'lift'] } }, PV = p => Mod.view(pc, 'h', rp, p);
check('at sides: controls in the cage, gauges in the lift', [PV(0).side, PV(0).view.canControl, PV(1).side, PV(1).view.canRead], ['a', true, 'b', true]);
Mod.act(pc, 'h', rp, 0, { control: 1, delta: 1 }); check('at sides: the cage turns a wheel the lift reads', PV(1).view.gauges, [0, 15]);
rp.world.loc[1] = 'hall'; check('at sides: elsewhere neither half', [PV(1).side, PV(1).view.canControl, PV(1).view.canRead, Mod.act(pc, 'h', rp, 1, { control: 0, delta: 1 }).view.view.canControl], [null, false, false, false]);
const rs = { solo: true, messages: [], world: { solved: {}, loc: ['lift', 'lift'] } }; check('at sides alone: the half where one stands', Mod.view(pc, 'i', rs, 0).view.canRead, true);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
