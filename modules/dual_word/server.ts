// Dual word: a two-key lock; each side types a word, accepted only if both are right and arrive close together. See CLAUDE.md in this folder.
import type { ServerCtx, ServerModule } from '../types.ts';
import type { DualWordMove, DualWordOptions, DualWordState, DualWordView, DualEntry } from './types.ts';
import { check } from '../../engine/codes.js';

type Side = 'a' | 'b';
const win = (o: DualWordOptions) => o.windowMs ?? 5000;
const matches = (o: DualWordOptions, id: string, word: string, side: Side): Side[] => (o.anyOrder ? (['a', 'b'] as Side[]) : [side]).filter(k => !!o.answers && check({ answer: o.answers[k] }, id, word));
const fresh = (o: DualWordOptions, e: DualEntry | undefined, now: number): e is DualEntry => !!e && now - e.t <= win(o);
/** Both right: side a's word is one answer and side b's word the other. */
const pairRight = (a: DualEntry, b: DualEntry) => (a.m.includes('a') && b.m.includes('b')) || (a.m.includes('b') && b.m.includes('a'));

const isPress = (o: DualWordOptions) => o.mode === 'press';
/** Press mode alone: one person holds both keys (two buttons), whatever side the frame gives. */
const sideOf = (o: DualWordOptions, ctx: ServerCtx) => isPress(o) && ctx.solo && ctx.side !== null ? 'both' : ctx.side;
const mayPress = (o: DualWordOptions, ctx: ServerCtx, k: Side) => !o.requires?.[k] || ctx.test(o.requires[k]);

/** Press mode: each side turns its key; two turns within the window open unless blockedIf holds. */
function press(o: DualWordOptions, st: DualWordState, k: Side, ctx: ServerCtx) {
  if (!mayPress(o, ctx, k)) return { text: o.noKeyText };
  const now = Date.now(), other: Side = k === 'a' ? 'b' : 'a', prev = st.entry[other];
  if (fresh(o, prev, now)) {
    st.entry = {}; ctx.clear();
    if (o.blockedIf && ctx.test(o.blockedIf)) { st.last = o.blockedText; ctx.push(); return { text: o.blockedText }; }
    st.last = undefined; ctx.push(); return { solved: true, text: o.okText };
  }
  const late = !!prev, mine: DualEntry = { t: now, m: [k] }; st.entry = { [k]: mine }; st.last = late ? o.missText : undefined;
  // nobody followed in time: the key springs back, both see it
  ctx.later(win(o) + 50, () => { if (st.entry[k] === mine) { st.entry = {}; st.last = o.missText; ctx.push(); } });
  ctx.push();
  return { text: late ? o.missText : o.waitText };
}

const mod: ServerModule<DualWordOptions, DualWordState, DualWordView, DualWordMove> = {
  init: () => ({ entry: {} }),
  view(o, st, ctx) {
    const now = Date.now(), side = sideOf(o, ctx), e = st.entry || {}, other: Side | null = side === 'a' ? 'b' : side === 'b' ? 'a' : null;
    const keys: Side[] = side === 'a' || side === 'b' ? [side] : side === 'both' ? ['a', 'b'] : [], both = side === 'both' && isPress(o);
    return {
      side, mode: isPress(o) ? 'press' : 'word',
      ...(isPress(o) ? { canPress: Object.fromEntries(keys.map(k => [k, mayPress(o, ctx, k)])), pressLabel: o.pressLabel, noKeyText: o.noKeyText } : {}),
      // alone in press mode the two lamps are key a and key b
      mine: both ? fresh(o, e.a, now) : side === 'a' || side === 'b' ? fresh(o, e[side], now) : false, otherTyped: both ? fresh(o, e.b, now) : other ? fresh(o, e[other], now) : false,
      status: st.last, windowMs: win(o), placeholder: o.placeholder, sendLabel: o.sendLabel, otherTypedText: o.otherTypedText, waitText: o.waitText,
      awayText: side === null ? o.awayText : undefined, soloLabels: side === 'both' ? o.soloLabels : undefined,
    };
  },
  act(o, st, move, ctx) {
    st.entry = st.entry || {}; const now = Date.now();
    if (isPress(o)) {
      if (!move || !('press' in move)) return;
      const side = sideOf(o, ctx), k = side === 'both' ? move.press : side;
      if ((k !== 'a' && k !== 'b') || (side !== 'both' && move.press !== true && move.press !== side)) return;
      return press(o, st, k, ctx);
    }
    if (!o.answers) return;
    if ('words' in move) {   // alone: one person types both at once
      if (ctx.side !== 'both' || typeof move.words?.a !== 'string' || typeof move.words?.b !== 'string') return;
      const a = { t: now, m: matches(o, ctx.id, move.words.a, 'a') }, b = { t: now, m: matches(o, ctx.id, move.words.b, 'b') };
      if (pairRight(a, b)) return { solved: true, text: o.okText };
      return { bad: true, text: o.wrongText };
    }
    const side = ctx.side; if (side !== 'a' && side !== 'b') return;
    if (!('word' in move)) return;
    const word = String(move.word ?? '').trim(); if (!word) return;
    const other: Side = side === 'a' ? 'b' : 'a', mine: DualEntry = { t: now, m: matches(o, ctx.id, word, side) }, prev = st.entry[other];
    if (fresh(o, prev, now)) {
      st.entry = {};
      const a = side === 'a' ? mine : prev, b = side === 'b' ? mine : prev;
      if (pairRight(a, b)) { st.last = undefined; ctx.clear(); ctx.push(); return { solved: true, text: o.okText }; }
      st.last = o.wrongText; ctx.clear(); ctx.push(); return { bad: true, text: o.wrongText };
    }
    const late = !!prev; st.entry = { [side]: mine }; st.last = late ? o.lateText : undefined;
    // the waiting word expires; the partner's "has typed" mark goes out with it
    ctx.later(win(o) + 50, () => { if (st.entry[side] === mine) { st.entry = {}; ctx.push(); } });
    ctx.push();
    return { text: late ? o.lateText : o.waitText };
  },
  leave(o, st) { st.entry = {}; },
};
export default mod;
