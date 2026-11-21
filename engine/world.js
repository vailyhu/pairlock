// World model: entities (rooms, things, parts, doors) with properties, actions and conditions. Inventory and state live here; the narrator only words things.
// Fields and principles: CLAUDE.md, World model. Every new field is optional, so worlds written for the first model run unchanged.
// Item: { id, name, aliases?, location (room or parent item id), rel?:'in'|'on'|'under'|'behind'|'part', kind?:'door', between?:[room,room], closedText?,
//         text: string | {state:text} | [{if?,text}], mention?, details?, images?, state?:{initial,values}, props?:{name:{initial,values?,public?}|value},
//         hidden?, visibleIf?, glows?, pickable?:{id,name}, carry?:{name?}, panel?:{id,label,if?}, when?:[{if,text,images,panel,do}], onLook?:Action, actions?:{verb:Action} }
// Room:  { name, aliases?, text: string | [{if?,text}], firstText?, image?, props?, into?, inside?, avatarText?:{f,m}, exits:{room:{aliases?,requires?,otherwise?,panel?,door?}} }
// Action: { requires?, otherwise?, forbidden?, setState?, setItem?:{item,state}, set?:{'id.prop':v}, inc?:{'id.prop':n}, reveal?:[id], moveTo?:{id:dest}, take?:[id],
//           give?:[{id,name}], remove?:[id], say?, images?, panel?:{id,label}, show?:[id], goTo?:room, effect?, emit?, setVar?:{}, after?:{turns,do}, notify?:{at:room,text,images?} }
// Condition: {item,state} | {is:'id.prop', eq?,ne?,gt?,lt?} | {has} | {where,at} | {player:'any'|'both'|'self'|'other'|0|1, at} | {together} | {knows, who?}
//            | {solved} | {seen} | {visited} | {var,is} | {all:[]} | {any:[]} | {not:Condition}
// Rules: { on: 'solved:T' | 'set:id.prop' | 'enter:room' | 'leave:room' | 'take:id' | 'look:id' | 'turn' | <emit name>, if?, do, once? }

/** Per run, not saved here: the players' names and genders ('f' | 'm'), set by the server before a turn (setPlayers). The save keeps them on the run. */
const players = new WeakMap();
const setPlayers = (s, names, genders) => { if (s && typeof s === 'object') players.set(s, { names: names || [], genders: genders || [] }); return s; };
const genderOf = (s, p) => players.get(s)?.genders?.[p] === 'm' ? 'm' : players.get(s)?.genders?.[p] === 'f' ? 'f' : (p === 1 ? 'm' : 'f');
const bound = new WeakMap();   // state → world, so test() works where callers pass only the state (modules, panelAvail)
const bind = (w, s) => { if (w && s && typeof s === 'object') bound.set(s, w); return s; };
const itemOf = (w, id) => { if (!w?.items) return undefined; if (!w._ix || w._ix.size !== w.items.length) Object.defineProperty(w, '_ix', { value: new Map(w.items.map(i => [i.id, i])), configurable: true, writable: true }); return w._ix.get(id); };
const entOf = (w, id) => itemOf(w, id) || w?.rooms?.[id];
/** Declared properties of an entity, the old single state included as "state". */
const propsOf = e => ({ ...(e?.state ? { state: e.state } : {}), ...(e?.props || {}) });
const initialOf = p => (p && typeof p === 'object' && 'initial' in p) ? p.initial : p;
function initState(w) {
  // start: one room, or one per player (games in two eras: the 0th player is in the first one)
  const st = Array.isArray(w.start) ? w.start : [w.start, w.start];
  const s = { items: {}, inv: [...(w.inventory || [])], loc: [...st], solved: {}, seen: {}, visited: Object.fromEntries(st.map(r => [r, true])), vars: { ...(w.vars || {}) } };
  for (const it of w.items) if (it.state) s.items[it.id] = it.state.initial;
  upgrade(w, s);
  for (const r of st) { const im = roomImage(w, s, r); if (im) s.roomImg[r] = im; }   // the opening shows the start room's picture
  return s;
}
/** Fills the fields a save from the first model lacks. Safe to call on every load. */
function upgrade(w, s) {
  bind(w, s);
  s.props = s.props || {}; s.where = s.where || {}; s.revealed = s.revealed || {}; s.seenBy = s.seenBy || {}; s.timers = s.timers || []; s.once = s.once || {}; s.turn = s.turn || 0; s.touched = s.touched || {}; s.roomImg = s.roomImg || {};
  for (const e of [...(w.items || []), ...Object.entries(w.rooms || {}).map(([id, r]) => ({ ...r, id }))]) for (const [k, p] of Object.entries(e.props || {})) { s.props[e.id] = s.props[e.id] || {}; if (!(k in s.props[e.id])) s.props[e.id][k] = initialOf(p); }
  return s;
}
function getProp(s, id, prop) {
  if (id === 'game' && prop === 'turn') return s.turn || 0;
  if (prop === 'state') return s.items?.[id];
  const v = s.props?.[id]?.[prop]; if (v !== undefined) return v;
  return initialOf(propsOf(entOf(bound.get(s), id))[prop]);
}
function setProp(w, s, id, prop, v, res, who) {
  if (getProp(s, id, prop) === v) return;
  if (prop === 'state') s.items[id] = v; else { s.props = s.props || {}; (s.props[id] = s.props[id] || {})[prop] = v; }
  fire(w, s, `set:${id}.${prop}`, res, who);
}
/** Where an entity is now: a room id, a parent item id, 'inventory' or 'gone'. */
const whereOf = (w, s, id) => s.where?.[id] ?? (s.inv?.some(x => x.id === id) ? 'inventory' : itemOf(w, id)?.location);
function test(c, s, w) {
  if (!c) return true;
  w = w || bound.get(s);
  if (c.all) return c.all.every(x => test(x, s, w)); if (c.any) return c.any.some(x => test(x, s, w)); if (c.not) return !test(c.not, s, w);
  if (c.item) return s.items?.[c.item] === c.state; if (c.has) return (s.inv || []).some(x => x.id === c.has);
  if (c.var) return s.vars?.[c.var] === c.is;
  if (c.is) { const i = c.is.lastIndexOf('.'), v = getProp(s, c.is.slice(0, i), c.is.slice(i + 1)); if ('eq' in c) return v === c.eq; if ('ne' in c) return v !== c.ne; if ('gt' in c) return v > c.gt; if ('lt' in c) return v < c.lt; return !!v; }
  if (c.where) return whereOf(w, s, c.where) === c.at;
  if (c.player !== undefined) {
    // self / other: relative to the acting (or moving) player, e.g. a room only one may enter: the exit requires {not: {player: 'other', at: room}}
    const at = p => s.loc?.[p] === c.at, me = s._actor;
    if (c.player === 'self' || c.player === 'other') return me === undefined ? false : at(c.player === 'self' ? me : 1 - me);
    return c.player === 'both' ? at(0) && at(1) : c.player === 'any' ? at(0) || at(1) : at(c.player);
  }
  if (c.together) return s.loc?.[0] === s.loc?.[1];
  if (c.knows) { const by = s.seenBy?.[c.knows] || [], per = w?.knowledge === 'perPlayer'; if (!per || c.who === undefined || c.who === 'any') return !!s.seen?.[c.knows] || by.length > 0; return c.who === 'both' ? by.includes(0) && by.includes(1) : by.includes(c.who); }
  if (c.solved) return !!s.solved?.[c.solved]; if (c.seen) return !!s.seen?.[c.seen]; if (c.visited) return !!s.visited?.[c.visited];
  return false;
}
/** Takes an entity into the inventory: it leaves its place, so texts listing it ({contents}) drop it. */
function takeInto(w, s, id, res, who) {
  const e = itemOf(w, id); if (s.inv.some(x => x.id === id)) return;
  const p = w.inventoryPerPlayer ? s._actor : undefined, name = e?.carry?.name || e?.name || id;
  s.inv.push({ id, name, ...(p !== undefined ? { p } : {}) }); s.where[id] = 'inventory'; res.gave.push({ id, name });
  fire(w, s, `take:${id}`, res, who);
}
/** Runs one action. Output: fixed parts and facts for the narrator. */
function doAction(w, s, a, res, who) {
  if (!a) return;
  if (a.requires && !test(a.requires, s, w)) { if (a.otherwise) res.fixed.push({ text: resolveText(w, s, a.otherwise) }); else res.facts.push({ player: who, kind: 'attempt', result: 'nothing happens' }); return false; }
  if (a.forbidden) { res.fixed.push({ text: resolveText(w, s, a.forbidden) }); return false; }
  if (a.setState && a._item) setProp(w, s, a._item, 'state', a.setState, res, who);
  if (a.setItem) setProp(w, s, a.setItem.item, 'state', a.setItem.state, res, who);
  for (const [k, v] of Object.entries(a.set || {})) { const i = k.lastIndexOf('.'); setProp(w, s, k.slice(0, i), k.slice(i + 1), v, res, who); }
  for (const [k, n] of Object.entries(a.inc || {})) { const i = k.lastIndexOf('.'), id = k.slice(0, i), pr = k.slice(i + 1); setProp(w, s, id, pr, (Number(getProp(s, id, pr)) || 0) + n, res, who); }
  for (const id of a.reveal || []) s.revealed[id] = true;
  for (const r of a.remove || []) { s.inv = s.inv.filter(x => x.id !== r); if (itemOf(w, r)) s.where[r] = 'gone'; }
  for (const [id, to] of Object.entries(a.moveTo || {})) { if (to === 'inventory') takeInto(w, s, id, res, who); else { s.inv = s.inv.filter(x => x.id !== id); s.where[id] = to; } }
  for (const id of a.take || []) takeInto(w, s, id, res, who);
  // inventoryPerPlayer: a thing belongs to whoever got it (or to the given p), since it cannot travel to the other's era
  for (const g of a.give || []) if (!s.inv.some(x => x.id === g.id)) { const p = g.p ?? (w.inventoryPerPlayer ? s._actor : undefined); s.inv.push({ id: g.id, name: g.name, ...(p !== undefined ? { p } : {}) }); res.gave.push(g); }
  if (a.setVar) Object.assign(s.vars, a.setVar);
  if (a.say) res.fixed.push({ text: resolveText(w, s, a.say) });
  if (a.images) res.fixed.push({ images: a.images });
  if (a.panel && test(a.panel.if, s, w)) res.fixed.push({ panel: a.panel });
  for (const id of a.show || []) { const e = itemOf(w, id); if (e) look(w, s, e, res, who); }   // e.g. pulling out a drawer shows what is in it
  if (a.goTo && s._actor !== undefined && s.loc[s._actor] !== a.goTo) enterRoom(w, s, s._actor, a.goTo, res, who);   // e.g. opening a door walks through it
  if (a.effect) res.facts.push({ player: who, kind: 'effect', result: a.effect });
  if (a.notify) (res.notify = res.notify || []).push({ at: a.notify.at, text: resolveText(w, s, a.notify.text), ...(a.notify.images ? { images: a.notify.images } : {}) });   // heard or seen in another room: the server tells whoever stands there
  if (a.after) s.timers.push({ at: s.turn + 1 + (a.after.turns || 1), do: a.after.do });   // counted in whole turns after this one
  if (a.emit) fire(w, s, a.emit, res, who);
  return true;
}
function fire(w, s, ev, res, who) {
  (w.rules || []).forEach((r, n) => { if (r.on !== ev || !test(r.if, s, w)) return; if (r.once) { if (s.once?.[n]) return; (s.once = s.once || {})[n] = true; } doAction(w, s, r.do, res, who); });
}
// ---- visibility: an entity shows if its parent shows, a closed parent hides what is in it, hidden ones wait for "reveal", and a dark room shows only what glows
const roomOf = (w, s, id, d = 0) => { const at = whereOf(w, s, id); return d > 20 || !at ? null : w.rooms[at] ? at : itemOf(w, at) ? roomOf(w, s, at, d + 1) : null; };
const closed = (s, id) => getProp(s, id, 'open') === false;
function shows(w, s, it, room, d = 0) {
  if (d > 20 || (it.hidden && !s.revealed?.[it.id]) || !test(it.visibleIf, s, w)) return false;
  if (it.kind === 'door') return (it.between || []).includes(room);
  const at = whereOf(w, s, it.id);
  if (w.rooms[at]) { if (at !== room) return false; }
  else { const par = itemOf(w, at); if (!par || !shows(w, s, par, room, d + 1)) return false; if ((it.rel || 'in') === 'in' && closed(s, par.id)) return false; }
  return getProp(s, room, 'lit') === false ? !!it.glows : true;
}
function visibleItems(w, s, p) { bind(w, s); return w.items.filter(i => shows(w, s, i, s.loc[p])); }
// ---- text: a string, a {state: text} map, or a list of {if, text} where the first match wins; {contents} lists what is directly in or on the entity now
/** A list joined by commas, the last two by the language's "and" (texts.and). */
const listOf = (a, and) => a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} ${and} ${a[a.length - 1]}`;
function contentsOf(w, s, id, room) { const r = room ?? (w.rooms[id] ? id : roomOf(w, s, id)); return w.items.filter(i => i.mention && whereOf(w, s, i.id) === id && shows(w, s, i, r)).map(i => resolveText(w, s, i.mention)); }
/** [g:who|female text|male text]: who is self (the acting player, else player 0), other, 0 or 1. */
const genderText = (s, t) => t.replace(/\[g:(self|other|0|1)\|([^|\]]*)\|([^\]]*)\]/g, (_, who, f, m) => { const me = s._actor ?? 0, p = who === 'self' ? me : who === 'other' ? 1 - me : Number(who); return genderOf(s, p) === 'm' ? m : f; });
function resolveText(w, s, t, id, room) {
  if (Array.isArray(t)) t = (t.find(v => test(v.if, s, w)) || {}).text;
  if (typeof t === 'string' && t.includes('[g:')) t = genderText(s, t);
  if (typeof t !== 'string' || !t.includes('{contents')) return t;
  // {contents}: what is directly in or on this entity; {contents@other}: in or on another one (a room text naming what lies on a desk)
  return t.replace(/\{contents(?:@([\w-]+))?(?::([^}]*))?\}/g, (_, other, pre) => { const of = other || id; if (!of) return ''; const list = listOf(contentsOf(w, s, of, other ? undefined : room), w.texts?.and || 'and'); return list ? (pre || '') + list : ''; });
}
function resolveLook(w, s, it) {
  const st = it.state ? s.items[it.id] : null; let text = typeof it.text === 'object' && it.text && !Array.isArray(it.text) ? it.text[st] : it.text, images = it.images, panel = it.panel, act = it.onLook;
  if (it.images && !Array.isArray(it.images)) images = it.images[st];
  for (const v of it.when || []) if (test(v.if, s, w)) { if (v.text !== undefined) text = v.text; if (v.images) images = v.images; if (v.panel !== undefined) panel = v.panel; if (v.do) act = v.do; break; }
  return { text: resolveText(w, s, text, it.id), images, panel, act };
}
const roomText = (w, s, room) => resolveText(w, s, w.rooms[room].text, room, room);
function look(w, s, it, res, who) {
  const v = resolveLook(w, s, it); s.seen[it.id] = true; if (s._actor !== undefined) { const by = s.seenBy[it.id] = s.seenBy[it.id] || []; if (!by.includes(s._actor)) by.push(s._actor); }
  if (v.text) res.fixed.push({ text: v.text, ...(it.literal ? {} : { kind: 'look', ent: it.id, p: s._actor, said: s._said }) }); if (v.images) res.fixed.push({ images: v.images });
  if (v.panel && test(v.panel.if, s, w)) res.fixed.push({ panel: v.panel });
  if (v.act) doAction(w, s, v.act, res, who);
  fire(w, s, `look:${it.id}`, res, who);
}
// ---- movement
/** An exit is open if its own condition holds and its door, if any, is open. */
const passable = (w, s, x) => test(x.requires, s, w) && (!x.door || getProp(s, x.door, 'open') !== false);
/** Rooms already seen that the player can reach through open exits, passing only through rooms already seen. */
function routes(w, s, p) {
  return asActor(s, p, () => routesOf(w, s, p));
}
/** Runs fn with p as the acting player, so self/other conditions on exits refer to the one who walks. */
function asActor(s, p, fn) { const was = s._actor; s._actor = p; try { return fn(); } finally { if (was === undefined) delete s._actor; else s._actor = was; } }
function routesOf(w, s, p) {
  bind(w, s); const from = s.loc[p], seen = new Set([from]), q = [from], out = [];
  while (q.length) for (const [t, x] of Object.entries(w.rooms[q.shift()].exits || {})) if (!seen.has(t) && s.visited[t] && passable(w, s, x)) { seen.add(t); q.push(t); out.push(t); }
  return out;
}
/** A room's picture now: a string, or a list of {if, image} where the first entry that holds wins (an entry without if always holds). */
function roomImage(w, s, room) { const im = w.rooms[room]?.image; if (!Array.isArray(im)) return im || null; for (const v of im) if (!v.if || test(v.if, s, w)) return v.image; return null; }
function enterRoom(w, s, p, room, res, who) {
  const from = s.loc[p], first = !s.visited[room]; s.loc[p] = room; s.visited[room] = true; const R = w.rooms[room];
  if (first && R.firstText) res.fixed.push({ text: resolveText(w, s, R.firstText) });
  // the picture on the first visit, and again whenever the room looks different from the last time it was shown (e.g. the power came back);
  // otherwise the entering player's image pane still turns to the room's picture ({view}: [view:p:id] in the reply, not shown in the text)
  // a save from before roomImg has no record, so its rooms show a changed picture only from the next change on
  const img = roomImage(w, s, room), prev = s.roomImg[room]; if (img && (first || (prev !== undefined && prev !== img))) res.fixed.push({ images: [img] }); else if (img) res.fixed.push({ view: img, p }); if (img) s.roomImg[room] = img;
  res.fixed.push({ text: roomText(w, s, room), kind: 'room', room, p, said: s._said });
  for (const line of avatarLines(w, s, room, [p, 1 - p].filter(q => s.loc[q] === room), res)) res.fixed.push({ text: line });
  if (from !== room) { fire(w, s, `leave:${from}`, res, who); fire(w, s, `enter:${room}`, res, who); }
}
/** avatarText {f, m} of a room: one line per player present, "<name>: <text>", once per reply (res) and player. */
function avatarLines(w, s, room, who, res) {
  const a = w.rooms[room]?.avatarText; if (!a) return [];
  const names = players.get(s)?.names || [], done = res ? (res.avatars = res.avatars || new Set()) : new Set(), out = [];
  for (const q of who) { const k = `${room}:${q}`; if (done.has(k)) continue; done.add(k); const t = asActor(s, q, () => resolveText(w, s, a[genderOf(s, q)], room, room)); if (t) out.push(names[q] ? `${names[q]}: ${t}` : t); }
  return out;
}
/** Can player p walk to room t now? Returns ok, or the refusal text and the exit's panel. */
function goCheck(w, s, p, t) { return asActor(s, p, () => goCheckOf(w, s, p, t)); }
function goCheckOf(w, s, p, t) {
  const ex = (w.rooms[s.loc[p]].exits || {})[t], known = routes(w, s, p).includes(t);
  if (!ex && !known) return { no: w.texts.noWay };
  if (!known && !passable(w, s, ex)) { const door = ex.door && itemOf(w, ex.door); return { no: ex.otherwise || (door && resolveText(w, s, door.closedText)) || w.texts.noWay, panel: ex.panel }; }
  return { ok: true };
}
/** Joint movement: "we go" moves the other player too, unless they do something else in the same turn (their own move wins). Decided before the intents run. */
const STILL = ['moment', 'question', 'clue', 'inventory'];
function planTogether(w, s, intents) {
  const extra = [], moves = [];
  for (const x of intents) {
    if (x.type !== 'go' || !x.together || !w.rooms[x.target]) continue;
    const p = x.player, q = 1 - p; if (s.loc[q] !== s.loc[p] || x.target === s.loc[p]) continue;
    const own = intents.filter(y => y.player === q), go = own.find(y => y.type === 'go');
    if (go && go.target === x.target) moves.push({ outcome: 'together', p, q, to: x.target, from: s.loc[p] });
    else if (go) moves.push({ outcome: 'split', p, q, to: x.target, otherTo: go.target, from: s.loc[p] });
    else if (own.every(y => STILL.includes(y.type))) { moves.push({ outcome: 'together', p, q, to: x.target, from: s.loc[p] }); extra.push({ after: x, add: { player: q, type: 'go', target: x.target, text: x.text, joined: true } }); }
    else moves.push({ outcome: 'stays', p, q, to: x.target, from: s.loc[p] });
  }
  let out = intents; for (const e of extra) { const i = out.indexOf(e.after); out = [...out.slice(0, i + 1), e.add, ...out.slice(i + 1)]; }
  return { intents: out, moves };
}
const roomInto = (w, id) => w.rooms[id]?.into || w.rooms[id]?.name || id, roomInside = (w, id) => w.rooms[id]?.inside || w.rooms[id]?.name || id;
/** The fixed sentence for a joint move; the colorizer may reword it later. */
function moveText(w, m, names) {
  const T = w.texts || {}, R = id => w.rooms[id] || {}, v = { a: names[m.p], b: names[m.q], into: roomInto(w, m.to), otherInto: m.otherTo ? roomInto(w, m.otherTo) : '', inside: roomInside(w, m.from), to: R(m.to).name, otherTo: m.otherTo ? R(m.otherTo).name : '', from: R(m.from).name };
  // Rooms with their own inflected phrases (into: "into the kitchen", inside: "in the kitchen") get the full sentence; others the plain one with the room name.
  const cased = !!R(m.to).into && (m.outcome !== 'split' || !!R(m.otherTo).into) && (m.outcome !== 'stays' || !!R(m.from).inside);
  const k = m.outcome === 'together' ? 'moveTogether' : m.outcome === 'split' ? 'moveSplit' : 'moveStays', t = T[cased ? k : k + 'Plain'] || T[k];
  return t && t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
}
/** Joint move: could the other player follow once the first is in? (A room only one may enter refuses the second, who then hears the exit's own text.) */
function canFollow(w, s, m) { const was = s.loc[m.p]; s.loc[m.p] = m.to; try { return !!goCheck(w, s, m.q, m.to).ok; } finally { s.loc[m.p] = was; } }
/** Runs the players' intents. intents: [{player,type,target,verb,with,text,together?}] */
function run(w, s, intents, names) {
  upgrade(w, s); if (names) setPlayers(s, names, players.get(s)?.genders);
  const res = { fixed: [], facts: [], gave: [], moves: [] }, done = new Set();
  const plan = planTogether(w, s, intents); intents = plan.intents;
  for (const m of plan.moves) { if (!goCheck(w, s, m.p, m.to).ok) continue; if (m.outcome === 'together' && !canFollow(w, s, m)) continue; res.moves.push({ ...m, a: names[m.p], b: names[m.q] }); const t = moveText(w, m, names); if (t) res.fixed.push({ text: t, kind: 'move', move: m }); }
  for (const x of intents) {
    const p = x.player, who = names[p], key = `${x.type}:${x.target}:${x.verb}:${s.loc[p]}`;
    if (done.has(key) && ['look', 'look_around', 'inventory', 'clue'].includes(x.type)) continue; done.add(key);
    s._actor = p; s._said = x.text;
    const vis = visibleItems(w, s, p), it = vis.find(i => i.id === x.target), inv = invOf(w, s, p).find(i => i.id === x.target), invEnt = inv && itemOf(w, inv.id)?.carry ? itemOf(w, inv.id) : undefined;
    if (x.type === 'look_around') { res.fixed.push({ text: roomText(w, s, s.loc[p]), kind: 'room', room: s.loc[p], p, said: x.text }); }
    else if (x.type === 'look') {
      if (it) look(w, s, it, res, who);
      else if (invEnt) look(w, s, invEnt, res, who);
      else if (inv) res.fixed.push({ images: [inv.id] }, { text: `${inv.name}.` });
      else res.fixed.push({ text: w.texts.notHere });
    } else if (x.type === 'go') {
      const ex = (w.rooms[s.loc[p]].exits || {})[x.target], known = routes(w, s, p).includes(x.target);
      if (x.target === s.loc[p]) { if (!x.joined) res.fixed.push({ text: roomText(w, s, s.loc[p]), kind: 'room', room: s.loc[p], p, said: x.text }); }
      else if (!ex && !known && it) look(w, s, it, res, who);
      else { const c = goCheck(w, s, p, x.target); if (!c.ok) { res.fixed.push({ text: c.no }); if (c.panel && test(c.panel.if, s, w)) res.fixed.push({ panel: c.panel }); } else enterRoom(w, s, p, x.target, res, who); }
    } else if (x.type === 'act') {
      if (!it && !inv) { res.fixed.push({ text: w.texts.notHere }); continue; }
      const t = it || invEnt || {};
      if (t.id) { s.seen[t.id] = true; s.touched[t.id] = true; }
      let a = x.with && t.actions?.[`use:${x.with}`]; if (!a && x.verb) a = t.actions?.[x.verb];
      if (!a && x.verb === 'take' && t.carry && it) { takeInto(w, s, t.id, res, who); res.fixed.push({ text: w.texts.taken.replace('{name}', t.carry.name || t.name) }); continue; }
      if (!a && x.verb === 'take' && t.pickable) { a = { give: [t.pickable], say: w.texts.taken.replace('{name}', t.pickable.name) }; s.where[t.id] = 'gone'; }   // taken: it leaves its place, so texts listing it drop it
      if (a) doAction(w, s, { ...a, _item: t.id }, res, who);
      else if (it && ['open', 'use', 'unlock'].includes(x.verb) && resolveLook(w, s, it).panel) look(w, s, it, res, who);
      else res.facts.push({ player: who, kind: 'attempt', item: t.name || inv?.name, state: t.state ? s.items[t.id] : undefined, attempt: x.text, result: 'it leads nowhere, nothing changes, anything they carry stays with them' });
    } else if (x.type === 'inventory') { const own = invOf(w, s, p); res.fixed.push({ text: own.length ? w.texts.carrying.replace('{list}', own.map(i => i.name).join(', ')) : w.texts.carryingNothing }); }
    else if (x.type === 'code') { const pan = vis.map(i => resolveLook(w, s, i).panel).filter(q => q && test(q.if, s, w)); const m = (it && resolveLook(w, s, it).panel) || pan.find(q => q.id === s.lastPanel) || pan[0]; res.fixed.push({ text: w.texts.usePanel }); if (m) res.fixed.push({ panel: m }); }
    else if (x.type === 'clue') { res.fixed.push({ text: w.texts.clue }); }
    else if (x.type === 'stay') { if (!plan.moves.some(m => m.q === p)) res.facts.push({ player: who, kind: 'moment', text: x.text }); }   // a refusal to come along is already worded by the move sentence
    else if (x.type === 'question') res.facts.push({ player: who, kind: 'question', question: x.text });
    else res.facts.push({ player: who, kind: 'moment', text: x.text });
  }
  delete s._actor; delete s._said;
  tick(w, s, res);
  return res;
}
/** End of a turn: the counter, delayed effects that are due, and "turn" rules. */
function tick(w, s, res) {
  s.turn = (s.turn || 0) + 1;
  const due = s.timers.filter(t => t.at <= s.turn); s.timers = s.timers.filter(t => t.at > s.turn);
  for (const t of due) doAction(w, s, t.do, res);
  fire(w, s, 'turn', res);
}
/** What player p carries: everything, or with inventoryPerPlayer only their own things and the shared ones. */
const invOf = (w, s, p) => w.inventoryPerPlayer && p !== undefined ? s.inv.filter(i => i.p === undefined || i.p === p) : s.inv;
/** Panel messages: (GAME: SOLVED, title) and the game's own patterns. */
function gameEvent(w, s, text, res, actor) {
  upgrade(w, s);
  if (actor !== undefined) s._actor = actor;
  const m = text.match(/\(GAME: SOLVED, ([^)]+)\)/); if (m) { s.solved[m[1]] = true; fire(w, s, `solved:${m[1]}`, res); }
  for (const o of w.onMessage || []) { const x = text.match(new RegExp(o.match)); if (x) { for (const [k, v] of Object.entries(o.setVar || {})) s.vars[k] = String(v).replace(/\$(\d)/g, (_, n) => x[n] ?? ''); if (o.do) doAction(w, s, o.do, res); } }
  delete s._actor;
}
function compose(w, s, res, names, prose, p) {
  const seen = new Set(), L = [];
  for (const f of res.fixed) {
    if (f.text && !L.includes(f.text)) L.push(f.text);
    for (const i of f.images || []) if (!seen.has(i)) { seen.add(i); L.push(`[img:${i}]`); }
    if (f.view && !seen.has(f.view)) { seen.add(f.view); L.push(`[view:${f.p ?? 0}:${f.view}]`); }
    if (f.panel && !seen.has('p:' + f.panel.id)) { seen.add('p:' + f.panel.id); s.lastPanel = f.panel.id; L.push(`[panel:${f.panel.id}|${f.panel.label}]`); }
  }
  if (prose) L.push(prose);
  return (L.join('\n\n') + '\n\n' + statusOf(w, s, names, p)).trim();
}
function statusOf(w, s, names, p) {
  const v = { ...s.vars, loc0: w.rooms[s.loc[0]].name, loc1: w.rooms[s.loc[1]].name };
  return '```\n' + w.status.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '') + '\n```\n' + w.texts.inventoryMarker + ': ' + invOf(w, s, p).map(i => `[i:${i.id}|${i.name}]`).join(' ');
}
const unseen = (w, s, p) => visibleItems(w, s, p).filter(i => !s.seen[i.id]).map(i => i.name);
/** The room's exits, then the farther rooms already known and reachable. Far rooms get no direction word; "down" and "up" belong to the direct exits. */
function exitsFor(w, s, p) {
  const direct = w.rooms[s.loc[p]].exits || {}, room = id => w.rooms[id].aliases || [];
  return [...Object.entries(direct).map(([id, x]) => ({ id, name: w.rooms[id].name, aliases: [...(x.aliases || []), ...room(id)] })), ...routes(w, s, p).filter(id => !direct[id]).map(id => ({ id, name: w.rooms[id].name, aliases: room(id), distant: true }))];
}
/** Verbs the interpreter may pick for an item. "open" on an item with a panel opens the panel (see run), so it is listed too; otherwise a lone "force" pulls plain opening towards it. */
const verbsOf = (w, s, i) => { const v = [...Object.keys(i.actions || {}), ...(i.pickable || i.carry ? ['take'] : [])], p = resolveLook(w, s, i).panel; if (p && test(p.if, s, w) && !v.includes('open')) v.push('open'); return v; };
/** Properties the players can see: open and lit always, others only when marked public. Secrets never go to the model. */
const PUBLIC = ['open', 'lit'];
function publicProps(w, s, i) { const out = {}; for (const [k, p] of Object.entries(i.props || {})) if (PUBLIC.includes(k) || p?.public) out[k] = getProp(s, i.id, k); return Object.keys(out).length ? out : undefined; }
/** A secret-free picture of the world for the interpreter. A part or a thing inside another carries its parent's name ("in"), so "the drawer" is not mixed up. */
function forInterpreter(w, s, names, aud) {
  upgrade(w, s);
  const pl = p => ({ name: names[p], room: s.loc[p], items: visibleItems(w, s, p).map(i => { const par = itemOf(w, whereOf(w, s, i.id)); return { id: i.id, name: i.name, aliases: i.aliases, ...(par ? { in: par.name } : {}), state: i.state ? s.items[i.id] : undefined, props: publicProps(w, s, i), verbs: verbsOf(w, s, i) }; }), exits: exitsFor(w, s, p) });
  return { A: pl(0), B: pl(1), inventory: w.inventoryPerPlayer && aud?.length === 1 ? invOf(w, s, aud[0]) : s.inv };
}
/** Start-up check: references, and whether the end of the game can be reached. */
function validate(w, images, panels) {
  const E = [], ids = new Set(w.items.map(i => i.id)), rooms = new Set(Object.keys(w.rooms)), states = {}, props = {};
  for (const r of [w.start].flat()) if (!rooms.has(r)) E.push(`start: no such room: ${r}`);
  for (const e of [...w.items, ...Object.entries(w.rooms).map(([id, r]) => ({ ...r, id }))]) { props[e.id] = propsOf(e); if (e.state) states[e.id] = new Set(e.state.values); }
  const dup = w.items.map(i => i.id).filter((x, n, a) => a.indexOf(x) !== n); if (dup.length) E.push('Duplicate item: ' + dup);
  const chkC = (c, where) => {
    if (!c) return; if (c.all || c.any) (c.all || c.any).forEach(x => chkC(x, where)); else if (c.not) chkC(c.not, where);
    else if (c.item) { if (!ids.has(c.item)) E.push(`${where}: no such item: ${c.item}`); else if (!states[c.item]?.has(c.state)) E.push(`${where}: ${c.item} cannot be ${c.state}`); }
    else if (c.var !== undefined) { /* game variable, free-form */ }
    else if (c.is) { const i = c.is.lastIndexOf('.'), id = c.is.slice(0, i), pr = c.is.slice(i + 1); if (id !== 'game' && !props[id]) E.push(`${where}: no such entity: ${id}`); else if (id !== 'game' && !(pr in props[id])) E.push(`${where}: ${id} has no property: ${pr}`); }
    else if (c.where) { if (!ids.has(c.where)) E.push(`${where}: no such item: ${c.where}`); }
    else if (c.player !== undefined) { if (!rooms.has(c.at)) E.push(`${where}: no such room: ${c.at}`); }
    else if (c.seen && !ids.has(c.seen)) E.push(`${where}: no such item: ${c.seen}`);
  };
  const chkImg = (l, where) => { for (const i of l || []) if (images && !images.has(i)) E.push(`${where}: no such image: ${i}`); };
  const chkP = (p, where) => { if (p) { if (panels && !panels.has(p.id)) E.push(`${where}: no such panel: ${p.id}`); chkC(p.if, where); } };
  const chkSet = (k, v, where) => { const i = k.lastIndexOf('.'), id = k.slice(0, i), pr = k.slice(i + 1), d = props[id]?.[pr]; if (d === undefined) E.push(`${where}: no such property: ${k}`); else if (v !== undefined && d?.values && !d.values.includes(v)) E.push(`${where}: ${k} cannot be ${v}`); };
  const reveals = new Set();
  const chkA = (a, where, it) => {
    if (!a) return; chkC(a.requires, where);
    if (a.setState && (!it?.state || !it.state.values.includes(a.setState))) E.push(`${where}: bad state: ${a.setState}`);
    if (a.setItem && !states[a.setItem.item]?.has(a.setItem.state)) E.push(`${where}: bad state: ${JSON.stringify(a.setItem)}`);
    for (const [k, v] of Object.entries(a.set || {})) chkSet(k, v, where); for (const k of Object.keys(a.inc || {})) chkSet(k, undefined, where);
    for (const id of [...(a.reveal || []), ...(a.take || []), ...Object.keys(a.moveTo || {})]) if (!ids.has(id)) E.push(`${where}: no such item: ${id}`);
    for (const id of a.reveal || []) reveals.add(id);
    chkImg(a.images, where); chkP(a.panel, where); for (const g of a.give || []) if (images && !images.has(g.id)) E.push(`${where}: item has no image: ${g.id}`);
    if (a.after) chkA(a.after.do, where + '.after', it);
    for (const id of a.show || []) if (!ids.has(id)) E.push(`${where}: no such item: ${id}`); if (a.goTo && !rooms.has(a.goTo)) E.push(`${where}: no such room: ${a.goTo}`); if (a.notify && !rooms.has(a.notify.at)) E.push(`${where}: notify: no such room: ${a.notify.at}`);
  };
  for (const it of w.items) {
    const n = `item ${it.id}`;
    if (it.kind === 'door') { for (const r of it.between || []) if (!rooms.has(r)) E.push(`${n}: no such room: ${r}`); }
    else if (!rooms.has(it.location) && !ids.has(it.location)) E.push(`${n}: no such room or parent: ${it.location}`);
    for (let at = it.location, d = 0; ids.has(at); at = itemOf(w, at).location) if (++d > 20 || at === it.id) { E.push(`${n}: parent loop`); break; }
    if (it.state && typeof it.text === 'object' && !Array.isArray(it.text)) for (const v of it.state.values) if (!(v in it.text)) E.push(`${n}: no text for: ${v}`);
    if (Array.isArray(it.text)) for (const v of it.text) chkC(v.if, n);
    chkC(it.visibleIf, n); chkP(it.panel, n); if (Array.isArray(it.images)) chkImg(it.images, n); chkA(it.onLook, n, it);
    for (const v of it.when || []) { chkC(v.if, n); chkImg(v.images, n); chkP(v.panel, n); chkA(v.do, n, it); }
    for (const [k, a] of Object.entries(it.actions || {})) chkA(a, `${n}.${k}`, it);
  }
  for (const [id, r] of Object.entries(w.rooms)) {
    if (Array.isArray(r.text)) for (const v of r.text) chkC(v.if, `room ${id}`);
    if (Array.isArray(r.image)) for (const v of r.image) { chkC(v.if, `room ${id}`); chkImg([v.image], `room ${id}`); }
    for (const [t, x] of Object.entries(r.exits || {})) { if (!rooms.has(t)) E.push(`room ${id}: no such exit: ${t}`); if (x.door && !ids.has(x.door)) E.push(`room ${id}: no such door: ${x.door}`); chkC(x.requires, `room ${id}`); chkP(x.panel, `room ${id}`); }
  }
  for (const r of w.rules || []) { chkC(r.if, 'rule ' + r.on); chkA(r.do, 'rule ' + r.on); }
  // hand highlight marks in world texts: [[word|id]] must name an item (or "-": never highlighted)
  for (const m of JSON.stringify({ rooms: w.rooms, items: w.items, rules: w.rules || [] }).matchAll(/\[\[[^|\]]+\|([^\]]*)\]\]/g)) if (m[1] !== '-' && !ids.has(m[1])) E.push(`highlight mark: no such item: ${m[1]}`);
  for (const it of w.items) if (it.hidden && !reveals.has(it.id)) E.push(`item ${it.id}: hidden, but nothing reveals it`);
  // details (colorizer): plain mood facts; they may not name a hidden thing or a sensitive word (world.sensitiveWords)
  const low = x => String(x).toLowerCase(), secretOf = it => [it.name, ...(it.aliases || [])].filter(x => x && x.length >= 4).map(low);
  for (const e of [...w.items, ...Object.entries(w.rooms).map(([id, r]) => ({ ...r, id }))]) {
    if (e.details === undefined) continue;
    if (!Array.isArray(e.details) || !e.details.every(d => typeof d === 'string')) { E.push(`${e.id}: details must be a list of strings`); continue; }
    const bad = [...w.items.filter(i => i.hidden && i.id !== e.id).flatMap(secretOf), ...(w.sensitiveWords || []).map(low)];
    for (const d of e.details) { const hit = bad.find(x => low(d).includes(x)); if (hit) E.push(`${e.id}: details name a hidden thing or a sensitive word (${hit}): ${d}`); }
  }
  return E;
}
/** Reachability: collects reachable states while the set grows, treating negation and numbers permissively. Finds dead ends; it cannot judge whether a puzzle makes sense. */
function reachable(w) {
  const st = {}, inv = new Set((w.inventory || []).map(x => x.id)), solved = new Set(), rooms = new Set([w.start].flat()), seen = new Set(), shown = new Set(), revealed = new Set(); let changed = true;
  const key = (id, pr) => `${id}.${pr}`;
  for (const e of [...w.items, ...Object.entries(w.rooms).map(([id, r]) => ({ ...r, id }))]) for (const [pr, d] of Object.entries(propsOf(e))) st[key(e.id, pr)] = new Set([initialOf(d)]);
  const ok = c => {
    if (!c) return true; if (c.all) return c.all.every(ok); if (c.any) return c.any.some(ok); if (c.not) return true;
    if (c.item) return !!st[key(c.item, 'state')]?.has(c.state); if (c.var !== undefined) return true; if (c.is) { const v = st[c.is]; return !v || !('eq' in c) || v.has(c.eq); }
    if (c.has) return inv.has(c.has); if (c.where) return c.at === 'inventory' ? inv.has(c.where) : true;
    if (c.solved) return solved.has(c.solved); if (c.seen || c.knows) return seen.has(c.seen || c.knows); if (c.visited) return rooms.has(c.visited); if (c.player !== undefined) return rooms.has(c.at); return true;
  };
  const add = (set, v) => { if (set && !set.has(v)) { set.add(v); changed = true; } };
  const titles = w.panelTitles || {};
  const act = (a, it) => {
    if (!a || !ok(a.requires) || a.forbidden) return;
    if (a.setState && it) add(st[key(it.id, 'state')], a.setState); if (a.setItem) add(st[key(a.setItem.item, 'state')], a.setItem.state);
    for (const [k, v] of Object.entries(a.set || {})) add(st[k], v);
    for (const id of a.reveal || []) add(revealed, id);
    for (const id of [...(a.take || []), ...Object.entries(a.moveTo || {}).filter(([, t]) => t === 'inventory').map(([id]) => id)]) add(inv, id);
    for (const g of a.give || []) add(inv, g.id); panel(a.panel); if (a.after) act(a.after.do, it); if (a.goTo) add(rooms, a.goTo);
    if (a.emit) for (const r of w.rules || []) if (r.on === a.emit && ok(r.if)) act(r.do);
  };
  const panel = p => { if (p && ok(p.if) && titles[p.id]) add(solved, titles[p.id]); };
  const reach = it => {
    if ((it.hidden && !revealed.has(it.id)) || !ok(it.visibleIf)) return false;
    if (it.kind === 'door') return (it.between || []).some(r => rooms.has(r));
    if (w.rooms[it.location]) return rooms.has(it.location);
    const par = itemOf(w, it.location); if (!par || !shown.has(par.id)) return false;
    const open = st[key(par.id, 'open')]; return (it.rel || 'in') !== 'in' || !open || open.has(true);
  };
  const ruleEv = ev => ev.startsWith('solved:') ? solved.has(ev.slice(7)) : ev.startsWith('set:') ? (st[ev.slice(4)]?.size || 0) > 1 : /^(enter|leave):/.test(ev) ? rooms.has(ev.split(':')[1]) : ev.startsWith('take:') ? inv.has(ev.slice(5)) : ev.startsWith('look:') ? shown.has(ev.slice(5)) : ev === 'turn';
  while (changed) {
    changed = false;
    for (const it of w.items) {
      if (!reach(it)) continue; add(shown, it.id); add(seen, it.id); panel(it.panel); act(it.onLook, it);
      for (const q of it.when || []) if (ok(q.if)) { panel(q.panel); act(q.do, it); }
      for (const a of Object.values(it.actions || {})) act(a, it); if (it.pickable) add(inv, it.pickable.id); if (it.carry) add(inv, it.id);
    }
    for (const r of [...rooms]) for (const [t, x] of Object.entries(w.rooms[r].exits || {})) { panel(x.panel); const door = x.door && st[key(x.door, 'open')]; if (ok(x.requires) && (!door || door.has(true))) add(rooms, t); }
    for (const r of w.rules || []) if (ruleEv(r.on) && ok(r.if)) act(r.do);   // rules on an emitted name run only with the action that fires them
  }
  const E = []; for (const r of Object.keys(w.rooms)) if (!rooms.has(r)) E.push(`Unreachable room: ${r}`);
  for (const t of Object.values(titles)) if (!solved.has(t)) E.push(`Unsolvable panel: ${t}`);
  for (const it of w.items) if (it.state) for (const v of it.state.values) if (!st[key(it.id, 'state')].has(v)) E.push(`Unreachable state: ${it.id}=${v}`);
  for (const x of w.mustReach || []) if (!ok(x)) E.push('Goal cannot be reached: ' + JSON.stringify(x));
  return E;
}
module.exports = { setPlayers, avatarLines, invOf, routes, initState, upgrade, run, gameEvent, compose, statusOf, forInterpreter, validate, reachable, test, unseen, visibleItems, roomText, moveText, roomImage };
