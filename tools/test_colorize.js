// Colorizer checks offline: made-up model answers, good and deliberately bad, on a small world. No model call, no server.
// Run: node tools/test_colorize.js
const W = require('../engine/world'), C = require('../engine/colorize'), L = require('../locales/hu.json').engine;
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}${ok ? '' : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`); };
const w = {
  start: 'hall', sensitiveWords: ['kulcs', 'fiók'], texts: { ...L.world, inventoryMarker: 'Leltár' },
  rooms: {
    hall: { name: 'Előszoba', aliases: ['bejárat'], text: 'Az előszobában ezt látjátok: egy kerek tükör, egy konzolasztal{contents@console:, rajta }, és a lépcső.', details: ['reggeli fény', 'viaszolt padló szaga'], exits: { kitchen: { aliases: ['konyha'] } } },
    kitchen: { name: 'Konyha', text: 'A konyhában egy kredenc áll.', exits: { hall: {} } },
  },
  items: [
    { id: 'mirror', name: 'tükör', location: 'hall', text: 'Kerek tükör aranykeretben.', details: ['aranyozott keret', 'kissé foltos üveg'] },
    { id: 'console', name: 'konzolasztal', location: 'hall', text: 'Keskeny konzolasztal.' },
    { id: 'letter', name: 'boríték', location: 'console', rel: 'on', mention: 'egy boríték', carry: {}, text: 'A borítékon: „A leltározóknak”.' },
    { id: 'key', name: 'sárgaréz kulcs', aliases: ['kulcs'], location: 'console', rel: 'under', hidden: true, text: 'Kis kulcs.' },
    { id: 'dresser', name: 'kredenc', location: 'kitchen', text: 'Festett kredenc, 1974-es.' },
    { id: 'ledger', name: 'számlakönyv', location: 'kitchen', literal: true, text: 'Számlák.' },
  ],
  actions: {}, rules: [], vars: {}, status: '',
};
w.items.find(i => i.id === 'key').hidden = true; w.rules.push({ on: 'never', do: { reveal: ['key'] } });
const s = W.initState(w), names = ['Jancsi', 'Juliska'];
const res = W.run(w, s, [{ player: 0, type: 'look_around', text: 'körülnézek' }, { player: 0, type: 'look', target: 'mirror', text: 'megnézem a tükröt' }], names);
check('fixed texts carry their kind', res.fixed.filter(f => f.text).map(f => f.kind), ['room', 'look']);
check('room text has the envelope', res.fixed[0].text.includes('egy boríték'), true);
check('the words travel with the block', res.fixed[0].said, 'körülnézek');
const room = { kind: 'room', text: res.fixed[0].text, p: 0, room: 'hall' }, R = C.rules(w, s, room, L.colorize);
check('keep: what the room text names', R.keep.sort(), ['előszoba', 'boríték', 'konzolasztal', 'tükör'].sort());
check('forbidden: things not here', R.forbidden.includes('kredenc') && R.forbidden.includes('sárgaréz kulcs'), true);
const ok = 'Körülnézel az előszobában: a reggeli fényben ott a kerek tükör, a konzolasztal, rajta egy boríték, hátul pedig a lépcső.';
const chk = (t, b = room, r = R) => C.check(b, t, r, L.colorize, names);
check('good rewording passes', chk(ok), null);
check('missing thing', chk('Körülnézel az előszobában: kerek tükör, hátul a lépcső, és egy boríték.'), 'missing: konzolasztal');
check('names a thing elsewhere', chk(ok.replace('lépcső.', 'lépcső, a sarokban egy kredenc.')), 'names a thing not here: kredenc');
check('hidden thing', chk(ok.replace('egy boríték', 'egy boríték és alatta egy sárgaréz kulcs')), 'names a thing not here: sárgaréz kulcs');
check('new number', chk(ok.replace('a lépcső', 'a 12 fokú lépcső')), 'new number: 12');
check('emphasis', chk(ok.replace('rajta egy boríték', 'rajta egy furcsa boríték')), 'emphasis: furcsa');
check('too long', chk(ok + ' ' + ok + ' ' + ok), 'too long');
check('too short', chk('Tükör, konzolasztal, boríték.'), 'too short');
const look = { kind: 'look', text: 'A borítékon: „A leltározóknak”.', p: 0 }, RL = C.rules(w, s, look, L.colorize);
check('quote kept', chk('A boríték fölé hajolsz. Rajta: „A leltározóknak”.', look, RL), null);
check('quote changed', chk('A boríték fölé hajolsz. Rajta: „A leltárosoknak”.', look, RL), 'quote changed: A leltározóknak');
const look2 = { kind: 'look', text: 'Festett kredenc, 1974-es.', p: 0 };
check('lost number', chk('Egy szépen festett, régi kredenc.', look2, C.rules(w, s, look2, L.colorize)), 'lost number: 1974');
check('number word added', chk(ok.replace('a lépcső', 'a három lépcső')), 'new number word: három');
check('hatalmas is not hat', chk(ok.replace('a lépcső', 'a hatalmas lépcső')), null);
check('sensitive word', chk(ok.replace('a lépcső', 'egy fiókos szekrény és a lépcső')), 'sensitive word: fiók');
// moves: names, rooms, outcome
const mv = { kind: 'move', text: 'Jancsi átmegy a konyhába, Juliska az előszobában marad.', p: 0, move: { outcome: 'stays', p: 0, q: 1, to: 'kitchen', from: 'hall' } }, RM = C.rules(w, s, mv, L.colorize);
RM.roomNames = { kitchen: ['Konyha'], hall: ['Előszoba', 'bejárat'] };
check('move: good', chk('Jancsi egyedül sétál át a konyhába, Juliska az előszobában marad.', mv, RM), null);
check('move: turned into together', chk('Jancsi és Juliska együtt mennek a konyhába, az előszobából.', mv, RM), 'move: wrong outcome (együtt)');
check('move: name missing', chk('Átsétálsz a konyhába, az előszoba csendes marad.', mv, RM), 'move: missing name Jancsi');
// the whole turn with a fake model: good answer applied, bad one left fixed, timeout left fixed
const turn = async (ai, cfg = {}) => { const t = W.initState(w), r = W.run(w, t, [{ player: 0, type: 'look_around', text: 'körülnézek' }, { player: 0, type: 'look', target: 'mirror', text: '' }], names); return C.colorize({ w, s: t, res: r, names, aud: [0], cfg, L: L.colorize, ai }); };
(async () => {
  let seen; const out = await turn(async inp => { seen = inp; return { blocks: [{ id: 1, text: ok }, { id: 2, text: 'Egy furcsa tükör.' }] }; });
  check('input: audience, details, keep, no hidden names', [seen.audience, seen.blocks[0].details, seen.blocks[0].keep.length > 0, JSON.stringify(seen).includes('sárgaréz')], ['you', ['reggeli fény', 'viaszolt padló szaga'], true, false]);
  check('good block applied, bad one left', [out.changes.map(c => c.i), out.log.map(l => l.fail || 'ok')], [[0], ['ok', 'emphasis: furcsa']]);
  const t2 = await turn(() => new Promise(ok2 => setTimeout(() => ok2({ blocks: [{ id: 1, text: ok }] }), 300)), { timeoutMs: 50 });
  check('timeout: fixed text', [t2.changes.length, t2.log[0].fail], [0, 'timeout']);
  const t3 = await turn(async () => { throw new Error('boom'); });
  check('model error: fixed text', t3.log[0].fail, 'error: boom');
  check('third person in own thread', C.check({ ...room, audience: 'you' }, ok.replace('Körülnézel', 'Jancsi körülnéz'), R, L.colorize, names), 'third person in own thread');
  const wp = JSON.parse(JSON.stringify(w)); wp.items[0].text = 'Kerek tükör, a kerete feltűnően új.'; const tp = W.initState(wp), rp = W.run(wp, tp, [{ player: 0, type: 'look', target: 'mirror', text: '' }], names);
  let asked = false; const op = await C.colorize({ w: wp, s: tp, res: rp, names, aud: [0], L: L.colorize, ai: async () => { asked = true; return { blocks: [] }; } });
  check('author pointer stays exact (no call)', [asked, op.changes.length], [false, 0]);
  check('literal things are not colorized', W.run(w, W.initState(w), [{ player: 0, type: 'go', target: 'kitchen', text: '' }, { player: 0, type: 'look', target: 'ledger', text: '' }], names).fixed.filter(f => f.text === 'Számlák.').map(f => f.kind), [undefined]);
  // validate: details may not name hidden things or sensitive words
  const w2 = JSON.parse(JSON.stringify(w)); w2.items[0].details = ['egy kulcs lóg mellette'];
  check('validate: details with a sensitive word', W.validate(w2).some(e => e.includes('mirror: details')), true);
  check('validate: clean details', W.validate(w).filter(e => e.includes('details')), []);
  console.log(bad ? `${bad} FAILED` : 'all ok'); process.exit(bad ? 1 : 0);
})();
