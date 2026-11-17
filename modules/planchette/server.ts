// Planchette: two players guide one pointer over a spirit board, one horizontally, one vertically, and spell words together. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { PlanchetteAfterToken, PlanchetteCell, PlanchetteMove, PlanchetteOptions, PlanchetteState, PlanchetteView } from './types.ts';

/** Upper case, accents dropped, only letters and digits: what counts when comparing a word with what was written. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const step = (o: PlanchetteOptions) => o.step ?? .02;
const msPer = (o: PlanchetteOptions) => o.msPerLetter ?? 900;

/** The cell under the pointer: the nearest one whose radius covers it. */
function cellAt(o: PlanchetteOptions, x: number, y: number): PlanchetteCell | null {
  const k = 1 / (o.aspect ?? 1); let best: PlanchetteCell | null = null, bestD = Infinity;
  for (const c of o.cells) { const d = Math.hypot(x - c.x, (y - c.y) * k); if (d <= c.r && d < bestD) { best = c; bestD = d; } }
  return best;
}
/** The closing word(s) as one cell per letter (a letter without a cell keeps the pointer where it is). */
function afterTokens(o: PlanchetteOptions): PlanchetteAfterToken[] {
  const words = o.afterWords == null ? [] : Array.isArray(o.afterWords) ? o.afterWords : [o.afterWords], out: PlanchetteAfterToken[] = [];
  words.forEach((w, i) => {
    if (i) out.push({ ch: ' ' });
    for (const ch of w) {
      if (!ch.trim()) { out.push({ ch: ' ' }); continue; }
      const c = o.cells.find(c => c.label.toUpperCase() === ch.toUpperCase()) || o.cells.find(c => fold(c.label) === fold(ch) && fold(ch));
      out.push(c ? { ch, x: c.x, y: c.y } : { ch });
    }
  });
  return out;
}
const afterMs = (o: PlanchetteOptions) => afterTokens(o).length * msPer(o);

const mod: ServerModule<PlanchetteOptions, PlanchetteState, PlanchetteView, PlanchetteMove> = {
  init: () => ({ x: .5, y: .5, ready: { a: false, b: false }, word: 0, cur: [], done: [] }),
  view(o, st, ctx) {
    const side = ctx.side === 'a' || ctx.side === 'b' ? ctx.side : 'both';
    const v: PlanchetteView = { board: o.board, x: st.x, y: st.y, axis: side === 'a' ? 'x' : side === 'b' ? 'y' : 'both', step: step(o), ready: { ...st.ready }, me: side,
      done: [...st.done], cur: st.cur.join(''), texts: o.texts };
    if (st.after) v.after = { tokens: afterTokens(o), elapsed: Date.now() - st.after, msPerLetter: msPer(o) };
    return v;
  },
  act(o, st, move, ctx) {
    if (st.after) return;
    const side = ctx.side === 'a' || ctx.side === 'b' ? ctx.side : ctx.solo ? 'both' : null;
    if (!side) return;
    const lim = (v: unknown) => Math.max(-.5, Math.min(.5, Number(v) || 0));
    if ('dx' in move) { if (side === 'b') return; st.x = clamp01(st.x + lim(move.dx)); ctx.push(); return; }
    if ('dy' in move) { if (side === 'a') return; st.y = clamp01(st.y + lim(move.dy)); ctx.push(); return; }
    if ('clear' in move) { st.cur = []; st.ready = { a: false, b: false }; ctx.push(); return; }
    if (!('ready' in move) || !move.ready) return;
    if (side === 'both') st.ready = { a: true, b: true }; else st.ready[side] = true;
    if (!st.ready.a || !st.ready.b) { ctx.push(); return; }
    st.ready = { a: false, b: false };
    const cell = cellAt(o, st.x, st.y), target = fold(o.words[st.word] || '');
    if (!cell || !target) { ctx.push(); return; }
    const next = fold(st.cur.join('') + cell.label);
    if (!next || !target.startsWith(next)) { st.cur = []; ctx.push(); return { text: o.wrongText }; }
    st.cur.push(cell.label);
    if (next !== target) { ctx.push(); return; }
    const okText = Array.isArray(o.wordOkText) ? o.wordOkText[st.word] : o.wordOkText;
    st.done.push(st.cur.join('')); st.cur = []; st.word++;
    if (st.word >= o.words.length) { st.after = Date.now(); return { solved: true, text: okText }; }
    ctx.push(); return okText ? { text: okText } : undefined;
  },
  // After the last word the window stays open while the pointer spells the closing word, then a little longer.
  keep: (o, st) => !!st.after && Date.now() < st.after + afterMs(o) + 2500,
};
export default mod;
