// Airlock module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'airlock', title: 'L', sides: { a: 'Pult', b: 'Ajtó' }, options: {
  controls: [
    { id: 'pump', side: 'a', label: 'Szivattyú', values: [{ id: 'off', label: 'ki' }, { id: 'slow', label: 'lassú' }, { id: 'fast', label: 'gyors' }], start: 'off' },
    { id: 'heat', side: 'b', label: 'Fűtés', values: [{ id: 'off', label: 'ki' }, { id: 'on', label: 'be' }], start: 'off' },
    { id: 'latch', side: 'b', label: 'Retesz', values: [{ id: 'shut', label: 'zárva' }, { id: 'open', label: 'nyitva' }], start: 'shut' },
  ],
  gauges: [{ id: 'p', side: 'a', label: 'Nyomás', unit: 'kPa', max: 100, start: 0 }, { id: 't', side: 'b', label: 'Tömítés', unit: '°C', max: 40, start: -20 }],
  steps: [
    { control: 'pump', value: 'slow', if: { var: 'door', is: 'shut' }, blockedText: 'A nyomás nem áll meg.', gauges: { p: 60 }, text: 'Nő a nyomás.' },
    { control: 'heat', value: 'on', gauges: { t: 15 }, text: 'Melegszik a tömítés.' },
    { control: 'latch', value: 'open', gauges: { p: 100 }, text: 'Nyílik.' },
  ],
  faults: [{ control: 'latch', value: 'open', before: 2, text: 'Sziszeg, a nyomás leesik.', back: 0 }, { control: 'pump', value: 'fast', text: 'Túl gyors, a szelep lezár.' }],
  textA: 'a', textB: 'b', wrongText: 'Semmi.', okText: 'Kész.', resetLabel: 'Újra' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: false, messages: [], world: { solved: {}, vars: { door: 'open' } } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'l', r, 0, m), B = m => Mod.act(cfg, 'l', r, 1, m), V = p => Mod.view(cfg, 'l', r, p).view;
A({ side: 'a' }); B({ side: 'b' });
check('side a sees only its controls and gauges', [V(0).controls.map(c => c.id), V(0).gauges.map(g => g.id)], [['pump'], ['p']]);
check('side b sees only its controls and gauges', [V(1).controls.map(c => c.id), V(1).gauges.map(g => g.id)], [['heat', 'latch'], ['t']]);
check('no order or faults in any view', /steps|faults|before|back/.test(JSON.stringify([V(0), V(1)])), false);
A({ set: { control: 'pump', value: 'slow' } }); check('world condition blocks the step', [V(0).controls[0].value, V(0).note], ['off', 'A nyomás nem áll meg.']);
r.world.vars.door = 'shut';
B({ set: { control: 'pump', value: 'slow' } }); check('other side cannot move it', V(0).controls[0].value, 'off');
A({ set: { control: 'pump', value: 'slow' } }); check('step done, gauge and shared line', [V(0).gauges[0].value, V(1).note], [60, 'Nő a nyomás.']);
A({ set: { control: 'pump', value: 'fast' } }); check('fault without back: move undone, step kept', [V(0).controls[0].value, V(0).note, r.mods.l.state.step], ['slow', 'Túl gyors, a szelep lezár.', 1]);
B({ set: { control: 'latch', value: 'open' } }); check('fault with back: to the start', [r.mods.l.state.step, V(0).gauges[0].value, V(1).controls[1].value], [0, 0, 'shut']);
A({ set: { control: 'pump', value: 'slow' } }); B({ set: { control: 'latch', value: 'shut' } });
check('a move to the current position does nothing', r.mods.l.state.step, 1);
B({ set: { control: 'heat', value: 'on' } }); check('second step', [r.mods.l.state.step, V(1).gauges[0].value], [2, 15]);
const ok = B({ set: { control: 'latch', value: 'open' } }); check('last step solves', [ok.view.justSolved, ok.msgs[0].text], [true, '(GAME: SOLVED, L)']);
check('done in state', r.mods.l.state.step, 3);
const r2 = { solo: true, messages: [], world: { solved: {}, vars: { door: 'shut' } } };
check('alone: one player sees both sides', [Mod.view(cfg, 'l', r2, 0).view.controls.length, Mod.view(cfg, 'l', r2, 0).view.gauges.length], [3, 2]);
Mod.act(cfg, 'l', r2, 0, { set: { control: 'pump', value: 'slow' } }); Mod.act(cfg, 'l', r2, 0, { reset: true });
check('reset goes back to the start', [r2.mods.l.state.step, r2.mods.l.state.controls.pump], [0, 'off']);
check('state is saved plain JSON', Object.keys(JSON.parse(JSON.stringify(r.mods.l.state))).sort(), ['controls', 'gauges', 'note', 'step']);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
