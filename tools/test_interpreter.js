// Real interpreter on Őrség sentences, each repeated: prints how often the expected verb came back. Uses the user's model credit, so run it only when the interpreter prompt or its data changed.
// usage: node tools/test_interpreter.js [repeats]   Output: item ids and verbs only, no game text.
const W = require('../engine/world'), AI = require('../engine/ai'), fs = require('fs'), path = require('path'), os = require('os');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf8')), K = require('../engine/settings').key(cfg);
const O = require('../games/orseg/world.json'), names = ['Jancsi', 'Juliska'], N = +process.argv[2] || 5;
const CASES = [
  ['lako', 'Kinyitom V.B. ládáját.', 'chest_vb', 'open'], ['lako', 'Kinyitnám a V.B. ládát.', 'chest_vb', 'open'], ['lako', 'Felnyitom V.B. ládáját.', 'chest_vb', 'open'],
  ['lako', 'Akkor feszítsük fel V.B. ládáját!', 'chest_vb', 'force'], ['lako', 'Szétverem V.B. ládáját.', 'chest_vb', 'force'],
  ['lako', 'Kinyitom a lépcsőajtót.', 'stair_door', 'open'], ['lako', 'Betöröm a lépcsőajtót.', 'stair_door', 'force'],
  ['lako', 'Kinyitom az ablakot.', 'windows', 'open'],
];
(async () => {
  let bad = 0;
  for (const [room, text, target, verb] of CASES) {
    const s = W.initState(O); s.loc = [room, room]; s.visited[room] = true; const got = {};
    for (let i = 0; i < N; i++) { const a = (await AI.interpret(K, 'deepseek-flash', W.forInterpreter(O, s, names), [{ player: 'A', text }])).actions.find(x => x.player === 'A') || {}; const k = `${a.type}:${a.target}:${a.verb}`; got[k] = (got[k] || 0) + 1; }
    const want = `act:${target}:${verb}`, ok = got[want] || 0; if (ok < N) bad++;
    console.log(`${ok === N ? 'ok  ' : 'FAIL'} ${ok}/${N} ${want}  ${JSON.stringify(got)}`);
  }
  // World model v2: parts and things inside others carry their parent's name; the interpreter must pick the most specific one.
  const P = { start: 'hall', status: '', texts: {}, rooms: { hall: { name: 'Hálószoba', text: '.', exits: {} } }, items: [
    { id: 'nightstand', name: 'éjjeliszekrény', location: 'hall', text: '.', actions: { search: {} } },
    { id: 'drawer', name: 'fiók', location: 'nightstand', rel: 'part', props: { open: { initial: true, values: [false, true] } }, text: '.', actions: { open: {}, search: {} } },
    { id: 'glasses', name: 'szemüveg', location: 'drawer', text: '.', carry: {} },
    { id: 'wardrobe', name: 'gardrób', location: 'hall', text: '.', actions: { search: {} } },
    { id: 'slippers', name: 'papucsok', aliases: ['papucs'], location: 'wardrobe', text: '.', actions: { search: {} } } ] };
  for (const [text, want] of [['kihúzom a fiókot', 'drawer'], ['átkutatom az éjjeliszekrény fiókját', 'drawer'], ['megnézem az éjjeliszekrényt', 'nightstand'], ['kiveszem a szemüveget', 'glasses'], ['átnézem a papucsokat', 'slippers'], ['átkutatom a gardróbot', 'wardrobe']]) {
    const s = W.initState(P), got = {};
    for (let i = 0; i < N; i++) { const a = (await AI.interpret(K, 'deepseek-flash', W.forInterpreter(P, s, names), [{ player: 'A', text }])).actions.find(x => x.player === 'A') || {}; got[a.target] = (got[a.target] || 0) + 1; }
    const ok = got[want] || 0; if (ok < N) bad++; console.log(`${ok === N ? 'ok  ' : 'FAIL'} ${ok}/${N} ${text} → ${want}  ${JSON.stringify(got)}`);
  }
  console.log(bad ? `${bad} sentences not always right` : 'all passed'); process.exit(bad ? 1 : 0);
})();
