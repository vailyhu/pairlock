// World model v2 without the model: parts and containers, hidden things, {contents}, properties, doors, room texts,
// events, timers, player conditions, knowledge, joint movement, the interpreter's view and the start-up checks. A made-up world, no game data.
const W = require('../engine/world'), Str = require('../engine/strings');
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}${ok ? '' : ': ' + JSON.stringify(got)}`); };
const texts = { ...Str.forLang('hu').engine.world, inventoryMarker: 'Leltár' };
const names = ['Jancsi', 'Juliska'];
const world = () => ({
  start: 'hall', status: '{loc0}/{loc1}', texts, knowledge: 'shared',
  rooms: {
    hall: { name: 'Előszoba', into: 'az előszobába', inside: 'az előszobában', text: 'Előszoba{contents:, benne }.', exits: { kitchen: {}, cellar: { door: 'trapdoor' } } },
    kitchen: { name: 'Konyha', into: 'a konyhába', inside: 'a konyhában', props: { lit: { initial: true, values: [true, false] } },
      text: [{ if: { is: 'kitchen.lit', eq: false }, text: 'Sötét konyha.' }, { text: 'Konyha, rajta {contents}.' }], exits: { hall: {} } },
    cellar: { name: 'Pince', text: 'Pince.', exits: { hall: { door: 'trapdoor' } } },
  },
  items: [
    { id: 'desk', name: 'íróasztal', location: 'hall', text: 'Íróasztal{contents:, rajta }.', mention: 'egy íróasztal' },
    { id: 'pen', name: 'toll', location: 'desk', rel: 'on', mention: 'egy toll', text: 'Egy toll.', carry: {} },
    { id: 'drawer', name: 'fiók', location: 'desk', rel: 'part', props: { open: { initial: false, values: [false, true] } }, text: 'A fiók.', actions: { open: { set: { 'drawer.open': true }, say: 'Kihúzod.' }, search: { requires: { is: 'drawer.open' }, otherwise: 'Előbb nyisd ki.', reveal: ['bottom'], say: 'A fenék kotyog.' } } },
    { id: 'letter', name: 'levél', location: 'drawer', text: 'Egy levél.', carry: {} },
    { id: 'bottom', name: 'kettős fenék', location: 'drawer', rel: 'part', hidden: true, text: 'Alatta rekesz.' },
    { id: 'cupboard', name: 'szekrény', location: 'hall', text: 'Szekrény.', actions: { search: { set: { 'drawer.open': true }, show: ['drawer'] } } },
    { id: 'trapdoor', kind: 'door', name: 'csapóajtó', between: ['hall', 'cellar'], closedText: 'A csapóajtó zárva.', props: { open: { initial: false, values: [false, true] } }, text: 'Csapóajtó.', actions: { open: { set: { 'trapdoor.open': true }, say: 'Felnyílik.' }, climb: { requires: { is: 'trapdoor.open' }, otherwise: 'Zárva.', goTo: 'cellar' } } },
    { id: 'lamp', name: 'lámpa', location: 'kitchen', mention: 'egy lámpa', text: 'Lámpa.', actions: { switch_off: { set: { 'kitchen.lit': false }, say: 'Sötét.' } } },
    { id: 'candle', name: 'gyertya', location: 'kitchen', glows: true, props: { lit: { initial: false, values: [false, true] }, burns: 0 }, text: 'Gyertya.', actions: { light: { set: { 'candle.lit': true }, inc: { 'candle.burns': 1 }, after: { turns: 2, do: { set: { 'candle.lit': false }, say: 'A gyertya leég.' } } } } },
  ],
  rules: [
    { on: 'enter:kitchen', once: true, do: { say: 'Először a konyhában.' } },
    { on: 'take:letter', do: { setVar: { got: 'yes' } } },
    { on: 'set:drawer.open', if: { is: 'drawer.open', eq: true }, do: { setVar: { drawer: 'open' } } },
  ],
});
const go = (player, target, together) => ({ player, type: 'go', target, ...(together ? { together: true } : {}) });
const act = (player, target, verb) => ({ player, type: 'act', target, verb });
const look = (player, target) => ({ player, type: 'look', target });
const texts0 = r => r.fixed.filter(f => f.text).map(f => f.text);
const vis = (w, s, p = 0) => W.visibleItems(w, s, p).map(i => i.id);

// parts, containers, hidden
{ const w = world(), s = W.initState(w);
  check('closed drawer hides the letter, hidden bottom stays hidden', vis(w, s), ['desk', 'pen', 'drawer', 'cupboard', 'trapdoor']);
  check('search before opening is refused', texts0(W.run(w, s, [act(0, 'drawer', 'search')], names)), ['Előbb nyisd ki.']);
  W.run(w, s, [act(0, 'drawer', 'open')], names);
  check('open drawer shows the letter', vis(w, s), ['desk', 'pen', 'drawer', 'letter', 'cupboard', 'trapdoor']);
  check('set event rule ran', s.vars.drawer, 'open');
  W.run(w, s, [act(0, 'drawer', 'search')], names);
  check('reveal shows the bottom', vis(w, s).includes('bottom'), true);
  // {contents} follows what happens
  check('contents in the desk text', texts0(W.run(w, s, [look(0, 'desk')], names))[0], 'Íróasztal, rajta egy toll.');
  W.run(w, s, [act(0, 'pen', 'take')], names);
  check('taken pen leaves the desk text', texts0(W.run(w, s, [look(0, 'desk')], names))[0], 'Íróasztal.');
  check('taken pen is in the inventory under its own id', s.inv.map(i => i.id), ['pen']);
  check('where condition', W.test({ where: 'pen', at: 'inventory' }, s), true);
  check('carried entity is looked at with its own text', texts0(W.run(w, s, [look(0, 'pen')], names)), ['Egy toll.']);
  W.run(w, s, [act(0, 'letter', 'take')], names);
  check('take event rule ran', s.vars.got, 'yes');
  check('room contents', W.roomText(w, s, 'hall'), 'Előszoba, benne egy íróasztal.');
}
// {contents@other} and old-style pickables leaving their place
{ const w = world(); w.rooms.hall.text = 'Előszoba, íróasztal{contents@desk: }.'; w.items.push({ id: 'cup', name: 'csésze', location: 'desk', rel: 'on', mention: 'egy csészével', text: 'Csésze.', pickable: { id: 'i_cup', name: 'Csésze' } });
  w.items.find(i => i.id === 'pen').mention = 'egy tollal'; const s = W.initState(w);
  check('room text lists what is on the desk', W.roomText(w, s, 'hall'), 'Előszoba, íróasztal egy tollal és egy csészével.');
  W.run(w, s, [act(0, 'cup', 'take')], names);
  check('a taken pickable leaves its place', [W.roomText(w, s, 'hall'), vis(w, s).includes('cup'), s.inv.map(i => i.id)], ['Előszoba, íróasztal egy tollal.', false, ['i_cup']]);
}
// show and goTo
{ const w = world(), s = W.initState(w);
  check('show: an action shows another thing', texts0(W.run(w, s, [act(0, 'cupboard', 'search')], names)), ['A fiók.']);
  check('goTo refused while closed', [texts0(W.run(w, s, [act(0, 'trapdoor', 'climb')], names)), s.loc[0]], [['Zárva.'], 'hall']);
  W.run(w, s, [act(0, 'trapdoor', 'open')], names); const r = W.run(w, s, [act(0, 'trapdoor', 'climb')], names);
  check('goTo walks the actor through', [s.loc, texts0(r)], [['cellar', 'hall'], ['Pince.']]);
}
// doors, room texts, darkness, events, timers
{ const w = world(), s = W.initState(w);
  check('closed door refuses with its text', texts0(W.run(w, s, [go(0, 'cellar')], names)), ['A csapóajtó zárva.']);
  W.run(w, s, [act(0, 'trapdoor', 'open')], names); W.run(w, s, [go(0, 'cellar')], names);
  check('open door lets through', s.loc, ['cellar', 'hall']);
  check('door shows in both rooms', [vis(w, s, 0).includes('trapdoor'), vis(w, s, 1).includes('trapdoor')], [true, true]);
  const r1 = W.run(w, s, [go(1, 'kitchen')], names);
  check('room text list + contents + once rule on enter', texts0(r1), ['Konyha, rajta egy lámpa.', 'Először a konyhában.']);
  check('once rule only once', texts0(W.run(w, s, [go(1, 'hall'), go(1, 'kitchen')], names)).includes('Először a konyhában.'), false);
  W.run(w, s, [act(1, 'lamp', 'switch_off')], names);
  check('dark room text', W.roomText(w, s, 'kitchen'), 'Sötét konyha.');
  check('dark room shows only what glows', vis(w, s, 1), ['candle']);
  W.run(w, s, [act(1, 'candle', 'light')], names);
  check('number property', [W.test({ is: 'candle.burns', gt: 0 }, s), W.test({ is: 'candle.lit', eq: true }, s)], [true, true]);
  W.run(w, s, [{ player: 1, type: 'moment', text: 'vár' }], names);
  const r2 = W.run(w, s, [{ player: 1, type: 'moment', text: 'vár' }], names);
  check('delayed effect after two turns', [texts0(r2), W.test({ is: 'candle.lit', eq: false }, s)], [['A gyertya leég.'], true]);
  check('turn counter', W.test({ is: 'game.turn', gt: 5 }, s), true);
}
// player conditions and knowledge
{ const w = world(), s = W.initState(w);
  check('both in the hall', [W.test({ player: 'both', at: 'hall' }, s), W.test({ together: true }, s)], [true, true]);
  W.run(w, s, [go(0, 'kitchen')], names);
  check('apart', [W.test({ player: 'both', at: 'hall' }, s), W.test({ player: 'any', at: 'kitchen' }, s), W.test({ player: 1, at: 'hall' }, s), W.test({ together: true }, s)], [false, true, true, false]);
  W.run(w, s, [look(1, 'desk')], names);
  check('shared knowledge: one saw it, both know', W.test({ knows: 'desk', who: 'both' }, s), true);
  w.knowledge = 'perPlayer';
  check('per-player knowledge', [W.test({ knows: 'desk', who: 1 }, s), W.test({ knows: 'desk', who: 0 }, s), W.test({ knows: 'desk', who: 'both' }, s)], [true, false, false]);
}
// joint movement
{ const w = world();
  const mv = intents => { const s = W.initState(w), r = W.run(w, s, intents, names); return { loc: s.loc, text: texts0(r)[0], out: r.moves.map(m => m.outcome) }; };
  check('together, the other passes', mv([go(0, 'kitchen', true)]), { loc: ['kitchen', 'kitchen'], text: 'Jancsi és Juliska együtt átmennek a konyhába.', out: ['together'] });
  check('together, the other only talks', mv([go(0, 'kitchen', true), { player: 1, type: 'moment', text: 'jó' }]).loc, ['kitchen', 'kitchen']);
  check('together, the other goes the same way', mv([go(0, 'kitchen', true), go(1, 'kitchen')]).loc, ['kitchen', 'kitchen']);
  check('split: the other goes elsewhere', (s => (s.visited.cellar = true, s.props.trapdoor.open = true, W.run(w, s, [go(0, 'kitchen', true), go(1, 'cellar')], names), s.loc))(W.initState(w)), ['kitchen', 'cellar']);
  check('split text without inflected names uses the plain sentence', (s => (s.props.trapdoor.open = true, texts0(W.run(w, s, [go(0, 'kitchen', true), go(1, 'cellar')], names))[0]))(W.initState(w)), 'Jancsi erre megy: Konyha. Juliska pedig erre: Pince.');
  check('stays: the other looks at something', mv([go(0, 'kitchen', true), look(1, 'desk')]), { loc: ['kitchen', 'hall'], text: 'Jancsi átmegy a konyhába, Juliska az előszobában marad.', out: ['stays'] });
  check('alone without together', mv([go(0, 'kitchen')]).loc, ['kitchen', 'hall']);
  check('no joint move through a closed door', mv([go(0, 'cellar', true)]), { loc: ['hall', 'hall'], text: 'A csapóajtó zárva.', out: [] });
}
// interpreter view
{ const w = world(), s = W.initState(w); W.run(w, s, [act(0, 'drawer', 'open')], names);
  const v = W.forInterpreter(w, s, names, [0, 1]).A.items, d = v.find(i => i.id === 'drawer'), l = v.find(i => i.id === 'letter');
  check('part carries its parent name and public props', [d.in, d.props], ['íróasztal', { open: true }]);
  check('thing in a part carries the part name', l.in, 'fiók');
  check('hidden thing not in the view', v.some(i => i.id === 'bottom'), false);
  check('secret number props stay out', JSON.stringify(W.forInterpreter(w, s, names, [0, 1])).includes('burns'), false);
}
// start-up checks and reachability
{ const w = world();
  check('valid world', [...W.validate(w), ...W.reachable(w)], []);
  const b = world(); b.items.push({ id: 'ghost', name: 'szellem', location: 'hall', hidden: true, text: '.' }, { id: 'loopA', name: 'a', location: 'loopB', text: '.' }, { id: 'loopB', name: 'b', location: 'loopA', text: '.' });
  b.rules.push({ on: 'turn', do: { set: { 'drawer.open': 'maybe', 'nope.x': 1 } } }, { on: 'turn', if: { is: 'desk.colour', eq: 'red' }, do: {} });
  check('bad world errors', W.validate(b).sort(), ['item ghost: hidden, but nothing reveals it', 'item loopA: parent loop', 'item loopB: parent loop', 'rule turn: desk has no property: colour', 'rule turn: drawer.open cannot be maybe', 'rule turn: no such property: nope.x'].sort());
  const c = world(); c.items.find(i => i.id === 'trapdoor').actions = {};
  check('a door nobody can open makes the room unreachable', W.reachable(c), ['Unreachable room: cellar']);
}
// room picture by state (Holdbázis, 2026-11-14): a list of {if, image}, shown on the first visit and again when it changes
{ const w = world(), imgs = r => r.fixed.filter(f => f.images).flatMap(f => f.images);
  w.rooms.kitchen.image = [{ if: { is: 'kitchen.lit', eq: false }, image: 'kitchen_dark' }, { image: 'kitchen_lit' }];
  w.rooms.hall.image = 'hall_pic';
  const s = W.initState(w);
  check('start room picture recorded, not shown again', [s.roomImg.hall, imgs(W.run(w, s, [go(0, 'kitchen')], names))], ['hall_pic', ['kitchen_lit']]);
  W.run(w, s, [go(0, 'hall')], names);
  check('same picture is not repeated', imgs(W.run(w, s, [go(0, 'kitchen')], names)), []);
  W.run(w, s, [act(0, 'lamp', 'switch_off')], names); W.run(w, s, [go(0, 'hall')], names);
  check('changed picture shown again on entering', imgs(W.run(w, s, [go(0, 'kitchen')], names)), ['kitchen_dark']);
  check('roomImage helper', W.roomImage(w, s, 'kitchen'), 'kitchen_dark');
  check('picture list validated', W.validate({ ...w, rooms: { ...w.rooms, kitchen: { ...w.rooms.kitchen, image: [{ if: { item: 'nope', state: 'x' }, image: 'missing' }] } } }, new Set(['hall_pic'])).filter(e => e.startsWith('room kitchen')).sort(),
    ['room kitchen: no such image: missing', 'room kitchen: no such item: nope']);
  const old = { items: {}, inv: [], loc: ['hall', 'hall'], solved: {}, seen: {}, visited: { hall: true, kitchen: true }, vars: {} }; W.upgrade(w, old);
  check('old save: no record, no repeat on the next visit', imgs(W.run(w, old, [go(0, 'kitchen')], names)), []);
}
// saves from the first model
{ const w = world(), old = { items: {}, inv: [], loc: ['hall', 'hall'], solved: {}, seen: {}, visited: { hall: true }, vars: {} };
  W.upgrade(w, old);
  check('old save gets the new fields and initial props', [old.turn, old.props.drawer.open, old.props.kitchen.lit, Array.isArray(old.timers)], [0, false, true, true]);
  check('old save runs', (W.run(w, old, [act(0, 'drawer', 'open')], names), vis(w, old).includes('letter')), true);
}
console.log(bad ? `${bad} failed` : 'all ok'); process.exit(bad ? 1 : 0);
