// Player-relative world features without the model: a room only one may enter ({player: 'other'}), avatarText per gender,
// [g:who|female|male] in fixed texts, and the gender toggle's defaults. A made-up world, no game data.
const W = require('../engine/world'), Str = require('../engine/strings');
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}${ok ? '' : ': ' + JSON.stringify(got)}`); };
const texts = { ...Str.forLang('hu').engine.world, inventoryMarker: 'Leltár' };
const names = ['Jancsi', 'Juliska'];
const world = () => ({
  start: 'hall', status: '{loc0}/{loc1}', texts,
  rooms: {
    hall: { name: 'Előszoba', text: 'Előszoba.', exits: { booth: { requires: { not: { player: 'other', at: 'booth' } }, otherwise: 'Foglalt, a másik bent van.' }, park: {} } },
    booth: { name: 'Fülke', text: 'Fülke.', exits: { hall: {} } },
    park: { name: 'Park', text: 'Park.', avatarText: { f: 'Lovagnő vagy, páncélban.', m: 'Lovag vagy, [g:self|nő|férfi] páncélban.' }, exits: { hall: {} } },
  },
  items: [{ id: 'mirror', name: 'tükör', location: 'hall', text: 'A tükörben egy [g:self|nő|férfi] néz vissza. Mögötted egy [g:other|nő|férfi].' }],
});
const go = (w, s, p, target, extra = {}) => W.run(w, s, [{ player: p, type: 'go', target, text: 'megyek', ...extra }], names);
const texts_ = res => res.fixed.filter(f => f.text).map(f => f.text);
let w = world(), s = W.initState(w);
check('world validates', W.validate ? W.validate(w) : [], []);
W.setPlayers(s, names, ['m', 'm']);
check('first one enters the booth', go(w, s, 0, 'booth') && s.loc[0], 'booth');
check('second one is refused while the first is in', [texts_(go(w, s, 1, 'booth')), s.loc[1]], [['Foglalt, a másik bent van.'], 'hall']);
check('the booth is not offered as a route meanwhile', W.routes(w, s, 1).includes('booth'), false);
go(w, s, 0, 'hall'); check('after the first leaves, the second may enter', go(w, s, 1, 'booth') && s.loc[1], 'booth');
w = world(); s = W.initState(w); W.setPlayers(s, names, ['f', 'm']);
const jt = go(w, s, 0, 'booth', { together: true });
check('joint move into the booth: only the speaker gets in', [s.loc, texts_(jt).includes('Foglalt, a másik bent van.')], [['booth', 'hall'], true]);
check('no "together" sentence for a joint move that fails', jt.fixed.some(f => f.kind === 'move'), false);
w = world(); s = W.initState(w); W.setPlayers(s, names, ['f', 'm']);
const pk = go(w, s, 0, 'park', { together: true });
check('avatar lines for both on a joint move, once each, by gender', texts_(pk).filter(t => /^(Jancsi|Juliska):/.test(t)), ['Jancsi: Lovagnő vagy, páncélban.', 'Juliska: Lovag vagy, férfi páncélban.']);
w = world(); s = W.initState(w); W.setPlayers(s, names, ['f', 'f']); go(w, s, 1, 'park');
check('a player already there gets a line too when the other arrives', texts_(go(w, s, 0, 'park')).filter(t => /:/.test(t)), ['Jancsi: Lovagnő vagy, páncélban.', 'Juliska: Lovagnő vagy, páncélban.']);
w = world(); s = W.initState(w); W.setPlayers(s, names, ['f', 'm']);
const look = p => texts_(W.run(w, s, [{ player: p, type: 'look', target: 'mirror', text: 'nézem' }], names))[0];
check('[g:self] and [g:other] follow the looking player', [look(0), look(1)], ['A tükörben egy nő néz vissza. Mögötted egy férfi.', 'A tükörben egy férfi néz vissza. Mögötted egy nő.']);
w = world(); s = W.initState(w);
check('no genders known: player 0 female, player 1 male', look(1), 'A tükörben egy férfi néz vissza. Mögötted egy nő.');
check('avatarLines without a reply object', W.avatarLines(w, s, 'park', [0]), ['Jancsi: Lovagnő vagy, páncélban.']);
check('self/other outside an action is false', W.test({ player: 'other', at: 'hall' }, s, w), false);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
