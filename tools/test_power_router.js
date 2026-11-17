// Power router module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'power_router', title: 'P', options: {
  consumers: [
    { id: 'life', label: 'Életfenntartás', fixed: true },
    { id: 'hab', label: 'Lakómodul', room: 'hab', start: true },
    { id: 'lab', label: 'Labor', room: 'lab', start: true },
    { id: 'radio', label: 'Rádió', start: true },
    { id: 'store', label: 'Raktár', room: 'store' },
  ],
  capacity: 3, fullIf: { var: 'power', is: 'full' },
  text: 't', fullText: 'Kapacitás: {capacity} modul.', occupiedText: 'A(z) {label} modulban jelenlét.', fullPowerText: 'Teljes áram.',
  onLabel: 'be', offLabel: 'ki', fixedLabel: 'mindig', usageText: '{used}/{capacity}' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: false, messages: [], world: { solved: {}, vars: {}, loc: ['control', 'lab'] } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'p', r, 0, m), V = () => Mod.view(cfg, 'p', r, 0).view, on = () => V().consumers.filter(c => c.on).map(c => c.id);
check('start: fixed and start ones on', [on(), V().status], [['life', 'hab', 'lab', 'radio'], '3/3']);
check('switching on beyond capacity is refused', [A({ toggle: 'store' }).msgs.length, on().includes('store')], [0, false]);
const msgs = A({ toggle: 'radio' }).msgs.map(m => m.text);
check('switching off sends a world message', [msgs, on().includes('radio')], [['(GAME: POWER radio off)'], false]);
check('occupied room cannot be switched off', [A({ toggle: 'lab' }).msgs.length, on().includes('lab')], [0, true]);
check('then there is room for another', [A({ toggle: 'store' }).msgs.map(m => m.text), V().status], [['(GAME: POWER store on)'], '3/3']);
check('fixed one cannot be switched', [A({ toggle: 'life' }).msgs.length, on().includes('life')], [0, true]);
r.world.vars.power = 'full';
check('full power: everything on, nothing switches', [on().length, V().full, V().status, A({ toggle: 'hab' }).msgs.length], [5, true, 'Teljes áram.', 0]);
check('no capacity rules or rooms leak into the view', /room|capacity|fullIf/.test(JSON.stringify(V())), false);
check('never solved', !!r.mods.p.solved, false);
check('state is saved plain JSON', JSON.parse(JSON.stringify(r.mods.p.state)).on.store, true);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
