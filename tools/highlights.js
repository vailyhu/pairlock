// Highlight check for a game's texts, before playing: for every room and item text (every variant) it lists which words would be
// highlighted and which item each points at, so false hits show up early. Output is a SPOILER (texts, hidden things).
// Usage: node tools/highlights.js <game> [--all]   (--all also prints texts without any hit)
// Static view: candidates of a text are the items in the same room (through their parents), plus anything that can be carried
// (it may be in the inventory then). In play only what is visible at that moment counts; hidden things are marked here with "hidden".
const fs = require('fs'), path = require('path'), H = require('../engine/highlight'), Str = require('../engine/strings');
const id = process.argv[2], all = process.argv.includes('--all');
if (!id) { console.error('usage: node tools/highlights.js <game> [--all]'); process.exit(2); }
const dir = path.join(process.env.DUO_GAMES || path.join(__dirname, '..', 'games'), id), w = JSON.parse(fs.readFileSync(path.join(dir, 'world.json'), 'utf8'));
const g = JSON.parse(fs.readFileSync(path.join(dir, 'game.json'), 'utf8'));
const grammar = Str.forLang(g.lang || 'hu').engine.grammar;
if (g.highlight === false) console.log('note: game.json "highlight": false, highlights are off in play.');
const items = new Map(w.items.map(i => [i.id, i]));
const roomOf = (it, d = 0) => { if (!it || d > 20) return []; if (it.kind === 'door') return it.between || []; if (w.rooms[it.location]) return [it.location]; return roomOf(items.get(it.location), d + 1); };
const carriable = w.items.filter(i => i.pickable || i.carry);
const cand = i => ({ id: i.id, terms: [...new Set([i.name, ...(i.aliases || []), ...(i.pickable ? [i.pickable.name] : []), ...(i.carry?.name ? [i.carry.name] : [])].map(x => String(x || '').replace(/\s*\(.*\)$/, '').trim()).filter(Boolean))] });
const candsFor = room => { const here = w.items.filter(i => roomOf(i).includes(room)); return [...here, ...carriable.filter(c => !here.includes(c))].map(cand); };
const mentions = of => w.items.filter(i => i.mention && i.location === of).flatMap(i => Array.isArray(i.mention) ? i.mention.map(v => v.text) : [i.mention]);
const expand = (t, self) => String(t).replace(/\[g:[^|\]]*\|([^|\]]*)\|[^\]]*\]/g, '$1').replace(/\{contents(?:@([\w-]+))?(?::([^}]*))?\}/g, (_, other, pre) => { const l = mentions(other || self); return l.length ? (pre || '') + l.join(', ') : ''; });
const variants = (t, label) => t == null ? [] : typeof t === 'string' ? [[label, t]] : Array.isArray(t) ? t.map((v, n) => [`${label}[${n}]`, v.text]) : Object.entries(t).map(([k, v]) => [`${label}.${k}`, v]);
const why = i => [i.hidden ? 'hidden' : '', i.visibleIf ? 'visibleIf' : '', (i.pickable || i.carry) && !roomOf(i).length ? 'carried' : ''].filter(Boolean).join(', ');
let texts = 0, hits = 0; const named = new Set(), short = new Map();
function show(where, label, text, room, exclude) {
  if (typeof text !== 'string' || !text) return; texts++;
  const r = H.mark(expand(text, where.split(' ')[1]), candsFor(room), { exclude, grammar });
  for (const s of r.skipped) short.set(`${s.id} "${s.term}"`, true);
  if (!r.hits.length && !all) return;
  console.log(`\n${where} ${label}: ${r.text.replace(/\s+/g, ' ').slice(0, 400)}`);
  for (const h of r.hits) { hits++; named.add(h.id); const it = items.get(h.id), x = it ? why(it) : ''; console.log(`   ${h.word} → ${h.id}${h.hand ? ' (hand mark)' : ` (${h.term})`}${x ? ` [${x}]` : ''}`); }
}
for (const [rid, r] of Object.entries(w.rooms)) for (const [label, t] of [...variants(r.text, 'text'), ...variants(r.firstText, 'firstText')]) show(`room ${rid}`, label, t, rid);
for (const it of w.items) { const rooms = roomOf(it), room = rooms[0];
  for (const [label, t] of [...variants(it.text, 'text'), ...(it.when || []).map((v, n) => [`when[${n}]`, v.text])]) if (!it.literal) show(`item ${it.id}`, label, t, room, it.id); }
console.log(`\n${texts} texts, ${hits} highlights.`);
if (short.size) console.log(`Never highlighted automatically (shorter than ${H.MIN} letters): ${[...short.keys()].join(', ')}`);
const never = w.items.filter(i => !named.has(i.id) && !i.hidden && roomOf(i).length);
if (never.length) console.log(`Visible items no room or item text names (players find them only by typing): ${never.map(i => i.id).join(', ')}`);
