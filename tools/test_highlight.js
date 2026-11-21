// Highlights (engine/highlight.js), the article rule (engine/grammar.js), the room picture marker and hand-mark validation,
// on a made-up world. No server, no model.
const H = require('../engine/highlight'), Gr = require('../engine/grammar'), W = require('../engine/world'), AI = require('../engine/ai'), Str = require('../engine/strings');
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}${ok ? '' : ': ' + JSON.stringify(got)}`); };
const G = Str.forLang('hu').engine.grammar, ids = r => r.hits.map(h => h.id).sort();
const C = [{ id: 'horn', terms: ['vadászkürt'] }, { id: 'cat', terms: ['gyűjtemény katalógusa'] }, { id: 'shaft', terms: ['akna', 'le'] }, { id: 'key', terms: ['kulcs'] }, { id: 'glass', terms: ['üveg'] }, { id: 'box', terms: ['régi láda'] }];
const m = (t, o = {}) => H.mark(t, C, { grammar: G, ...o });
check('inflected name', m('Egy vadászkürtöt látsz.').text, 'Egy [[vadászkürtöt|horn]] látsz.');
check('two-word name, ending on the last word', m('A gyűjtemény katalógusával együtt.').text, 'A [[gyűjtemény katalógusával|cat]] együtt.');
check('names under four letters are never matched', ids(m('Le lehet menni.')), []);
check('short names are reported', m('Le lehet menni.').skipped, [{ id: 'shaft', term: 'le' }]);
check('a compound is no hit (kulcstábla)', ids(m('A kulcstábla üres.')), []);
check('a compound is no hit (üvegszemek)', ids(m('Üvegszemek néznek.')), []);
check('doubled consonant ending (üveggel)', ids(m('Egy üveggel teli polc.')), ['glass']);
check('possessive plus case (kulcsukra)', ids(m('Rájuk és a kulcsukra.')), ['key']);
check('one highlight per thing', (m('A kulcs, a kulcs, a kulcs.').text.match(/\[\[/g) || []).length, 1);
check('the thing looked at is not marked', ids(m('A vadászkürt szép.', { exclude: 'horn' })), []);
check('hand mark wins and points where the author said', m('A [[tárgyat|horn]] és a vadászkürtöt.').text, 'A [[tárgyat|horn]] és a vadászkürtöt.');
check('hand mark of a thing not visible stays plain', m('Egy [[titok|secret]] van itt.').text, 'Egy titok van itt.');
check('"-" hand mark: never highlighted', m('Egy [[akna|-]] mélye, az akna.').text, 'Egy akna mélye, az [[akna|shaft]].');
check('other markup is not matched inside', m('[i:key|kulcs] a kulcs').text, '[i:key|kulcs] a [[kulcs|key]]');
check('auto off keeps only hand marks', m('A [[kürt|horn]] és a kulcs.', { auto: false }).text, 'A [[kürt|horn]] és a kulcs.');
check('plain strips marks', H.plain('A [[kürt|horn]] itt.'), 'A kürt itt.');
check('the narrator output loses marks', AI.clean('A [[kürt|horn]] szól.', 'Leltár'), 'A kürt szól.');
// article
check('article before vowels and consonants', ['ablak', 'kés', 'Ő', 'úr'].map(x => Gr.article(x, G)), ['az', 'a', 'az', 'az']);
check('article of numbers by their reading', ['5-ös', '1-es', '10-es', '50', '500', '1000', '1974', '2026', '7', '100'].map(x => Gr.article(x, G)), ['az', 'az', 'a', 'az', 'az', 'az', 'az', 'a', 'a', 'a']);
check('withArticle keeps an existing article', [Gr.withArticle('vadászkürtöt', G), Gr.withArticle('az ablakot', G)], ['a vadászkürtöt', 'az ablakot']);
// a world: visible, hidden, revealed, carried
const w = {
  start: 'hall', status: '{loc0}', texts: { notHere: 'x', noWay: 'x', and: 'és', taken: '{name}', inventoryMarker: 'Leltár' },
  rooms: { hall: { name: 'Csarnok', text: 'Egy csarnok, benne egy láda és egy festmény. A [[falon|painting]] por.', image: 'hall', exits: { yard: {} } }, yard: { name: 'Udvar', text: 'Udvar.', image: 'yard', exits: { hall: {} } } },
  items: [
    { id: 'chest', name: 'láda', location: 'hall', text: 'Egy láda, alatta valami csillog.' },
    { id: 'painting', name: 'festmény', location: 'hall', text: 'Egy festmény.' },
    { id: 'coin', name: 'érme', aliases: ['csillogó érme'], location: 'hall', hidden: true, text: 'Egy érme.' },
    { id: 'rope', name: 'kötél', location: 'yard', carry: { name: 'kötél' }, text: 'Egy kötél.' }
  ]
};
const s = W.initState(w); W.setPlayers(s, ['A', 'B'], ['f', 'm']);
const cands = H.candidates(W, w, s, 0).map(c => c.id);
check('candidates: only visible things', cands, ['chest', 'painting']);
const room = { text: W.roomText(w, s, 'hall'), kind: 'room', p: 0 };
check('room text: visible names highlighted; a hand-marked thing only where the author marked it', H.forFixed(W, w, s, room, 0, G), 'Egy csarnok, benne egy [[láda|chest]] és egy festmény. A [[falon|painting]] por.');
check('a hidden thing is never highlighted', H.forFixed(W, w, s, { text: 'Csillogó érme a láda alatt.', kind: 'look', ent: 'chest', p: 0 }, 0, G).includes('coin'), false);
s.revealed = { coin: true };
check('once revealed it is', H.forFixed(W, w, s, { text: 'Egy érme a láda alatt.', kind: 'look', ent: 'chest', p: 0 }, 0, G), 'Egy [[érme|coin]] a láda alatt.');
check('reworded text: only things its original named', H.forFixed(W, w, s, { text: 'A láda mellett egy festmény.', orig: 'Itt egy láda.', kind: 'room', p: 0 }, 0, G), 'A [[láda|chest]] mellett egy festmény.');
check('other fixed texts keep hand marks only', H.forFixed(W, w, s, { text: 'A láda és a [[kép|painting]].' }, 0, G), 'A láda és a [[kép|painting]].');
// room picture when entering a visited room
const r1 = W.run(w, s, [{ player: 0, type: 'go', target: 'yard' }], ['A', 'B']); check('first visit: the picture in the text', r1.fixed.some(f => f.images?.includes('yard')), true);
W.run(w, s, [{ player: 0, type: 'go', target: 'hall' }], ['A', 'B']);
const r3 = W.run(w, s, [{ player: 0, type: 'go', target: 'yard' }], ['A', 'B']);
check('again: a view entry, no image in the text', [r3.fixed.some(f => f.images), r3.fixed.find(f => f.view)?.view], [false, 'yard']);
check('compose writes the view marker', W.compose(w, s, r3, ['A', 'B'], '', 0).includes('[view:0:yard]'), true);
check('carried things are candidates', (W.run(w, s, [{ player: 0, type: 'act', target: 'rope', verb: 'take' }], ['A', 'B']), H.candidates(W, w, s, 0).map(c => c.id).includes('rope')), true);
// validation of hand marks
check('validate: a hand mark must name an item', W.validate({ ...w, rooms: { ...w.rooms, yard: { ...w.rooms.yard, text: 'Egy [[kút|well]].' } } }).filter(e => /highlight/.test(e)), ['highlight mark: no such item: well']);
console.log(bad ? `${bad} failed` : 'all ok'); process.exit(bad ? 1 : 0);
