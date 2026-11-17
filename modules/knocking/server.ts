// Knocking: two players in two places each hear their own series of knocks through the wall. See CLAUDE.md in this folder.
import type { ServerCtx, ServerModule } from '../types.ts';
import type { KnockingChannel, KnockingMove, KnockingOptions, KnockingState, KnockingView, KnockSide } from './types.ts';

interface Knock { t: number; pair: number; group: 0 | 1 }
const times = (o: KnockingOptions) => ({ k: o.knockMs ?? 700, g: o.groupPauseMs ?? 1600, p: o.pairPauseMs ?? 3200 });

/** Every knock of a side with its time from the start. */
function schedule(o: KnockingOptions, side: KnockSide): Knock[] {
  const { k, g, p } = times(o), out: Knock[] = []; let t = 0;
  (o.sequences[side] || []).forEach(([row, col], pair) => {
    if (pair) t += p - k;
    for (let i = 0; i < row; i++) { out.push({ t, pair, group: 0 }); t += k; }
    t += g - k;
    for (let i = 0; i < col; i++) { out.push({ t, pair, group: 1 }); t += k; }
  });
  return out;
}
/** Playback ends one knock length after the last knock. */
const endOf = (o: KnockingOptions, side: KnockSide) => { const s = schedule(o, side); return s.length ? s[s.length - 1].t + times(o).k : 0; };

function channel(o: KnockingOptions, st: KnockingState, side: KnockSide, now: number): KnockingChannel {
  const start = st.play[side];
  if (start == null) return { side, playing: false, heard: [], current: null, knocks: 0 };
  const e = now - start, seq = o.sequences[side] || [], past = schedule(o, side).filter(x => x.t <= e), heard: [number, number][] = [];
  let current: [number, number] | null = null;
  seq.forEach((pair, i) => {
    const n = past.filter(x => x.pair === i), a = n.filter(x => x.group === 0).length, b = n.length - a;
    if (a === pair[0] && b === pair[1]) heard.push([pair[0], pair[1]]); else if (n.length) current = [a, b];
  });
  return { side, playing: e < endOf(o, side), heard, current, knocks: past.length };
}
const sidesOf = (ctx: ServerCtx): KnockSide[] => ctx.side === 'a' || ctx.side === 'b' ? [ctx.side] : ctx.side === 'both' ? ['a', 'b'] : [];

/** One panel timer for both sides: wakes at the next knock of any playing side and pushes fresh views. */
function tick(o: KnockingOptions, st: KnockingState, ctx: ServerCtx): void {
  const now = Date.now(); let next = Infinity;
  for (const s of ['a', 'b'] as KnockSide[]) {
    const start = st.play[s]; if (start == null) continue;
    const e = now - start, end = endOf(o, s);
    for (const x of schedule(o, s)) if (x.t > e) { next = Math.min(next, x.t - e); break; }
    if (e < end) next = Math.min(next, end - e);
  }
  ctx.push();
  if (next < Infinity) ctx.later(Math.max(20, next + 5), () => tick(o, st, ctx));
}

const mod: ServerModule<KnockingOptions, KnockingState, KnockingView, KnockingMove> = {
  init: () => ({ play: { a: null, b: null } }),
  view(o, st, ctx) {
    const now = Date.now();
    return { texts: o.texts, knockMs: times(o).k, channels: sidesOf(ctx).map(s => channel(o, st, s, now)) };
  },
  act(o, st, move, ctx) {
    if (!move || !('listen' in move) || !move.listen) return;
    const sides = sidesOf(ctx); if (!sides.length) return { text: o.texts.silence };
    for (const s of sides) st.play[s] = Date.now();
    tick(o, st, ctx);
  },
  // The player left or the server restarted: a playback still running stops (a finished one stays listed).
  leave(o, st, ctx) {
    for (const s of sidesOf(ctx)) if (st.play[s] != null && Date.now() - (st.play[s] as number) < endOf(o, s)) st.play[s] = null;
    if (st.play.a == null && st.play.b == null) ctx.clear();
  },
};
export default mod;
