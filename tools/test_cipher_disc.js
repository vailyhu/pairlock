// Cipher disc module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const outer = 'ABCDE'.split(''), inner = ['1', '2', '3', '4', '5'], key = 2;
const enc = s => s.split('').map(c => outer.includes(c) ? inner[(outer.indexOf(c) + key) % 5] : c);
const cfg = { type: 'cipher_disc', title: 'C', keepAfterSolved: true, options: { outer, inner, cipher: enc('BAD CAB'), key, plainText: 'Bád cáb.', texts: { left: '<', right: '>', reading: 'r', solved: 'S:', read: 'read', wrong: 'no' } } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: true, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'c', r, 0, m), V = () => Mod.view(cfg, 'c', r, 0).view;
check('view holds no key or plain text', ['"key"', 'Bád'].some(s => JSON.stringify(V()).includes(s)), false);
check('reads as nonsense at rotation 0', V().reading, 'DCA ECD');
check('read at the wrong rotation', A({ read: true }).view.text, 'no');
A({ rotate: 1 }); A({ rotate: 1 }); check('reads at the key', V().reading, 'BAD CAB');
A({ rotate: 1 }); A({ rotate: -1 }); check('turning past it does not solve', V().plain, undefined);
const w = A({ read: true }); check('read at the key solves', [w.view.justSolved, w.msgs[0].text], [true, '(GAME: SOLVED, C)']);
check('plain text after solving', Mod.view(cfg, 'c', r, 0).view.plain, 'Bád cáb.');
A({ rotate: -1 }); check('wraps around', ((Mod.view(cfg, 'c', r, 0).view || {}).rot), 2);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
