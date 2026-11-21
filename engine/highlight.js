// Highlights: in the engine's fixed room and look texts, the names of things the player can act on now become [[word|id]];
// the player page turns them into buttons that look at the thing. Only what the player sees now (visibleItems) or carries is
// marked, never a hidden or not yet revealed thing. The narrator's free text is never marked.
// Authors may mark by hand in world texts: [[word|id]] (shown as a highlight only while id is visible or carried) or
// [[word|-]] (never highlighted). A hand mark of a thing wins over automatic matching of it in that text.
// Matching: names and aliases with Hungarian endings (colorize.js forms / wordIn, at most six letters of endings);
// names shorter than four letters are never matched automatically. Check a game with: node tools/highlights.js <game>.
const { forms } = require('./colorize');
const MARK = /\[\[([^|\]]+)\|([^\]]*)\]\]/g, MIN = 4;
const plain = t => String(t ?? '').replace(MARK, '$1');
const low = x => String(x || '').toLocaleLowerCase();
const bareName = n => String(n || '').replace(/\s*\(.*\)$/, '').trim();
const tokens = t => [...String(t).matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ s: m.index, e: m.index + m[0].length, w: low(m[0]) }));
/**
 * One word of a name against one word of the text: exact for words before the last, with endings for the last.
 * endings (locales engine.grammar.endings, a RegExp): what may follow the name, so a compound word (a longer word that merely starts with the name) is no hit.
 */
const fits = (n, x, last, endings) => last ? forms(n).some(f => x.startsWith(f) && x.length - f.length <= 6 && (!endings || endings.test(x.slice(f.length)))) : n === x;
const endingsOf = G => G?.endings ? new RegExp(G.endings, 'u') : null;

/** Things player p can act on now: visible items and carried things, with their names and aliases. */
function candidates(W, w, s, p) {
  const vis = W.visibleItems(w, s, p).filter(i => !i.noHighlight).map(i => ({ id: i.id, terms: [i.name, ...(i.aliases || [])] }));
  const inv = W.invOf(w, s, p).filter(x => !vis.some(v => v.id === x.id)).map(x => { const it = w.items.find(i => i.id === x.id); return { id: x.id, terms: [x.name, ...(it?.name ? [it.name] : []), ...(it?.aliases || [])] }; });
  return [...vis, ...inv].map(c => ({ ...c, terms: [...new Set(c.terms.map(bareName).filter(Boolean))] }));
}

/**
 * Marks text for the given candidates. opts: exclude (an id never marked, e.g. the thing being looked at), auto (false: hand marks only),
 * grammar (locales engine.grammar: its endings).
 * Returns {text, hits: [{id, word, term, hand?}], skipped: [{id, term}]} (skipped: names too short to match).
 */
function mark(text, cands, opts = {}) {
  const ok = new Set(cands.map(c => c.id).filter(id => id !== opts.exclude)), hits = [], skipped = [], endings = endingsOf(opts.grammar);
  const segs = []; let last = 0; const hand = new Set();
  const src = String(text ?? '');
  for (const m of src.matchAll(MARK)) {
    segs.push({ t: src.slice(last, m.index) });
    const id = m[2]; if (id !== '-') hand.add(id);
    if (id !== '-' && ok.has(id)) { segs.push({ out: `[[${m[1]}|${id}]]` }); hits.push({ id, word: m[1], term: m[1], hand: true }); } else segs.push({ out: m[1] });
    last = m.index + m[0].length;
  }
  segs.push({ t: src.slice(last) });
  if (opts.auto !== false) {
    // every possible match, longest first, then earliest; one per thing, no overlaps
    const found = [];
    segs.forEach((g, si) => {
      if (g.t === undefined) return;
      // other markup ([img:..], [i:..|..], [panel:..]) is never matched inside
      const blocked = [...g.t.matchAll(/\[[^\]]*\]/g)].map(m => [m.index, m.index + m[0].length]);
      const tk = tokens(g.t).filter(x => !blocked.some(([a, b]) => x.s >= a && x.e <= b));
      for (const c of cands) {
        if (!ok.has(c.id) || hand.has(c.id)) continue;
        for (const term of c.terms) {
          const tw = tokens(term).map(x => x.w); if (!tw.length) continue;
          if (tw.join('').length < MIN) { if (!skipped.some(x => x.id === c.id && x.term === term)) skipped.push({ id: c.id, term }); continue; }
          for (let i = 0; i + tw.length <= tk.length; i++) {
            let good = true;
            for (let j = 0; j < tw.length && good; j++) {
              if (!fits(tw[j], tk[i + j].w, j === tw.length - 1, endings)) good = false;
              else if (j && !/^[\s-]*$/.test(g.t.slice(tk[i + j - 1].e, tk[i + j].s))) good = false;
            }
            if (good) found.push({ si, s: tk[i].s, e: tk[i + tw.length - 1].e, id: c.id, term });
          }
        }
      }
    });
    found.sort((a, b) => (b.e - b.s) - (a.e - a.s) || a.si - b.si || a.s - b.s);
    const take = [], done = new Set();
    for (const f of found) { if (done.has(f.id) || take.some(x => x.si === f.si && x.s < f.e && f.s < x.e)) continue; done.add(f.id); take.push(f); }
    for (const f of take.sort((a, b) => b.si - a.si || b.s - a.s)) {
      const g = segs[f.si], word = g.t.slice(f.s, f.e);
      g.t = g.t.slice(0, f.s) + `\u0000${word}|${f.id}\u0001` + g.t.slice(f.e);
      hits.push({ id: f.id, word, term: f.term });
    }
  }
  const out = segs.map(g => g.out ?? g.t.replace(/\u0000([^\u0001]*)\u0001/g, '[[$1]]')).join('');
  return { text: out, hits, skipped };
}

/**
 * The final text of one fixed piece of a reply (an entry of res.fixed). Room and look texts get automatic highlights;
 * a reworded one (f.orig, the colorizer's) only for the things its original named. Every other text keeps hand marks only.
 */
function forFixed(W, w, s, f, p, grammar) {
  const cands = candidates(W, w, s, f.p ?? p ?? 0);
  if (f.kind !== 'room' && f.kind !== 'look') return mark(f.text, cands, { auto: false }).text;
  let list = cands;
  if (f.orig) { const ids = new Set(mark(f.orig, cands, { exclude: f.ent, grammar }).hits.map(h => h.id)); list = cands.filter(c => ids.has(c.id)); }
  return mark(f.text, list, { exclude: f.ent, grammar }).text;
}
module.exports = { mark, plain, candidates, forFixed, MARK, MIN };
