// Movement: the engine without the model, and with --model the interpreter too. Runs on a made-up world, no spoilers.
const W = require('../engine/world'), AI = require('../engine/ai'), fs = require('fs'), path = require('path'), os = require('os');
const w = { start: 'fent', rooms: { fent: { name: 'Fent', text: 'Fenti szoba.', exits: { lent: { aliases: ['le', 'alsó szint'] }, kert: {} } }, lent: { name: 'Lent', text: 'Lenti szoba.', exits: { fent: {} } }, kert: { name: 'Kert', text: 'Kert.', exits: { fent: {} } } }, items: [{ id: 'asztal', name: 'asztal', location: 'fent', text: 'Egy asztal.' }], texts: { notHere: 'Nincs itt.', noWay: 'Arra nem lehet.' }, status: '{loc0}/{loc1}' };
const names = ['Jancsi', 'Juliska'], go = (player, target) => ({ player, type: 'go', target });
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const play = intents => { const s = W.initState(w), res = W.run(w, s, intents, names); return { s, res }; };
check('only the speaker moves', play([go(0, 'lent')]).s.loc, ['lent', 'fent']);
check('a refusal keeps the other here', play([{ ...go(0, 'lent'), together: true }, { player: 1, type: 'stay', text: 'maradok' }]).s.loc, ['lent', 'fent']);
check('both move when both say so', play([go(0, 'lent'), go(1, 'kert')]).s.loc, ['lent', 'kert']);
// Multi-room route: only through rooms seen and open exits.
const L = { start: 'a', rooms: { a: { name: 'A szoba', text: 'A.', exits: { b: {} } }, b: { name: 'B szoba', text: 'B.', exits: { a: {}, c: { requires: { var: 'nyit', is: 'igen' }, otherwise: 'Zárva.' } } }, c: { name: 'C szoba', text: 'C.', exits: { b: {}, d: {} } }, d: { name: 'D szoba', text: 'D.', exits: { c: {} } } }, items: [], texts: w.texts, status: '' };
const at = (loc, vis, vars = {}) => { const s = W.initState(L); s.loc = [loc, loc]; s.visited = Object.fromEntries(vis.map(x => [x, true])); Object.assign(s.vars, vars); return s; };
const nyit = { nyit: 'igen' };
check('route through two rooms', (s => (W.run(L, s, [go(0, 'c')], names), s.loc))(at('a', ['a', 'b', 'c'], nyit)), ['c', 'a']);
check('not through a locked door', (s => (W.run(L, s, [go(0, 'c')], names), s.loc))(at('a', ['a', 'b', 'c'])), ['a', 'a']);
check('unseen room is no destination', (s => (W.run(L, s, [go(0, 'd')], names), s.loc))(at('b', ['a', 'b', 'c'], nyit)), ['b', 'b']);
check('list of reachable rooms', W.routes(L, at('a', ['a', 'b', 'c'], nyit), 0), ['b', 'c']);
check('locked door shortens the list', W.routes(L, at('a', ['a', 'b', 'c']), 0), ['b']);
check('new adjacent room still reachable', (s => (W.run(L, s, [go(0, 'b')], names), s.loc))(at('a', ['a'])), ['b', 'a']);
(async () => {
  if (process.argv.includes('--model')) {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8')), s = W.initState(w), view = W.forInterpreter(w, s, names), K = require('../engine/settings').key(cfg);
    // Check the outcome: where both players stand after the engine ran the interpreter's actions.
    for (const [lines, want] of [
      [[{ player: 'A', text: 'kézenfogom Juliskát és lemegyünk az alsó szintre' }], ['lent', 'lent']],
      [[{ player: 'A', text: 'menjünk le' }], ['lent', 'lent']],
      [[{ player: 'A', text: 'lemegyek az alsó szintre' }], ['lent', 'fent']],
      [[{ player: 'A', text: 'lemenjünk?' }], ['fent', 'fent']],
      [[{ player: 'A', text: 'lemegyünk' }, { player: 'B', text: 'én inkább kimegyek a kertbe' }], ['lent', 'kert']],
      [[{ player: 'A', text: 'lemegyünk' }, { player: 'B', text: 'én itt maradok' }], ['lent', 'fent']],
      [[{ player: 'A', text: 'gyere, átmegyünk a kertbe' }, { player: 'B', text: 'oké, megfogom a kezét' }], ['kert', 'kert']],
      [[{ player: 'A', text: 'lemegyünk' }, { player: 'B', text: 'megnézem az asztalt' }], ['lent', 'fent']],
      [[{ player: 'A', text: 'lemegyünk' }, { player: 'B', text: 'én is lemegyek' }], ['lent', 'lent']],
    ]) { const a = (await AI.interpret(K, 'deepseek-flash', view, lines)).actions.map(x => ({ ...x, player: x.player === 'B' ? 1 : 0 })), t = W.initState(w); W.run(w, t, a, names); check(lines.map(l => l.text).join(' / '), t.loc, want); }
  }
  if (process.argv.includes('--model')) {
    const O = require('../games/orseg/world.json'), cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8')), K = require('../engine/settings').key(cfg);
    for (const [from, text, want] of [['lampater', 'lemegyek a földszintre', 'lako'], ['lako', 'felmegyek a lámpatérbe', 'lampater'], ['lampater', 'lemegyek', 'orszoba'], ['lako', 'felmegyek', 'orszoba'], ['orszoba', 'felmegyek a lámpatérbe', 'lampater'], ['lako', 'megyek az őrszobába', 'orszoba'], ['lampater', 'lemegyek a lakószobába', 'lako'], ['lako', 'menjünk fel a torony tetejére', 'lampater']]) {
      const s = W.initState(O); s.loc = [from, from]; s.visited = { lako: true, orszoba: true, lampater: true }; const open = q => { if (q.item) s.items[q.item] = q.state; if (q.solved) s.solved[q.solved] = true; for (const x of q.all || []) open(x); }; for (const r of Object.values(O.rooms)) for (const x of Object.values(r.exits || {})) if (x.requires) open(x.requires);
      const a = (await AI.interpret(K, 'deepseek-flash', W.forInterpreter(O, s, names), [{ player: 'A', text }])).actions.map(x => ({ ...x, player: x.player === 'B' ? 1 : 0 })); W.run(O, s, a, names); check(`${from}: ${text}`, s.loc[0], want);
    }
  }
  console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
})();
