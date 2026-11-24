// Colorizer: rewords the engine's fixed room, look and move texts with one model call per turn, keeping every fact.
// Decisions: engine/colorize.md. Anything the checks do not like, a model error or a timeout leaves the fixed text.
// Off unless game.json "colorize": {"on": true, "kinds": ["room", "look", "move"], "timeoutMs": 4000, "style": "..."}.
// Word lists in the game's language come from locales/<lang>.json engine.colorize; the world may add sensitiveWords and emphasisWords.
const W = require('./world');

const PROMPT = `You reword fixed descriptions in a Hungarian text game, so that looking around or looking at a thing again does not give the same sentence word for word. You never change what is true.
Input JSON: style (the game's voice), audience, usedBefore, blocks [{id, kind, who, said, text, keep, details, nth, move}].
audience "you": one reader, address them in the second person singular (te). audience "names": both players read it, write in the third person with their names.
For every block write a new Hungarian text with exactly the same facts as "text":
- Every item of "keep" appears in your text exactly as written, only with Hungarian endings added (lakkdoboz → lakkdobozon); never split, shorten or paraphrase it. Mention everything the original mentions, in any order. Never rename a thing.
- Parts in „…” stay letter for letter.
- Add no object, person, name, number, year, colour of a clue or place that is not in the text. You may add at most two touches from "details" (light, smell, sound, material), preferring ones not in usedBefore.
- Never make anything sound important, strange, hidden, suspicious or worth a closer look. Never tell the players what to do or what they feel.
- kind "room": the room as the reader sees it now. kind "look": the one thing looked at. kind "move": say exactly who went where as in "move", in the outcome given; put no words or decisions into anyone's mouth.
- "said" are the player's own words: you may echo how they do it ("quickly", "sitting down"), nothing more.
- nth 3 or more: shorter, calmer, it is familiar by now.
- Plain short sentences, about as long as the original, no asterisks, no lists, no quotation of these rules.
Output JSON only: {"blocks":[{"id":1,"text":"..."}]}`;

const low = x => String(x || '').toLowerCase();
/** Hand highlight marks of world texts ([[word|id]], engine/highlight.js) never reach the model: it gets the plain words. */
const plain = t => String(t ?? '').replace(/\[\[([^|\]]+)\|[^\]]*\]\]/g, '$1');
const words = t => low(t).split(/[^0-9a-záéíóöőúüű]+/).filter(Boolean);
/** The forms a word's start may take when Hungarian endings are added: levél → level-, tükör → tükr-, kréta → krétá-. */
const SHORT = { 'á': 'a', 'é': 'e', 'ó': 'o', 'ő': 'ö', 'ú': 'u', 'ű': 'ü', 'í': 'i' }, LONG = { 'a': 'á', 'e': 'é' }, VOWEL = /[aáeéiíoóöőuúüű]/;
function forms(w) {
  const out = [w], n = w.length, last = w[n - 1], prev = w[n - 2];
  if (LONG[last]) out.push(w.slice(0, -1) + LONG[last]);
  if (n >= 4 && SHORT[prev] && !VOWEL.test(last)) out.push(w.slice(0, -2) + SHORT[prev] + last);
  if (n >= 4 && VOWEL.test(prev) && !VOWEL.test(last) && !VOWEL.test(w[n - 3])) out.push(w.slice(0, -2) + last);
  return out;
}
/** One word of a term in a word of the text: the word or one of its forms, plus at most six letters of endings. */
const wordIn = (w, x) => forms(w).some(f => x.startsWith(f) && x.length - f.length <= 6);
/** Every word (of three letters or more) of the term appears in the text, inflected or not. */
function hasTerm(term, text) {
  const ws = words(term).filter(w => w.length >= 3), tw = words(text);
  if (!ws.length) return low(text).includes(low(term));
  return ws.every(w => tw.some(x => wordIn(w, x)));
}
const quotes = t => [...String(t).matchAll(/„([^”]+)”|«([^»]+)»/g)].map(m => m[1] || m[2]);
const numbers = t => (String(t).match(/\d+/g) || []);
const namesOf = e => [e.name, ...(e.aliases || [])].filter(Boolean);

/** What one block may and must say: keep (terms of the original that stay), forbidden (names of things not here). */
function rules(w, s, b, L) {
  const p = b.p ?? 0, vis = W.visibleItems(w, s, p), inv = W.invOf(w, s, p).map(i => i.id), here = new Set([...vis.map(i => i.id), ...inv]);
  const exits = Object.keys(w.rooms[s.loc[p]]?.exits || {}).map(id => w.rooms[id]);
  const bare = r => { const n = String(r?.name || '').replace(/\s*\(.*\)$/, ''); return { name: n.charAt(0).toLowerCase() + n.slice(1), aliases: r?.aliases }; };   // a room name is a common noun in a sentence   // "Kazánház (Ma)": the era is not part of the name in a sentence
  const cands = [...vis, ...w.items.filter(i => inv.includes(i.id)), ...exits.map(bare)];
  if (b.kind === 'room') cands.push(bare(w.rooms[b.room]));
  const keep = [];
  for (const e of cands) { const t = namesOf(e).find(n => hasTerm(n, b.text)); if (t && !keep.includes(t)) keep.push(t); }
  // names of things not here, unless the same word also names something here or belongs to this place's own details
  const own = [...vis, ...w.items.filter(i => inv.includes(i.id))].flatMap(namesOf), det = [...(b.details || []), ...(w.rooms[s.loc[p]]?.details || [])].join(' ');
  const forbidden = w.items.filter(i => !here.has(i.id)).flatMap(namesOf).filter(n => n.length >= 4 && !hasTerm(n, b.text) && !own.some(o => low(o) === low(n)) && !hasTerm(n, det));
  const sensitive = [...(w.sensitiveWords || [])].filter(x => !low(b.text).includes(low(x)));
  const emphasis = [...(L?.emphasis || []), ...(w.emphasisWords || [])].filter(x => !low(b.text).includes(low(x)));
  return { keep, forbidden, sensitive, emphasis };
}
/** Checks one reworded block. Returns null when it passes, else the name of the first failed check. */
function check(b, out, R, L, names) {
  if (typeof out !== 'string' || !out.trim()) return 'empty';
  const len = out.length / Math.max(1, b.text.length); if (len > 1.8 && out.length > b.text.length + 60) return 'too long'; if (len < .5) return 'too short';
  for (const k of R.keep) if (!hasTerm(k, out)) return 'missing: ' + k;
  for (const q of quotes(b.text)) if (!out.includes(q)) return 'quote changed: ' + q;
  const nb = numbers(b.text), no = numbers(out);
  for (const n of no) if (!nb.includes(n)) return 'new number: ' + n;
  for (const n of nb) if (!no.includes(n)) return 'lost number: ' + n;
  const nw = t => words(t).filter(v => (L?.numberWords || []).some(n => n.length <= 4 ? v === n : v.startsWith(n)));
  const wb = nw(b.text), wo = nw(out);
  for (const n of wo) if (!wb.some(x => x.slice(0, 4) === n.slice(0, 4))) return 'new number word: ' + n;
  for (const n of wb) if (!wo.some(x => x.slice(0, 4) === n.slice(0, 4))) return 'lost number word: ' + n;
  for (const f of R.forbidden) if (hasTerm(f, out)) return 'names a thing not here: ' + f;
  for (const x of R.sensitive) if (low(out).includes(low(x))) return 'sensitive word: ' + x;
  for (const x of R.emphasis) if (low(out).includes(low(x))) return 'emphasis: ' + x;
  if (b.audience === 'you' && b.kind !== 'move' && names[b.p] && words(out).some(v => wordIn(low(names[b.p]), v))) return 'third person in own thread';
  if (b.kind === 'move' && b.move) {
    const m = b.move, rooms = [m.to, m.otherTo, m.outcome === 'stays' ? m.from : null].filter(Boolean);
    for (const n of [names[m.p], names[m.q]]) if (n && !hasTerm(n, out)) return 'move: missing name ' + n;
    for (const r of rooms) if (!R.roomNames[r].some(x => hasTerm(x, out))) return 'move: missing room ' + r;
    const bad = m.outcome === 'together' ? L?.alone || [] : L?.together || [];
    for (const x of bad) if (words(out).some(v => v.startsWith(low(x)))) return 'move: wrong outcome (' + x + ')';
  }
  return null;
}
/** Details already used: one long word of the detail shows up in the text. */
const usedIn = (d, text) => { const ws = words(d).filter(x => x.length >= 5); return ws.length > 0 && ws.some(x => hasTerm(x, text)); };

/**
 * One turn: picks the blocks to reword, asks the model, checks the answer.
 * ai(input) → {blocks:[{id,text}]}. Returns {changes: [{i, text}], log: [{kind, fixed, out?, fail?}]}; the caller applies the changes.
 */
async function colorize({ w, s, res, names, aud, cfg = {}, L = {}, ai }) {
  const kinds = cfg.kinds || ['room', 'look', 'move'], timeoutMs = cfg.timeoutMs || 4000;
  s.colorUsed = s.colorUsed || []; s.colorCount = s.colorCount || {};
  const blocks = [], meta = [];
  const pointer = [...(L?.emphasis || []), ...(w.emphasisWords || [])].map(low);
  res.fixed.forEach((f, i) => {
    if (!f.text || !kinds.includes(f.kind)) return;
    const text = plain(f.text);
    if (f.kind !== 'move' && pointer.some(x => low(text).includes(x))) return;   // the author points at something on purpose: the exact words stay
    const p = f.kind === 'move' ? f.move?.p : f.p, key = `${p}:${f.kind}:${f.room || f.ent || ''}`;
    if (f.kind !== 'move') s.colorCount[key] = (s.colorCount[key] || 0) + 1;
    const ent = f.kind === 'look' ? w.items.find(x => x.id === f.ent) : null, room = f.kind === 'room' ? w.rooms[f.room] : null;
    const b = { id: blocks.length + 1, kind: f.kind, text, p, room: f.room, move: f.move, details: (ent || room)?.details || [], audience: aud.length === 1 ? 'you' : 'names' };
    const R = rules(w, s, b, L); R.roomNames = Object.fromEntries(Object.entries(w.rooms).map(([id, r]) => [id, [r.name.replace(/\s*\(.*\)$/, ''), ...(r.aliases || [])]]));
    blocks.push({ id: b.id, kind: f.kind, who: names[p], said: f.said || '', text, keep: R.keep, details: (ent || room)?.details || [], nth: s.colorCount[key] || 1,
                  ...(f.move ? { move: { who: names[f.move.p], other: names[f.move.q], outcome: f.move.outcome, to: w.rooms[f.move.to]?.name, otherTo: f.move.otherTo ? w.rooms[f.move.otherTo]?.name : null, from: w.rooms[f.move.from]?.name } } : {}) });
    meta.push({ i, b, R });
  });
  if (!blocks.length) return { changes: [], log: [] };
  const input = { style: cfg.style || '', audience: aud.length === 1 ? 'you' : 'names', usedBefore: s.colorUsed.slice(-40), blocks };
  let got, fail = null;
  try { got = await Promise.race([ai(input), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), timeoutMs))]); }
  catch (e) { fail = e.message === 'timeout' ? 'timeout' : 'error: ' + String(e.message || e).slice(0, 80); }
  const changes = [], log = [];
  for (const { i, b, R } of meta) {
    const out = got?.blocks?.find(x => x.id === b.id)?.text, why = fail || check(b, out, R, L, names);
    log.push({ kind: b.kind, fixed: b.text, ...(out ? { out } : {}), ...(why ? { fail: why } : {}) });
    if (why) continue;
    changes.push({ i, text: out.trim() });
    const ds = b.kind === 'look' ? w.items.find(x => x.id === res.fixed[i].ent)?.details : b.kind === 'room' ? w.rooms[b.room]?.details : null;
    for (const d of ds || []) if (usedIn(d, out) && !s.colorUsed.includes(d)) s.colorUsed.push(d);
  }
  if (s.colorUsed.length > 200) s.colorUsed = s.colorUsed.slice(-200);
  return { changes, log, ms: got?.ms, usage: got?.usage };
}
module.exports = { colorize, check, rules, hasTerm, forms, wordIn, PROMPT };
