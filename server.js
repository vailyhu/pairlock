// pAIr-lock: one Node process serves the home page and both players and calls the model. No dependencies.
const os = require('os'), http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const Color = require('./engine/colorize'), H = require('./engine/highlight'), Grammar = require('./engine/grammar'), Str = require('./engine/strings'), Settings = require('./engine/settings'), W = require('./engine/world'), AI = require(process.env.DUO_AI_FIXTURE ? './engine/ai_replay' : './engine/ai');
const ROOT = __dirname, cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')), LANG = cfg.lang || 'hu', fmt = Str.fmt;
/** Strings of the server's own language, for pages and errors not tied to a game. */
const L0 = Str.forLang(LANG);
const home = p => p.replace(/^~/, process.env.HOME), SAVES = process.env.DUO_SAVES || path.join(ROOT, 'saves'), GAMES = process.env.DUO_GAMES || path.join(ROOT, 'games');
const MIME = { '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };

// ---- game packages: one folder under games/ with game.json, GAME.md, images/, icons/, optionally panels.json, server.js (game hook) and theme.css
const Mod = require('./engine/modules'), games = {};
// 18+ games load only with --nsfw (or PAIRLOCK_NSFW=1, or config.json "nsfw": true); they are not in git, games/nsfw.json lists them
// and --nsfw first fetches what is missing (engine/nsfw.js). Without it, games marked "nsfw": true and those in the list are not
// loaded at all, and their saves stay on disk unseen.
const Nsfw = require('./engine/nsfw');
const NSFW = process.argv.includes('--nsfw') || process.env.PAIRLOCK_NSFW === '1' || cfg.nsfw === true, HIDDEN = new Set();
let nsfwReady = new Set();
function loadGames() {
  const listed = new Set(Object.keys(Nsfw.manifest(GAMES)?.games || {}));
  if (!NSFW) for (const id of listed) HIDDEN.add(id);
  for (const id of fs.readdirSync(GAMES)) {
    const f = path.join(GAMES, id, 'game.json'); if (!fs.existsSync(f)) continue;
    const g = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!NSFW && (g.nsfw || listed.has(id))) { HIDDEN.add(id); continue; }
    if (NSFW && listed.has(id) && !nsfwReady.has(id)) continue;
    g.id = id; g.system = fs.readFileSync(path.join(GAMES, id, 'GAME.md'), 'utf8'); g.hasTheme = fs.existsSync(path.join(GAMES, id, 'theme.css'));
    const wf = path.join(GAMES, id, 'world.json');
    if (!fs.existsSync(wf)) { console.error(`[${id}] no world.json, game not loaded.`); continue; }
    {
      g.world = JSON.parse(fs.readFileSync(wf, 'utf8'));
      // A game may set its own language; the engine's default texts come from it, and the game's own texts win.
      g.L = Str.forLang(g.lang || LANG, LANG); g.world.texts = { ...g.L.engine.world, inventoryMarker: g.L.ui.markers.inventory, ...g.world.texts };
      g.goRe = new RegExp(`^${g.L.engine.goAlone}: (.+)\\.$`);
      const imgs = new Set(fs.readdirSync(path.join(GAMES, id, 'images')).map(f => f.replace(/\.[a-z]+$/, '')));
      const errs = [...W.validate(g.world, imgs, new Set(g.world.panelIds)), ...W.reachable(g.world)];
      if (errs.length) { console.error(`[${id}] INVALID WORLD, game not loaded:\n  ` + errs.join('\n  ')); continue; }
    }
    g.panels = Mod.load(path.join(GAMES, id)); const hook = path.join(GAMES, id, 'server.js'); g.hook = fs.existsSync(hook) ? require(hook) : null;
    games[id] = g;
  }
}
/** The AI key from the home page settings (settings.json). Missing: the turn stops with a clear message. */
const apiKey = () => { const k = Settings.key(); if (!k && !process.env.DUO_AI_FIXTURE) throw Object.assign(new Error('no AI key'), { noKey: true }); return k; };
/** Requests from this machine only: the settings hold the key, players on other devices must not change them. */
const isLocal = req => { const a = String(req.socket.remoteAddress || '').replace(/^::ffff:/, ''); return Object.values(os.networkInterfaces()).flat().some(x => x.address === a); };

// ---- runs
const runs = {};
const token = () => crypto.randomBytes(12).toString('hex');
function saveRun(r) {
  if (r.deleted) return;
  r.updated = Date.now(); settle(r); const f = path.join(SAVES, r.id + '.json'), { clients, timer, queue, busy, clockStart, ...data } = r;
  fs.writeFileSync(f + '.tmp', JSON.stringify(data)); fs.renameSync(f + '.tmp', f);
}
function loadSaves() { let n = 0; for (const f of fs.readdirSync(SAVES)) if (f.endsWith('.json')) { const r = JSON.parse(fs.readFileSync(path.join(SAVES, f), 'utf8')); if (runs[r.id] || HIDDEN.has(r.game)) continue; if (r.world && games[r.game]) W.upgrade(games[r.game].world, r.world); r.clients = []; r.queue = []; r.busy = false; r.panelOpen = [false, false]; markHandled(r); runs[r.id] = r; n++; } return n; }
/** Saves from before threads: every player message before the last reply has been handled. */
function markHandled(r) { if (r.v >= 2) return; const last = r.messages.map(m => m.role).lastIndexOf('assistant'); r.messages.forEach((m, i) => { if (m.role === 'user' && i < last) m.done = true; }); r.v = 2; }
// after a restart: an interrupted narrator reply is made again, and a half-finished round gets its auto-pass back
function resume() { for (const r of Object.values(runs)) { if (!games[r.game]) continue; Mod.leaveAll(games[r.game], r, 0); Mod.leaveAll(games[r.game], r, 1); if (r.owed) enqueue(r, () => generate(r, Array.isArray(r.owed) ? r.owed : BOTH)); else if (r.pending.some(Boolean)) roundIfReady(r); } }
const namesOf = r => r.names || games[r.game].players;
/** Game texts contain the default names; they are replaced once per run, so the start of the prompt stays fixed. */
/** The game's sample player names (game.json players) in a text, replaced by this run's names. Only the bare name is replaced, so game texts use no suffixed forms of it. */
function withNames(g, names, text) { const rx = new RegExp(g.players.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g'); return String(text).replace(rx, m => names[g.players.indexOf(m)]); }
function systemOf(r) { return withNames(games[r.game], namesOf(r), games[r.game].system) + gendersLine(r); }
/** The players' genders for the narrator, fixed per run so the prompt start stays cached. Runs from before genders get nothing. */
const gendersLine = r => r.genders ? `\n\nPlayers' genders (for grammar and how others address them; nothing in the game depends on it): ${namesOf(r).map((x, i) => `${x}: ${r.genders[i] === 'm' ? 'male' : 'female'}`).join(', ')}.` : '';
/** Gender per player, 'f' or 'm' (the home page's toggle); missing ones default to f, m. */
const checkGenders = list => [0, 1].map(i => ['f', 'm'].includes(list?.[i]) ? list[i] : (i ? 'm' : 'f'));
function checkNames(g, list) { const n = (list || []).map(x => String(x ?? '').trim().replace(/\s+/g, ' ')); const out = g.players.map((d, i) => n[i] || d); if (out.some(x => !/^[\p{L}][\p{L} '.-]{0,23}$/u.test(x))) return { error: g.L.engine.errors.badName }; if (out[0].toLocaleLowerCase('hu') === out[1].toLocaleLowerCase('hu')) return { error: g.L.engine.errors.sameNames }; return { names: out }; }
function newRun(gameId, solo, names, genders) {
  // Games started in the same minute must not overwrite each other.
  const base = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '-' + gameId, g = games[gameId]; let id = base; for (let n = 2; runs[id]; n++) id = `${base}-${n}`;
  const r = { id, game: gameId, names, genders: checkGenders(genders), playMs: 0, created: Date.now(), solo: !!solo, tokens: [token(), token()], messages: openingOf(g, names), next: openingOf(g, names).length, v: 2, pending: [false, false], notes: { 0: '', 1: '', shared: '' }, stats: [], activity: [0, 0], panelOpen: [false, false], clients: [], queue: [], busy: false };
  r.world = W.initState(g.world); W.setPlayers(r.world, namesOf(r), r.genders);
  // the start room's avatarText goes under the opening (one opening per player: each gets their own room's lines)
  for (const m of r.messages) { const ps = m.to || BOTH, lines = [...new Set(ps.map(p => r.world.loc[p]))].flatMap(room => W.avatarLines(g.world, r.world, room, BOTH.filter(q => r.world.loc[q] === room))); if (lines.length) m.text = `${m.text}\n\n${lines.join('\n\n')}`; }
  runs[id] = r; saveRun(r); return r;
}
function settle(r) { if (r.clockStart) { const t = Date.now(); r.playMs = (r.playMs || 0) + t - r.clockStart; r.clockStart = t; } }
const playMs = r => (r.playMs || 0) + (r.clockStart ? Date.now() - r.clockStart : 0);
function clockFor(r) { const want = r.clients.length > 0 && !r.ended; if (want && !r.clockStart) r.clockStart = Date.now(); else if (!want && r.clockStart) { settle(r); r.clockStart = null; } }
// ---- threads: together (same room) both players share one thread; apart, each player has their own and nobody waits.
// A message's "to" lists who sees it (none = both). It never changes, so each audience's history only grows: the prompt cache keeps working.
const BOTH = [0, 1];
// Games in two eras (game.json eras) always keep two threads, even played alone: the eras never share a room.
const apart = r => (!r.solo || !!games[r.game]?.eras) && !!r.world && r.world.loc[0] !== r.world.loc[1];
/** Who a new message from player p is for. */
const audOf = (r, p) => apart(r) ? [p] : BOTH;
/** Waiting switched off (the header toggle, saved on the run, on by default): together, every message gets its reply at once in the shared thread, like apart. */
const noWait = r => r.wait === false && !r.solo;
const sees = (m, p) => !m.to || m.to.includes(p);
/** The opening: one shared message, or (game.json "first" as a list, e.g. two eras) one message per player in their own thread. */
const openingOf = (g, names) => Array.isArray(g.first) ? g.first.map((text, p) => ({ id: p, role: 'assistant', text: withNames(g, names, text), to: [p], opening: true })) : [{ id: 0, role: 'assistant', text: withNames(g, names, g.first), opening: true }];
const sendTo = (r, aud, ev, data) => { const s = `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`; for (const c of r.clients) if (aud.includes(c.player)) c.res.write(s); };
const send = (r, ev, data, except) => { const s = `event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`; for (const c of r.clients) if (c.player !== except) c.res.write(s); };
const lockedPanels = r => { const w = games[r.game]?.world; return w && r.world ? Object.entries(w.panelAvail || {}).filter(([, c]) => !W.test(c, r.world, w)).map(([id]) => id) : []; };
const roomsOf = r => { const w = games[r.game]?.world; return w && r.world ? r.world.loc.map(id => w.rooms[id]?.name || null) : null; };
const travelOf = r => { const w = games[r.game]?.world; return w && r.world ? [0, 1].map(p => W.routes(w, r.world, p).map(id => ({ id, name: w.rooms[id].name }))) : null; };
const pub = r => ({ rooms: roomsOf(r), travel: travelOf(r), locked: lockedPanels(r), playMs: playMs(r), clockOn: !!r.clockStart, ended: !!r.ended, pending: r.pending, busy: r.busy, writing: r.writing || null, apart: apart(r), autoIn: r.autoAt ? Math.max(0, r.autoAt - Date.now()) : null, autoPaused: !!r.autoPaused, wait: r.wait !== false, waitBy: r.waitBy ?? null, online: [0, 1].map(p => r.clients.some(c => c.player === p)) });
const status = r => send(r, 'round', pub(r));
// Each player receives a module's live state in their own view.
Mod.setPush((r, id) => { const c = games[r.game]?.panels[id]; if (c) for (const x of r.clients) x.res.write(`event: mod\ndata: ${JSON.stringify(Mod.view(c, id, r, x.player))}\n\n`); });
/** Messages written by the engine (panels), never by a player: only these may trigger scripted text or the end. */
const ENGINE_RE = /^\(GAME: /;
function add(r, role, text, aud = BOTH, extra) { const m = { id: r.next++, role, text, ...(aud.length < 2 ? { to: aud } : {}), ...extra }; r.messages.push(m); sendTo(r, aud, 'msg', m); status(r); const e = games[r.game].endPattern; if (e && !r.ended && role === 'user' && ENGINE_RE.test(text) && new RegExp(e).test(text)) { r.ended = true; clockFor(r); status(r); } return m; }

// ---- moves: every request runs in a queue, one generation at a time
function enqueue(r, job) { r.queue.push(job); pump(r); }
async function pump(r) {
  if (r.busy) return; r.busy = true; status(r);
  while (r.queue.length) { try { await r.queue.shift()(); } catch (e) { console.error(e); send(r, 'error', { text: e.noKey ? games[r.game].L.engine.errors.noKey : e.status ? fmt(games[r.game].L.engine.errors.model, { status: e.status }) : String(e.message || e) }); } saveRun(r); }
  r.busy = false; status(r);
}
function roundIfReady(r) { if (r.solo || noWait(r) || r.pending.every(Boolean)) { r.pending = [false, false]; clearTimeout(r.timer); r.autoAt = null; r.autoPaused = false; r.owed = BOTH; enqueue(r, () => generate(r, BOTH)); } else armAuto(r); status(r); }
/** A player's message. direct: an action that skips the interpreter ({type: 'look_around'} or {type: 'look', target}), from the page's buttons. */
function move(r, p, text, direct) {
  const name = namesOf(r)[p], t = (text || '').trim(), extra = direct ? { direct } : undefined;
  enqueue(r, async () => {
    // Decided when the move's turn comes, after earlier moves have run: the player may have just walked away or arrived.
    const aud = audOf(r, p);
    if (aud.length === 1 || noWait(r)) { if (!t) return; add(r, 'user', `${name}: ${t}`, aud, extra); r.movedAt = Date.now(); await generate(r, aud); return; }
    add(r, 'user', t ? `${name}: ${t}` : fmt(games[r.game].L.ui.markers.pass, { name }), BOTH, t ? extra : undefined); r.pending[p] = true; r.movedAt = Date.now(); saveRun(r); roundIfReady(r);
  });
}
/** A panel or button message. aud: who it is for; a joint one also ends the current round. */
function gameMsg(r, text, silent, aud = BOTH) { enqueue(r, async () => { add(r, 'user', text, aud); if (!silent) { if (aud.length > 1) { r.pending = [false, false]; clearTimeout(r.timer); r.autoAt = null; r.autoPaused = false; status(r); } await generate(r, aud); } }); }
/** Auto-pass: the deadline counts from the other player's move or the late player's last activity, and pauses while a panel is open. */
function armAuto(r) {
  clearTimeout(r.timer); r.autoAt = null; r.autoPaused = false;
  if (apart(r) || noWait(r)) return;
  const s = games[r.game].autoPass, p = r.pending.findIndex(x => !x);
  if (!s || r.solo || p < 0 || !r.pending[1 - p]) return;
  if (r.panelOpen[p]) { r.autoPaused = true; return; }
  r.autoAt = Math.max(r.activity[p] || 0, r.movedAt || 0) + s * 1000;
  r.timer = setTimeout(() => { r.autoAt = null; move(r, p, ''); }, Math.max(0, r.autoAt - Date.now()));
}

// ---- round
// Message of the destination picker: goes to the engine without the model; typing it works the same way.
async function generate(r, aud = BOTH) { r.owed = aud; r.writing = aud; saveRun(r); status(r); try { await worldTurn(r, aud); r.owed = false; } finally { r.writing = null; } }
/** The scripted entry for an engine message: the first whose `re` matches and whose optional `if` (a world condition) holds now. */
const scriptedOf = (g, s, last) => last && ENGINE_RE.test(last.text) && (g.scripted || []).find(x => new RegExp(x.re).test(last.text) && (!x.if || W.test(x.if, s, g.world))) || null;
/** World-model round: the interpreter turns text into actions, the engine runs them, the narrator only words the free part. */
async function worldTurn(r, aud) {
  const g = games[r.game], w = g.world, s = r.world, names = namesOf(r), start = Date.now(); let key; W.setPlayers(s, names, r.genders);
  // Not yet handled messages of this thread; a joint turn also takes leftovers of the apart time (such as a silent hint).
  const pend = r.messages.filter(m => m.role === 'user' && !m.done && (aud.length > 1 || (m.to?.length === 1 && m.to[0] === aud[0]))), last = pend[pend.length - 1];
  const before = [...s.loc], finish = (text, to = aud, extra) => { pend.forEach(m => { m.done = true; }); add(r, 'assistant', text, to, { of: pend.map(m => m.id), ...extra }); notices(r, to, before); };
  const res = { fixed: [], facts: [], gave: [] }, lines = [], walk = []; let wantUnseen = false;
  for (const m of pend) {
    if (/^\(GAME: /.test(m.text)) { W.gameEvent(w, s, m.text, res, m.to?.length === 1 ? m.to[0] : undefined); continue; }
    if (m.text === '(OOC: unseen)') { wantUnseen = true; continue; }
    const p = names.findIndex(n => m.text.startsWith(n + ': ')); if (p < 0) continue;
    const said = m.text.slice(names[p].length + 2);
    if (m.direct) { walk.push({ player: p, type: m.direct.type, target: m.direct.target, text: said }); continue; }   // the page's look buttons: no interpreter
    const to = said.match(g.goRe), room = to && Object.keys(w.rooms).find(id => w.rooms[id].name === to[1]);
    if (room) walk.push({ player: p, type: 'go', target: room, text: said }); else lines.push({ player: 'AB'[p], text: said });
  }
  // A scripted event (the end, a ship in sight) happens to everyone, even when one player caused it alone. Its `if` is tested after the panel message has run.
  const sc = scriptedOf(g, s, last);
  if (sc && w.inventoryPerPlayer) { pend.forEach(m => { m.done = true; }); for (const p of BOTH) add(r, 'assistant', `${sc.text}\n\n${W.statusOf(w, s, names, p)}`.trim(), [p], { of: pend.map(m => m.id) }); return; }   // each sees their own things
  if (sc) { finish(`${sc.text}\n\n${W.statusOf(w, s, names)}`.trim(), BOTH); return; }
  if (wantUnseen) for (const p of aud) { const u = W.unseen(w, s, p); if (p === 1 && aud.length > 1 && s.loc[1] === s.loc[0]) break; res.fixed.push({ text: fmt(u.length ? g.L.engine.unseen : g.L.engine.allSeen, { room: w.rooms[s.loc[p]].name, list: u.join(', ') }) }); }
  const stat = { t: Date.now() };
  if (lines.length || walk.length) {
    const it = lines.length ? await AI.interpret(key = apiKey(), g.model?.name || Settings.model(), W.forInterpreter(w, s, names, aud), lines) : { actions: [], ms: 0 }; stat.parseMs = it.ms;
    const acts = [...it.actions.map(a => ({ ...a, player: a.player === 'B' ? 1 : 0 })), ...walk];
    const out = W.run(w, s, acts, names); res.fixed.push(...out.fixed); res.facts.push(...out.facts); res.gave.push(...out.gave); if (out.notify) (res.notify = res.notify || []).push(...out.notify);
  }
  // Colorizer: runs beside the narrator; its answer replaces fixed texts only if every check passes (engine/colorize.js)
  const colorJob = g.colorize?.on && res.fixed.some(f => f.kind) ? Color.colorize({ w, s, res, names, aud, cfg: g.colorize, L: g.L.engine.colorize, ai: input => AI.colorize(key || apiKey(), g.colorize.model || g.model?.name || Settings.model(), Color.PROMPT, input) }).catch(e => ({ changes: [], log: [{ fail: 'error: ' + e.message }] })) : null;
  let prose = '';
  if (res.facts.length) {
    const tail = [...(g.tailRules || []).filter(x => new RegExp(x.if).test(r.messages.map(m => m.text).join('\n'))).map(x => x.text), 'Facts for this reply, write only about these: ' + JSON.stringify(res.facts)].join('\n');
    sendTo(r, aud, 'stream', { text: '' });
    // Only what everyone in this thread has seen, so the narrator cannot pass on the other thread's secrets.
    const hist = r.messages.filter(m => aud.every(p => sees(m, p))).map(m => ({ role: m.role, content: m.text }));
    const a = await AI.narrate(key || apiKey(), { ...g.model, name: g.model?.name || Settings.model() }, [{ role: 'system', content: systemOf(r) }, ...hist, { role: 'system', content: tail }], t => sendTo(r, aud, 'stream', { text: AI.clean(t, g.L.ui.markers.inventory) }));
    prose = AI.clean(a.text, g.L.ui.markers.inventory); const u = a.usage || {}; Object.assign(stat, { ms: a.ms, in: u.prompt_tokens, hit: u.prompt_cache_hit_tokens, out: u.completion_tokens });
  }
  const color = colorJob && await colorJob;
  if (color) { for (const c of color.changes) res.fixed[c.i] = { ...res.fixed[c.i], text: c.text, orig: res.fixed[c.i].text }; stat.colorMs = color.ms; stat.colorOk = color.changes.length; stat.colorFail = color.log.filter(x => x.fail).length; }
  stat.ms = Date.now() - start; r.stats.push(stat); console.log(`[${r.id}] round ${stat.ms} ms, interpreter ${stat.parseMs || 0} ms, prompt ${stat.in || 0}, cache ${stat.hit || 0}${color ? `, colorizer ${color.changes.length} ok ${stat.colorFail} fixed (${color.ms || 0} ms)` : ''}`);
  // notify: something heard or seen in another room; a player of this thread standing there gets it in this reply, one in the other thread as a notice
  const far = [];
  for (const n of res.notify || []) for (const q of BOTH) { if (r.solo && q === 1 && s.loc[0] === s.loc[1]) continue; if (s.loc[q] !== n.at) continue;
    if (aud.includes(q)) { if (!res.fixed.some(f => f.text === n.text)) res.fixed.push({ text: n.text }, ...(n.images ? [{ images: n.images }] : [])); } else far.push([q, n]); }
  // highlights: the names of things the player can act on now, in room and look texts (engine/highlight.js); game.json "highlight": false turns them off
  for (const f of res.fixed) if (f.text) f.text = g.highlight === false ? H.plain(f.text) : H.forFixed(W, w, s, f, aud.length === 1 ? aud[0] : 0, g.L.engine.grammar);
  finish(W.compose(w, s, res, names, prose, aud.length === 1 ? aud[0] : undefined), aud, color?.log.length ? { color: color.log } : undefined);
  for (const [q, n] of far) add(r, 'user', [H.plain(n.text), ...(n.images || []).map(i => `[img:${i}]`)].join('\n\n'), [q], { done: true, kind: 'notice' });
}
/** After a thread's turn: a player outside it learns, without the model, that the other came or went. Together again, the round starts fresh. */
function notices(r, aud, before) {
  const s = r.world, g = games[r.game], w = g.world, names = namesOf(r);
  if (before.some((x, q) => x !== s.loc[q])) Mod.pushPlaced(g, r);   // place-bound panels see who stands where now
  for (const q of BOTH) { const o = 1 - q; if (r.solo || aud.includes(o) || before[q] === s.loc[q]) continue;
    if (s.loc[q] === s.loc[o]) add(r, 'user', fmt(g.L.engine.arrived, { name: names[q] }), [o], { done: true, kind: 'notice' });
    else if (before[q] === s.loc[o]) add(r, 'user', fmt(g.L.engine.left, { name: names[q], room: w.rooms[s.loc[q]].name }), [o], { done: true, kind: 'notice' }); }
  if (!apart(r) && aud.length < 2) r.pending = [false, false];
  status(r);
}
// ---- HTTP
const json = (res, o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
const readBody = req => new Promise(ok => { let s = ''; req.on('data', d => { s += d; if (s.length > 2e6) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { ok({}); } }); });
function file(res, f, cache) { fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('Not found.'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': cache ? 'max-age=3600' : 'no-store' }); res.end(d); }); }
const byToken = t => { for (const r of Object.values(runs)) { const p = r.tokens.indexOf(t); if (p >= 0) return [r, p]; } return []; };
const where = r => { const k = games[r.game].L.ui.markers.place + ': ', m = [...r.messages].reverse().find(x => x.role === 'assistant' && x.text.includes(k)); const h = m && m.text.split(k)[1]; return h ? h.split(/[\n·]/)[0].trim() : null; };
const runInfo = r => { const s = r.stats.slice(-20), i = s.reduce((a, x) => a + (x.in || 0), 0), h = s.reduce((a, x) => a + (x.hit || 0), 0); return { id: r.id, label: r.label, game: r.game, title: games[r.game]?.title, created: r.created, updated: r.updated, where: where(r), solo: r.solo, tokens: r.tokens, players: namesOf(r), playMs: playMs(r), ended: !!r.ended, rounds: r.stats.length, messages: r.messages.length, cache: i ? Math.round(h / i * 100) : null, avgMs: s.length ? Math.round(s.reduce((a, x) => a + x.ms, 0) / s.length) : null, online: pub(r).online, busy: r.busy }; };
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), P = u.pathname, seg = P.split('/').filter(Boolean);
  try {
    if (P === '/') return file(res, path.join(ROOT, 'public/index.html'));
    if (P === '/favicon.ico') return file(res, path.join(ROOT, 'public/favicon.png'), true);
    if (seg[0] === 'p' && seg.length === 2) return file(res, path.join(ROOT, 'public/play.html'));
    if (seg[0] === 'modules' && seg.length === 3 && seg[2] === 'client.js' && Mod.types[seg[1]]) return file(res, path.join(ROOT, 'modules', seg[1], 'client.js'));
    if (seg[0] === 'public') { const f = path.join(ROOT, 'public', path.basename(P)); return file(res, f); }
    // only images and client code may leave a game folder, never GAME.md
    if (seg[0] === 'g' && seg[1] === 'orseg_v2') seg[1] = 'orseg';   // old route of pages still open
    if (seg[0] === 'g' && games[seg[1]]) {
      const rest = seg.slice(2).map(decodeURIComponent);
      if (rest.some(x => x.includes('..'))) { res.writeHead(400); return res.end(); }
      if ((rest[0] === 'images' || rest[0] === 'icons') || (rest.length === 1 && rest[0] === 'theme.css')) return file(res, path.join(GAMES, seg[1], ...rest), true);
      res.writeHead(404); return res.end();
    }
    if (P === '/api/info') { const ifs = Object.values(os.networkInterfaces()).flat().filter(x => x.family === 'IPv4' && !x.internal).map(x => x.address); return json(res, { address: cfg.publicHost || ifs.find(x => /^192\.168\./.test(x)) || ifs[0] || 'localhost', port: cfg.port }); }
    if (P === '/api/settings' && req.method === 'GET') return json(res, { ...Settings.status(), canEdit: isLocal(req) });
    if (P.startsWith('/api/settings') && req.method === 'POST') {
      if (!isLocal(req)) return json(res, { error: L0.engine.errors.settingsLocal }, 403);
      const b = await readBody(req), E = L0.engine.errors;
      if (P === '/api/settings/check') { const k = Settings.key(); if (!k) return json(res, { error: E.noKey }, 400); try { return json(res, await Settings.check(k)); } catch (e) { return json(res, { error: fmt(E.keyCheck, { status: e.status || e.message }) }, 400); } }
      if (b.model !== undefined && !/^[\w.:-]{1,80}$/.test(String(b.model))) return json(res, { error: E.badModel }, 400);
      const apiKeyIn = typeof b.apiKey === 'string' ? b.apiKey.trim() : '';
      // A new key is saved only if DeepSeek accepts it (listing models costs nothing). Tests on recorded answers skip the call.
      if (apiKeyIn && !process.env.DUO_AI_FIXTURE) { try { await Settings.check(apiKeyIn); } catch (e) { return json(res, { error: fmt(E.keyCheck, { status: e.status || e.message }) }, 400); } }
      Settings.save({ apiKey: apiKeyIn, model: b.model, clearKey: !!b.clearKey });
      return json(res, { ...Settings.status(), canEdit: true });
    }
    if (P === '/api/strings') return json(res, { lang: L0.lang, dateLocale: L0.dateLocale, ...L0.ui });
    if (P === '/api/games') return json(res, Object.values(games).map(g => ({ id: g.id, title: g.title, description: g.description, goal: g.goal, contentWarning: g.contentWarning || null, players: g.players, eras: g.eras || null, cover: g.cover ? `/g/${g.id}/${g.cover}` : null })));
    if (P === '/api/runs' && req.method === 'GET') return json(res, Object.values(runs).filter(r => games[r.game]).sort((a, b) => (b.updated || b.created) - (a.updated || a.created)).map(runInfo));
    if (P === '/api/runs' && req.method === 'POST') { const b = await readBody(req); if (!games[b.game]) return json(res, { error: L0.engine.errors.noGame }, 400); const c = checkNames(games[b.game], b.names); if (c.error) return json(res, c, 400); const r = newRun(b.game, b.solo, c.names, b.genders); if (b.remember) try { Settings.saveLastPlayers(c.names, b.genders, b.solo); } catch (e) { console.error('last players not saved:', e.message); } return json(res, runInfo(r)); }
    if (P === '/api/players/last') return json(res, Settings.lastPlayers());
    if (P === '/api/reload' && req.method === 'POST') return json(res, { loaded: loadSaves() });
    if (seg[0] === 'api' && seg[1] === 'runs' && seg[3] === 'branch' && req.method === 'POST') {
      const r = runs[seg[2]]; if (!r) return json(res, { error: L0.engine.errors.noRun }, 404); if (r.busy) return json(res, { error: L0.engine.errors.busy }, 409);
      settle(r); const { clients, timer, queue, busy, clockStart, autoAt, autoPaused, deleted, ...data } = r, copy = JSON.parse(JSON.stringify(data));
      let n = 1; const base = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '-' + r.game; while (runs[`${base}-m${n}`]) n++;
      Object.assign(copy, { id: `${base}-m${n}`, tokens: [token(), token()], label: `${games[r.game].L.engine.copyLabel}${r.label ? ': ' + r.label : ''}`, branchedFrom: r.id, clients: [], queue: [], busy: false, panelOpen: [false, false] });
      if (copy.world) W.upgrade(games[r.game].world, copy.world); runs[copy.id] = copy; saveRun(copy); if (copy.pending.some(Boolean)) armAuto(copy); return json(res, runInfo(copy));
    }
    if (seg[0] === 'api' && seg[1] === 'runs' && seg[2] && req.method === 'DELETE') {
      const r = runs[seg[2]]; if (!r) return json(res, { error: L0.engine.errors.noRun }, 404); r.deleted = true; clearTimeout(r.timer); r.queue = []; for (const c of r.clients) c.res.end(); delete runs[seg[2]];
      const f = path.join(SAVES, r.id + '.json');
      if (u.searchParams.get('hard')) fs.rmSync(f, { force: true }); else { fs.mkdirSync(path.join(SAVES, 'deleted'), { recursive: true }); if (fs.existsSync(f)) fs.renameSync(f, path.join(SAVES, 'deleted', r.id + '.json')); }
      return json(res, { ok: true });
    }
    if (seg[0] === 'api' && seg[1] === 'runs' && seg[3] === 'regen' && req.method === 'POST') {
      const r = runs[seg[2]]; if (!r) return json(res, { error: L0.engine.errors.noRun }, 404);
      enqueue(r, async () => {
        const i = r.messages.map(m => m.role).lastIndexOf('assistant'), l = r.messages[i]; if (!l || l.id === 0 || l.opening) return;
        // The reply's own messages are handled again in its own thread; older replies did not record them, then the messages right before it count.
        const aud = l.to || BOTH, prev = r.messages.slice(0, i).map(m => m.role).lastIndexOf('assistant'), of = new Set(l.of || r.messages.slice(prev + 1, i).filter(m => m.role === 'user' && m.kind !== 'notice').map(m => m.id));
        r.messages.splice(i, 1); sendTo(r, aud, 'remove', { id: l.id }); for (const m of r.messages) if (of.has(m.id)) m.done = false; await generate(r, aud);
      }); return json(res, { ok: true });
    }
    if (seg[0] === 'api' && seg[1] === 'p') {
      const [r, p] = byToken(seg[2]); if (!r) return json(res, { error: L0.engine.errors.badLink }, 404);
      const g = games[r.game], act = seg[3];
      if (act === 'state') return json(res, { player: p, solo: r.solo, switchTo: r.solo && g.eras ? r.tokens[1 - p] : null, strings: { lang: g.L.lang, dateLocale: g.L.dateLocale, ...g.L.ui }, game: { id: g.id, title: g.title, goal: g.goal, help: g.help, players: namesOf(r), eras: g.eras || null, buttons: g.buttons, imageNames: g.imageNames, hasTheme: g.hasTheme, ui: g.ui, panelDone: g.panelDone, panelDoneLabel: g.panelDoneLabel, panelRetryUntil: g.panelRetryUntil, modPanels: Object.keys(g.panels) }, messages: r.messages.filter(m => sees(m, p)), notes: { mine: r.notes[p], shared: r.notes.shared }, ...pub(r) });
      if (act === 'events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' }); res.write(': ok\n\n');
        const c = { res, player: p }; r.clients.push(c); clockFor(r); status(r);
        const ping = setInterval(() => res.write(': ping\n\n'), 25000);
        req.on('close', () => { clearInterval(ping); r.clients = r.clients.filter(x => x !== c); clockFor(r); saveRun(r); if (!r.clients.some(x => x.player === p)) Mod.leaveAll(g, r, p); if (r.panelOpen[p] && !r.clients.some(x => x.player === p)) { r.panelOpen[p] = false; armAuto(r); } status(r); }); return;
      }
      const b = await readBody(req); r.activity[p] = Date.now(); const lag = !r.pending[p] && r.pending[1 - p];
      if (act === 'say') { move(r, p, b.text); return json(res, { ok: true }); }
      if (act === 'look') {
        // "Look around" button (no id) or a click on a highlighted name (id): a varying sentence in the player's name, no interpreter
        const E = g.L.engine, pick = a => a[Math.floor(Math.random() * a.length)];
        if (!b.id) { move(r, p, pick(E.lookAround), { type: 'look_around' }); return json(res, { ok: true }); }
        const id = String(b.id), vis = W.visibleItems(g.world, r.world, p).find(i => i.id === id), inv = W.invOf(g.world, r.world, p).find(i => i.id === id);
        if (!vis && !inv) return json(res, { error: g.world.texts.notHere }, 400);
        const it = vis || g.world.items.find(i => i.id === id), nm = String(inv?.name || it?.name || id).replace(/\s*\(.*\)$/, '');
        // an item's optional "acc" (accusative form without the article) also allows "I look at the …" sentences
        const opts = [...E.lookAt.map(x => fmt(x, { name: nm })), ...(it?.acc ? E.lookAtAcc.map(x => fmt(x, { acc: Grammar.withArticle(it.acc, E.grammar) })) : [])];
        move(r, p, pick(opts), { type: 'look', target: id }); return json(res, { ok: true });
      }
      if (act === 'wait') {
        if (r.solo) return json(res, { error: 'solo' }, 400);
        r.wait = !!b.on; r.waitBy = p;
        // switched off while one player already moved: their message gets its reply now
        if (!r.wait && r.pending.some(Boolean)) roundIfReady(r); else armAuto(r);
        saveRun(r); status(r); return json(res, { ok: true });
      }
      if (act === 'go') { const t = travelOf(r)?.[p].find(x => x.id === b.room); if (!t) return json(res, { error: g.L.engine.errors.noRoute }, 400); move(r, p, `${g.L.engine.goAlone}: ${t.name}.`); return json(res, { ok: true }); }
      if (act === 'message') {
        // Game messages come only from the server's panels; this endpoint is for the game's buttons.
        if (ENGINE_RE.test(String(b.text || '')) && !process.env.DUO_ALLOW_DIRECT) return json(res, { error: 'forbidden' }, 403);
        gameMsg(r, String(b.text || ''), !!b.silent, audOf(r, p)); return json(res, { ok: true });
      }
      if (act === 'mod') {
        const c = g.panels[b.id]; if (!c) return json(res, { error: 'unknown panel' }, 404);
        if (lockedPanels(r).includes(b.id)) return json(res, { error: 'locked' }, 403);
        const o = Mod.act(c, b.id, r, p, b.move || { open: true }), aud = c.sides ? BOTH : audOf(r, p);   // a two-sided panel concerns both players
        for (const m of o.msgs) { const hist = r.messages.map(x => x.text), d = g.hook?.decorate ? g.hook.decorate(m, hist) : m; gameMsg(r, d.text, d.silent, aud); }
        // Once the game has processed the messages, everyone gets the new state, e.g. the panel is solved.
        if (o.msgs.length) enqueue(r, async () => Mod.push(r, b.id));
        // A mid-drag move is sent often and needs no disk write; the release is saved.
        if (!b.move?.live) saveRun(r); return json(res, o.view);
      }
      if (act === 'typing') { send(r, 'typing', { player: p }, p); if (lag) { armAuto(r); status(r); } return json(res, { ok: true }); }
      if (act === 'panel') { r.panelOpen[p] = !!b.open; if (lag) { armAuto(r); status(r); } return json(res, { ok: true }); }
      if (act === 'notes') { if ('mine' in b) r.notes[p] = String(b.mine).slice(0, 50000); if (lag) { armAuto(r); status(r); } if ('shared' in b) { r.notes.shared = String(b.shared).slice(0, 50000); send(r, 'notes', { shared: r.notes.shared }, p); } saveRun(r); return json(res, { ok: true }); }
    }
    res.writeHead(404); res.end('Not found.');
  } catch (e) { console.error(e); json(res, { error: String(e.message || e) }, 500); }
})
;
// Start: with --nsfw fetch the 18+ games first, then load games and saves, then listen.
(NSFW ? Nsfw.sync(GAMES).then(r => { nsfwReady = r.ready; }, e => console.error('[nsfw]', e.message)) : Promise.resolve()).then(() => {
  loadGames(); loadSaves();
  if (!NSFW && HIDDEN.size) console.log(`18+ games not loaded (start with --nsfw): ${[...HIDDEN].join(', ')}`);
  server.listen(+process.env.DUO_PORT || cfg.port, cfg.host, () => { resume(); console.log(`pAIr-lock: http://localhost:${+process.env.DUO_PORT || cfg.port}/  games: ${Object.keys(games).join(', ')}`); });
});
