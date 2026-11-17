// Minigame framework. The shared contract is described in modules/CLAUDE.md. All decisions are made here and in each module's server.js; the configuration (panels.json) never reaches the browser.
const fs = require('fs'), path = require('path'), W = require('./world'), DIR = path.join(__dirname, '..', 'modules'), types = {};
for (const d of fs.readdirSync(DIR)) { const f = path.join(DIR, d, 'server.ts'); if (fs.existsSync(f)) { const m = require(f); types[d] = m.default || m; } }
const timers = new WeakMap(); let pushOut = () => {};
const setPush = f => { pushOut = f; };
function load(gameDir) {
  const f = path.join(gameDir, 'panels.json'); if (!fs.existsSync(f)) return {};
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [id, c] of Object.entries(p)) { if (!types[c.type]) throw new Error(`${id}: unknown module: ${c.type}`); if (!c.title) throw new Error(`${id}: missing title`); }
  return p;
}
/** Saved per panel: frame holds the framework's data (sides, tube), state belongs to the module. */
const slot = (cfg, id, r) => { r.mods = r.mods || {}; return r.mods[id] = r.mods[id] || { frame: {}, state: types[cfg.type].init?.(cfg.options) ?? {} }; };
const clear = (r, id) => { const t = timers.get(r); if (t?.[id]) { clearTimeout(t[id]); delete t[id]; } };
/** Sides chosen by where the player stands (`sides: {a: {at: room}, b: {at: room}}`): no picker, also alone. */
const atOf = s => s && typeof s === 'object' && typeof s.at === 'string' ? s.at : null;   // a plain string side is only a label (and strings have .at())
const atSides = cfg => !!(cfg.sides && (atOf(cfg.sides.a) || atOf(cfg.sides.b)));
const sideAt = (cfg, r, player) => { const here = r.world?.loc?.[player]; return here ? (['a', 'b'].find(s => atOf(cfg.sides[s]) === here) || null) : null; };
/** What the side picker shows: a side is a label, or an object with an optional label (and at, or module-specific keys). */
const sideLabels = s => s && { a: typeof s.a === 'string' ? s.a : s.a?.label || '', b: typeof s.b === 'string' ? s.b : s.b?.label || '' };
/** Context given to a module. The later() timer is not saved, so leave() must close any live state. */
function ctxOf(cfg, r, id, player) {
  const { frame } = slot(cfg, id, r);
  return { id, player, solo: r.solo, vars: r.modVars = r.modVars || {}, test: c => !!r.world && W.test(c, r.world), side: cfg.sidesByPlayer ? (player === 0 ? 'a' : 'b') : atSides(cfg) ? sideAt(cfg, r, player) : r.solo ? 'both' : frame.sides?.[player] || null, otherSide: cfg.sidesByPlayer ? (player === 0 ? 'b' : 'a') : atSides(cfg) ? sideAt(cfg, r, 1 - player) : frame.sides?.[1 - player] || null, push: () => pushOut(r, id), clear: () => clear(r, id), later(ms, fn) { clear(r, id); const t = timers.get(r) || {}; timers.set(r, t); t[id] = setTimeout(() => { delete t[id]; if (r.deleted) return; fn(); }, ms); } };
}
const hintsUsed = (r, title) => r.messages.filter(m => m.text.includes(`(GAME: HINT, ${title})`)).length;
/** Finished: solved through the game, or a module result with solved:true and its own message. */
const isDone = (cfg, id, r) => !!r.world?.solved?.[cfg.title] || !!r.mods?.[id]?.frame.done;
/** A panels.json "closed" entry whose world condition holds: the panel shows only this text and takes no moves. */
const closedText = (cfg, r) => { if (!r.world || !cfg.closed) return null; if (!Array.isArray(cfg.closed)) return W.test(cfg.closed, r.world) ? cfg.closedText || '…' : null; return cfg.closed.find(x => W.test(x.if, r.world))?.text || null; };
/** The panel stays open after solving: always (keepAfterSolved), or while the module still has something to show (its keep()). */
const keeps = (cfg, state) => !!cfg.keepAfterSolved || !!types[cfg.type].keep?.(cfg.options, state);
/** View for the client: may only contain what this player is allowed to see. */
function view(cfg, id, r, player, extra = 0) {
  const { frame, state } = slot(cfg, id, r), ctx = ctxOf(cfg, r, id, player), all = cfg.hints || [], used = Math.min(hintsUsed(r, cfg.title) + extra, all.length), at = atSides(cfg), wait = cfg.sides && !r.solo && !ctx.side && !at, closed = closedText(cfg, r), done = isDone(cfg, id, r), keep = done && keeps(cfg, state);
  return { id, type: cfg.type, title: cfg.title, intro: cfg.intro, solved: done, doneText: done ? frame.doneText || null : null, closed, hints: all.slice(0, used), hintsLeft: all.length - used, hintCost: cfg.hintCost, sides: (!r.solo || cfg.sidesByPlayer || at) && sideLabels(cfg.sides) || null, fixedSide: !!cfg.sidesByPlayer || at, talk: done && !!cfg.talkAfterSolved, keep, side: ctx.side, otherSide: ctx.otherSide, tube: cfg.sides && (!r.solo || cfg.sidesByPlayer) ? (frame.lines || []).slice(-30).map(l => [l.p === player ? 'me' : 'partner', l.t]) : null, view: wait || closed || (done && !keep) ? null : types[cfg.type].view(cfg.options, state, ctx) };
}
/** One move. Returns the acting player's view and the messages to send to the game. */
function act(cfg, id, r, player, move) {
  const { frame, state } = slot(cfg, id, r), msgs = [], ctx = ctxOf(cfg, r, id, player), T = types[cfg.type];
  // talkAfterSolved: the speaking tube stays open after solving (the radio between the two eras)
  if (cfg.talkAfterSolved && cfg.sides && typeof move?.line === 'string' && !closedText(cfg, r)) { const t = move.line.trim().slice(0, 300); if (t) (frame.lines = frame.lines || []).push({ p: player, t }); pushOut(r, id); return { view: view(cfg, id, r, player), msgs }; }
  if (isDone(cfg, id, r) || closedText(cfg, r)) return { view: view(cfg, id, r, player), msgs };
  if (move?.open) return { view: view(cfg, id, r, player), msgs };
  if (move?.hint) { const more = hintsUsed(r, cfg.title) < (cfg.hints || []).length; if (more) msgs.push({ text: `(GAME: HINT, ${cfg.title})`, silent: true }); return { view: view(cfg, id, r, player, more ? 1 : 0), msgs }; }
  if (cfg.sides && !cfg.sidesByPlayer && !atSides(cfg) && 'side' in (move || {})) { T.leave?.(cfg.options, state, ctx); frame.sides = frame.sides || {}; if (['a', 'b'].includes(move.side)) frame.sides[player] = move.side; else delete frame.sides[player]; pushOut(r, id); return { view: view(cfg, id, r, player), msgs }; }
  if (cfg.sides && typeof move?.line === 'string') { const t = move.line.trim().slice(0, 300); if (t) (frame.lines = frame.lines || []).push({ p: player, t }); pushOut(r, id); return { view: view(cfg, id, r, player), msgs }; }
  const o = T.act(cfg.options, state, move || {}, ctx) || {};
  // A module's own message replaces the default one, e.g. a result that the world or the narrator reads.
  for (const m of o.messages || []) msgs.push({ text: `(GAME: ${m})`, silent: true });
  if (o.solved) { clear(r, id); frame.done = true; if (o.text) frame.doneText = o.text; msgs.push({ text: `(GAME: ${o.message || `SOLVED, ${cfg.title}`})`, silent: false }); }
  else if (o.bad) msgs.push({ text: `(GAME: ${o.message || `WRONG, ${cfg.title}`})`, silent: true });
  else if (o.message) msgs.push({ text: `(GAME: ${o.message})`, silent: !!o.silent });
  return { view: { ...view(cfg, id, r, player), solved: !!o.solved, justSolved: !!o.solved, close: !!o.close, wrong: !!o.bad, text: o.text }, msgs };
}
/** The player left or the server restarted: live state (such as a held lever) must not get stuck. */
function leaveAll(g, r, player) { for (const [id, c] of Object.entries(g.panels || {})) if (types[c.type].leave && r.mods?.[id]) { types[c.type].leave(c.options, r.mods[id].state, ctxOf(c, r, id, player)); pushOut(r, id); } }
/** Someone changed rooms: fresh views of every panel whose sides follow the place (who stands where may change what it shows). */
function pushPlaced(g, r) { for (const [id, c] of Object.entries(g.panels || {})) if (atSides(c) && r.mods?.[id]) pushOut(r, id); }
module.exports = { load, view, act, leaveAll, pushPlaced, setPush, push: (r, id) => pushOut(r, id), types };
