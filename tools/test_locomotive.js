// Locomotive module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'locomotive', title: 'L', sides: { a: 'Gőz', b: 'Fék' }, options: {
  controls: { a: [{ id: 'reg', label: 'Gőz', values: [['open', 'Nyitva'], ['closed', 'Zárva']], initial: 'open' }], b: [{ id: 'brake', label: 'Fék', values: [['off', 'Ki'], ['1', '1'], ['2', '2']], initial: 'off' }] },
  segments: [{ km: '10–5', track: 'flat', right: { reg: 'closed', brake: '1' } }, { km: '5–0', track: 'stop', right: { reg: 'any', brake: '2' } }],
  faults: [{ if: { reg: ['open'], brake: ['1', '2'] }, text: 'steam' }, { if: { track: ['flat'], brake: ['2'] }, text: 'early' }],
  texts: { segmentOk: ['good1', 'good2'], bad: 'wrong', ready: 'Kész', go: 'Tovább', segment: '{n}/{of} km {km}', waiting: 'wait', stopped: 'stopped', partner: 'társ' }, gauges: { speedStart: 70, speedOk: [40, 0], speedBad: 80 } } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: false, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'l', r, 0, m), B = m => Mod.act(cfg, 'l', r, 1, m), V = p => Mod.view(cfg, 'l', r, p).view;
A({ side: 'a' }); B({ side: 'b' });
check('view holds no solution', ['right', 'track', 'faults', 'flat', 'steam'].some(s => JSON.stringify(V(0)).includes(s)), false);
check('own levers only', V(0).controls.map(c => [c.id, c.mine]), [['reg', true], ['brake', false]]);
B({ set: { control: 'reg', value: 'closed' } }); check('cannot move the partner lever', V(0).controls[0].value, 'open');
B({ set: { control: 'brake', value: '1' } }); A({ ready: true });
check('go waits for both', A({ go: true }).view.text, 'wait');
B({ ready: true }); let w = A({ go: true }); check('open steam with brake: fault text', [w.view.text, V(1).last.ok, V(1).speed, V(1).segment], ['steam', false, 80, 1]);
check('no penalty message', w.msgs.length, 0);
A({ set: { control: 'reg', value: 'closed' } }); check('changing a lever clears ready', V(1).ready, { a: false, b: false });
A({ ready: true }); B({ ready: true }); w = B({ go: true }); check('right run: next segment', [w.view.text, V(0).segment, V(0).km, V(0).speed], ['good1', 2, '5–0', 40]);
A({ ready: true }); B({ ready: true }); w = A({ go: true }); check('same setting on the last segment: generic wrong', w.view.text, 'wrong');
B({ set: { control: 'brake', value: '2' } }); A({ ready: true }); B({ ready: true }); w = B({ go: true });
check('stops: solved', [w.view.justSolved, w.msgs[0].text, V(0) === null || V(0).done], [true, '(GAME: SOLVED, L)', true]);
const solo = { solo: true, messages: [], world: { solved: {} } }, S = m => Mod.act(cfg, 'l', solo, 0, m);
S({ set: { control: 'reg', value: 'closed' } }); S({ set: { control: 'brake', value: '1' } });
check('alone: both levers, go without ready', S({ go: true }).view.text, 'good1');
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
