// Sequence: put pictures on numbered slots; optionally two-sided, with the partner reading numbered sketches. See CLAUDE.md in this folder.
import type { ServerModule, ServerCtx } from '../types.ts';
import type { SequenceMove, SequenceOptions, SequenceState, SequenceView } from './types.ts';

/** Items offered now: the ones whose condition holds, plus any already on a slot. */
const offered = (o: SequenceOptions, st: SequenceState, ctx: ServerCtx) => o.items.filter(it => st.placed.includes(it.id) || it.if === undefined || ctx.test(it.if));
const fit = (o: SequenceOptions, st: SequenceState) => { const p = (st.placed || []).slice(0, o.slots.length); while (p.length < o.slots.length) p.push(null); st.placed = p; };
/** Same mixed order for every view of one panel, without revealing the slot order. */
const mixed = <T>(list: T[], key: (t: T) => string) => [...list].sort((a, b) => hash(key(a)) - hash(key(b)));
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

const mod: ServerModule<SequenceOptions, SequenceState, SequenceView, SequenceMove> = {
  init(o) { return { placed: o.slots.map(() => null) }; },
  view(o, st, ctx) {
    fit(o, st);
    const canArrange = ctx.side !== 'b', canSketch = !!o.sketchText && (ctx.side === 'b' || ctx.side === 'both');
    const v: SequenceView = { canArrange };
    if (canArrange) {
      const items = offered(o, st, ctx).map(it => ({ id: it.id, image: it.image, label: it.label }));
      Object.assign(v, { slots: o.slots, placed: st.placed, items, tray: mixed(items.filter(it => !st.placed.includes(it.id)), it => it.id), checkLabel: o.checkLabel, trayLabel: o.trayLabel, arrangeText: ctx.side === 'a' ? o.arrangeText : undefined });
    }
    if (canSketch) v.sketches = mixed(o.items.filter(it => it.sketch), it => it.id + 'sketch').map(it => ({ image: it.sketch as string, number: o.answer.indexOf(it.id) + 1 }));
    if (canSketch) v.sketchText = o.sketchText;
    return v;
  },
  act(o, st, move, ctx) {
    fit(o, st);
    if (ctx.side === 'b') return;
    if ('check' in move) {
      if (o.answer.every((id, i) => st.placed[i] === id)) return { solved: true, text: o.okText };
      return { bad: true, text: o.badText };
    }
    const { item, slot } = move;
    if (!offered(o, st, ctx).some(it => it.id === item)) return;
    if (slot !== null && (!Number.isInteger(slot) || slot < 0 || slot >= o.slots.length)) return;
    const from = st.placed.indexOf(item);
    if (from >= 0) st.placed[from] = null;
    if (slot !== null) {
      const other = st.placed[slot];
      if (other && from >= 0) st.placed[from] = other;   // dropped on a taken slot: swap
      st.placed[slot] = item;
    }
    ctx.push();
  },
};
export default mod;
