// Typewriter ribbon: read the last typed text off a used ribbon, window by window, mirrored and with old strikes mixed in. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { RibbonGlyph, TypewriterRibbonMove, TypewriterRibbonOptions, TypewriterRibbonState, TypewriterRibbonView } from './types.ts';
import { norm } from '../../engine/codes.js';

/** Deterministic noise per panel, so a window looks the same every time it is drawn. */
const rnd = (seed: string) => { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; };
const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVZÁÉÍÓÖŐÚÜŰ';
const len = (o: TypewriterRibbonOptions) => Math.max(6, o.lineLength || 22);
const pages = (o: TypewriterRibbonOptions) => Math.max(1, Math.ceil(o.text.length / len(o)));

/** The strikes of one window. On the ribbon they run backwards and mirrored; "mirror" turns them the right way. */
function glyphs(o: TypewriterRibbonOptions, id: string, page: number, mirror: boolean): RibbonGlyph[] {
  const n = len(o), part = [...o.text.slice(page * n, page * n + n)], R = rnd(`${id}:${page}`), out: RibbonGlyph[] = [];
  part.forEach((c, i) => {
    const drift = Math.sin((page * n + i) / 5) * .12;   // the lines slide into each other along the ribbon
    if (c !== ' ') out.push({ c, x: (i + .5) / n, y: .5 + drift + (R() - .5) * .08, r: (R() - .5) * 10, a: .75 + R() * .25 });
  });
  const extra = Math.round(part.length * Math.min(1, Math.max(0, o.noise ?? .3)));
  for (let k = 0; k < extra; k++) out.push({ c: LETTERS[Math.floor(R() * LETTERS.length)], x: R(), y: .2 + R() * .6, r: (R() - .5) * 16, a: .18 + R() * .17 });
  out.sort((a, b) => a.x - b.x || a.a - b.a);   // strength and order do not give the old strikes away by position in the list
  return mirror ? out : out.map(g => ({ ...g, x: 1 - g.x }));
}

const mod: ServerModule<TypewriterRibbonOptions, TypewriterRibbonState, TypewriterRibbonView, TypewriterRibbonMove> = {
  init: () => ({ pos: 0, mirror: false }),
  view(o, st, ctx) {
    const p = Math.min(Math.max(0, st.pos || 0), pages(o) - 1);
    const v: TypewriterRibbonView = { glyphs: glyphs(o, ctx.id, p, !!st.mirror), mirror: !!st.mirror, page: p + 1, pages: pages(o), image: o.image,
      answerLabel: o.answerLabel, answerButton: o.answerButton, mirrorLabel: o.mirrorLabel, backLabel: o.backLabel, nextLabel: o.nextLabel, help: o.help };
    if (st.solved) v.plain = o.text;
    return v;
  },
  act(o, st, move, ctx) {
    if ('scroll' in move) { st.pos = Math.min(Math.max(0, (st.pos || 0) + Math.sign(Number(move.scroll) || 0)), pages(o) - 1); ctx.push(); return; }
    if ('mirror' in move) { st.mirror = !!move.mirror; ctx.push(); return; }
    if ('answer' in move) {
      if (st.solved) return;
      const g = norm(move.answer), a = norm(o.answer);
      if (a && g.includes(a) && g.length <= a.length + 40) { st.solved = true; st.mirror = true; return { solved: true, text: o.okText }; }
      return { bad: true, text: o.badText };
    }
  },
};
export default mod;
