// Games in two eras at the world level, on a made-up mini world. No game data, no server, no model.
// Per-player start, things owned by whoever got them (inventoryPerPlayer), per-player inventory, status and interpreter view, onMessage $1.
const W = require('../engine/world');
const w = {
  start: ['hall74', 'hall'], inventoryPerPlayer: true, vars: { capsule: 'none' }, status: '{loc0} / {loc1}',
  texts: { notHere: 'not here', noWay: 'no way', taken: 'taken {name}', carrying: 'carrying {list}', carryingNothing: 'nothing', inventoryMarker: 'Inv' },
  rooms: { hall74: { name: 'Hall 1974', text: 'old hall', exits: { cellar74: {} } }, cellar74: { name: 'Cellar 1974', text: 'old cellar', exits: { hall74: {} } }, hall: { name: 'Hall', text: 'new hall' } },
  items: [
    { id: 'key74', name: 'key', location: 'hall74', text: 'a key', pickable: { id: 'key', name: 'Key' } },
    { id: 'lamp', name: 'lamp', location: 'hall', text: 'a lamp', pickable: { id: 'torch', name: 'Torch' } },
  ],
  onMessage: [{ match: '\\(GAME: CAPSULE (\\w+) (\\w+)\\)', setVar: { capsule: '$1@$2' }, do: { give: [{ id: 'note', name: 'Note', p: 1 }] } }],
  inventory: [{ id: 'map', name: 'Map' }],
};
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const names = ['Anna', 'Bea'], ids = s => s.map(i => i.id);
check('valid and reachable with a start per player', [...W.validate(w, new Set(), new Set()), ...W.reachable(w)], []);
check('valid flags a bad start room', W.validate({ ...w, start: ['hall74', 'nowhere'] }, new Set(), new Set()).some(e => e.includes('nowhere')), true);
const s = W.initState(w);
check('each player starts in their own era', [s.loc, s.visited], [['hall74', 'hall'], { hall74: true, hall: true }]);
check('each sees only their own room', [W.visibleItems(w, s, 0).map(i => i.id), W.visibleItems(w, s, 1).map(i => i.id)], [['key74'], ['lamp']]);
W.run(w, s, [{ player: 0, type: 'act', target: 'key74', verb: 'take' }, { player: 1, type: 'act', target: 'lamp', verb: 'take' }], names);
check('a taken thing belongs to the taker', s.inv.map(i => [i.id, i.p]), [['map', undefined], ['key', 0], ['torch', 1]]);
check('inventory per player, shared things for both', [ids(W.invOf(w, s, 0)), ids(W.invOf(w, s, 1))], [['map', 'key'], ['map', 'torch']]);
check('B cannot use A\'s key', W.run(w, s, [{ player: 1, type: 'look', target: 'key' }], names).fixed[0].text, 'not here');
check('inventory command lists own things', W.run(w, s, [{ player: 1, type: 'inventory' }], names).fixed[0].text, 'carrying Map, Torch');
check('status line per player', [W.statusOf(w, s, names, 0).includes('[i:key|'), W.statusOf(w, s, names, 0).includes('[i:torch|'), W.statusOf(w, s, names, 1).includes('[i:torch|')], [true, false, true]);
check('interpreter sees the audience\'s own inventory', [ids(W.forInterpreter(w, s, names, [0]).inventory), ids(W.forInterpreter(w, s, names, [0, 1]).inventory)], [['map', 'key'], ['map', 'key', 'torch']]);
check('{has} stays shared', W.test({ all: [{ has: 'key' }, { has: 'torch' }] }, s), true);
const res = { fixed: [], facts: [], gave: [] }; W.gameEvent(w, s, '(GAME: CAPSULE jar cellar)', res, 0);
check('onMessage $1 $2 and give with p', [s.vars.capsule, ids(W.invOf(w, s, 1)).includes('note'), ids(W.invOf(w, s, 0)).includes('note')], ['jar@cellar', true, false]);
W.run(w, s, [{ player: 0, type: 'go', target: 'cellar74' }], names);
check('moving stays within the era', s.loc, ['cellar74', 'hall']);
const one = { ...w, start: 'hall', inventoryPerPlayer: false }, s1 = W.initState(one);
W.run(one, s1, [{ player: 1, type: 'act', target: 'lamp', verb: 'take' }], names);
check('single start and shared inventory unchanged', [s1.loc, s1.inv.map(i => i.p), ids(W.invOf(one, s1, 0))], [['hall', 'hall'], [undefined, undefined], ['map', 'torch']]);
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
