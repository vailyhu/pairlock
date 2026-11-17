// Parameter console module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const base = { params: [{ id: 'time', label: 'Napszak', values: [{ id: 'sunset', label: 'Naplemente' }, { id: 'night', label: 'Éjszaka' }], initial: 'sunset' }, { id: 'torches', label: 'Fáklyák', values: [{ id: 'lit', label: 'Égnek' }, { id: 'out', label: 'Kialudtak' }], initial: 'lit' }],
  lockedText: 'zárva', texts: { wrongCode: 'rossz kód', unlockedText: 'nyitva' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
Mod.setPush(() => {});
// locked by a world condition
const c1 = { type: 'param_console', title: 'P1', options: { ...base, unlock: { var: 'owner', is: 'yes' } } };
const r1 = { solo: true, messages: [], world: { solved: {}, vars: {} } }, A = m => Mod.act(c1, 'p', r1, 0, m), V = () => Mod.view(c1, 'p', r1, 0).view;
check('locked: no controls, no code field', [V().locked, V().params.length, V().needsCode, V().lockedText], [true, 0, false, 'zárva']);
check('locked: moves refused', A({ param: 'time', value: 'night' }).msgs.length, 0);
r1.world.vars.owner = 'yes';
check('open once the condition holds', [V().locked, V().params.map(p => p.value)], [false, ['sunset', 'lit']]);
check('a change sends a silent world message', A({ param: 'time', value: 'night' }).msgs, [{ text: '(GAME: PARAM time night)', silent: true }]);
check('same value again sends nothing', A({ param: 'time', value: 'night' }).msgs.length, 0);
check('unknown value ignored', [A({ param: 'time', value: 'noon' }).msgs.length, A({ param: 'fog', value: 'x' }).msgs.length], [0, 0]);
check('torches out', A({ param: 'torches', value: 'out' }).msgs[0].text, '(GAME: PARAM torches out)');
check('values saved', r1.mods.p.state.values, { time: 'night', torches: 'out' });
check('never solved', Mod.view(c1, 'p', r1, 0).solved, false);
// locked by a code
const c2 = { type: 'param_console', title: 'P2', options: { ...base, unlockCode: 'RÓZSA-12' } };
const r2 = { solo: true, messages: [], world: { solved: {}, vars: {} } }, B = m => Mod.act(c2, 'q', r2, 0, m), W2 = () => Mod.view(c2, 'q', r2, 0).view;
check('code lock: field shown, code not in the view', [W2().needsCode, /ROZSA|RÓZSA/i.test(JSON.stringify(W2()))], [true, false]);
check('wrong code', [B({ code: 'tulipán' }).view.text, W2().locked], ['rossz kód', true]);
check('right code, accents and dash ignored', [B({ code: 'rozsa 12' }).view.text, W2().locked], ['nyitva', false]);
check('custom message format', Mod.act({ ...c2, options: { ...c2.options, message: 'SET {param}={value}' } }, 'q', r2, 0, { param: 'time', value: 'night' }).msgs[0].text, '(GAME: SET time=night)');
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
