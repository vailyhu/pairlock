// Guard round: side b works step by step while a guard walks a round of stations; working while the guard stands at a dangerous one gets caught. See CLAUDE.md in this folder.
import type { ServerCtx, ServerModule } from '../types.ts';
import type { GuardRoundMove, GuardRoundOptions, GuardRoundState, GuardRoundView } from './types.ts';

const stepMs = (o: GuardRoundOptions) => Math.max(20, (o.stepSeconds ?? 6) * 1000);
/** Stations passed in all so far (the guard's position and the clock both come from it). */
const passed = (o: GuardRoundOptions, st: GuardRoundState, now: number) => st.k0 + (st.t0 == null ? 0 : Math.floor((now - st.t0) / stepMs(o)));
const at = (o: GuardRoundOptions, k: number) => o.stations.length ? k % o.stations.length : 0;
const minuteOf = (o: GuardRoundOptions, k: number) => o.clock ? o.clock.startMinute + k * o.clock.minutesPerStation : null;
const hhmm = (m: number | null) => m == null ? null : (x => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`)(((m % 1440) + 1440) % 1440);
const sides = (ctx: ServerCtx) => ({ a: ctx.side === 'a' || ctx.side === 'both', b: ctx.side === 'b' || ctx.side === 'both' });

/** One panel timer: wakes when the guard moves on and pushes fresh views. */
function tick(o: GuardRoundOptions, st: GuardRoundState, ctx: ServerCtx): void {
  if (st.t0 == null) return;
  const ms = stepMs(o), e = Date.now() - st.t0;
  ctx.later(ms - (e % ms) + 5, () => { ctx.push(); tick(o, st, ctx); });
}
function start(o: GuardRoundOptions, st: GuardRoundState, ctx: ServerCtx): void {
  if (st.t0 != null) return;
  st.t0 = Date.now(); tick(o, st, ctx); ctx.push();
}

const mod: ServerModule<GuardRoundOptions, GuardRoundState, GuardRoundView, GuardRoundMove> = {
  init: () => ({ t0: null, k0: 0, done: 0, caught: 0 }),
  view(o, st, ctx) {
    const k = passed(o, st, Date.now()), s = sides(ctx), v: GuardRoundView = { side: ctx.side, running: st.t0 != null, last: st.last };
    if (ctx.side === null) v.awayText = o.awayText;
    if (s.a) v.watch = { text: o.watchText, background: o.background, stations: o.stations.map(x => ({ label: x.label, x: x.x, y: x.y, danger: !!x.danger })), at: at(o, k) };
    if (s.b) { const m = minuteOf(o, k); v.work = { text: o.workText, minute: m, clock: hhmm(m), steps: o.steps, done: st.done }; }
    return v;
  },
  act(o, st, move, ctx) {
    if (!move || ctx.side === null) return;
    if ('watch' in move) { start(o, st, ctx); return; }
    if (!('step' in move) || !sides(ctx).b || move.step !== st.done || st.done >= o.steps.length) return;
    start(o, st, ctx);
    const here = o.stations[at(o, passed(o, st, Date.now()))];
    if (here?.danger) {
      st.done = 0; st.caught = (st.caught || 0) + 1; st.last = o.caughtText; ctx.push();
      return { message: o.caughtMessage || 'GUARD CAUGHT', text: o.caughtText };
    }
    st.done++;
    if (st.done >= o.steps.length) { st.last = undefined; ctx.push(); return { solved: true, text: o.doneText }; }
    st.last = o.stepTexts?.[st.done - 1]; ctx.push();
    return { text: st.last };
  },
  // A player left or the server restarted: the guard stops where he is; an open panel starts him again ({watch}).
  leave(o, st, ctx) {
    if (st.t0 == null) return;
    st.k0 = passed(o, st, Date.now()); st.t0 = null; ctx.clear();
  },
};
export default mod;
