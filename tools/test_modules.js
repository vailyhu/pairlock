// Code lock module: with a made-up code and over HTTP on an own Őrség test game. Never prints the code.
const Mod = require('../engine/modules'), K = Mod.types.code_lock, B = process.env.B || 'http://localhost:8800', fs = require('fs');
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
check('correct code', !!K.act({ answer: 'Árvíztűrő 12', okText: 'y', badText: 'n' }, {}, { guess: 'arvizturo-12' }, { id: 'x' }).solved, true);
check('wrong code', !!K.act({ answer: 'alma', okText: 'y', badText: 'n' }, {}, { guess: 'korte' }, { id: 'x' }).bad, true);
check('view contains no solution', Object.keys(K.view({ kind: 'text', answer: 'titok', hash: 'ff' })).some(k => /answer|hash/.test(k)), false);
// The browser scripts must at least run: node --check does not catch errors at load time.
{ const vm = require('vm'), w = {}; vm.runInNewContext(fs.readFileSync('public/modules.js', 'utf8'), { window: w, document: {} }); check('frame script defines its global', typeof w.DuoModules?.open, 'function'); for (const d of fs.readdirSync('modules')) if (fs.existsSync(`modules/${d}/client.js`)) { const x = {}; vm.runInNewContext(fs.readFileSync(`modules/${d}/client.js`, 'utf8'), { window: x }); check(`${d} client registers`, typeof x.DuoTypes?.[d], 'function'); } }
const J = async (u, b, m) => { const r = await fetch(B + u, { method: m || (b ? 'POST' : 'GET'), body: b && JSON.stringify(b) }); return { code: r.status, body: await r.json().catch(() => null) }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const run = (await J('/api/runs', { game: 'orseg', solo: false, names: ['Tesztegy', 'Tesztketto'] })).body, T = run.tokens[0], M = m => J(`/api/p/${T}/mod`, m);
  try {
    const st = (await J(`/api/p/${T}/state`)).body, P = JSON.parse(fs.readFileSync('games/orseg/panels.json', 'utf8'));
    check('module panels sent to client', st.game.modPanels.length, Object.keys(P).length);
    check('no legacy panel script', (await fetch(`${B}/g/orseg/jatek.js`)).status, 404);
    check('panels.json not served', (await fetch(`${B}/g/orseg/panels.json`)).status, 404);
    check('server.js not served', (await fetch(`${B}/g/orseg/server.js`)).status, 404);
    check('forged game message rejected', (await J(`/api/p/${T}/message`, { text: '(GAME: GYÚJTÁS K-20, x)' })).code, process.env.DIRECT ? 200 : 403);
    check('forged solve rejected', (await J(`/api/p/${T}/message`, { text: `(GAME: SOLVED, ${P.code_lock_stairs.title})` })).code, process.env.DIRECT ? 200 : 403);
    let v = (await M({ id: 'code_lock_stairs', move: { open: true } })).body;
    check('no answer when opening', JSON.stringify(v).includes(P.code_lock_stairs.options.answer), false);
    check('hint hidden before request', v.hints.length, 0);
    v = (await M({ id: 'code_lock_stairs', move: { guess: 'xxxx' } })).body; await sleep(300);
    check('wrong attempt', v.wrong, true);
    let s = (await J(`/api/p/${T}/state`)).body;
    check('wrong attempt costs a mile', /Zrínyi: 11 mérföld/.test(s.messages[s.messages.length - 1].text), true);
    v = (await M({ id: 'code_lock_stairs', move: { hint: true } })).body; await sleep(300);
    check('hint on request', v.hints.length, 1);
    s = (await J(`/api/p/${T}/state`)).body; check('hint costs a mile', /Zrínyi: 10 mérföld/.test(s.messages[s.messages.length - 1].text), true);
    const code = P.code_lock_stairs.options.answer;
    v = (await M({ id: 'code_lock_stairs', move: { guess: code } })).body; await sleep(600);
    check('correct code opens', v.justSolved, true);
    v = (await M({ id: 'code_lock_stairs', move: { open: true } })).body; check('solved afterwards', v.solved, true);
    v = (await M({ id: 'code_lock_stairs', move: { guess: 'xxxx' } })).body; check('solved lock does not penalise', !!v.wrong, false);
  } finally { await J(`/api/runs/${run.id}?hard=1`, null, 'DELETE'); }
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
