// Shutter drum lamp: see CLAUDE.md in this folder. One player holds the crank, the other sets the shutters and lights the lamp.
import type { ServerCtx, ServerModule } from '../types.ts';
import type { ShutterLampOptions, ShutterLampState, ShutterLampView, ShutterLampMove } from './types.ts';

/** Groups of neighbouring open shutters in one turn, starting after a closed one. null = always lit. */
export function runs(s: boolean[]): number[] | null {
  const n = s.length; if (!s.some(Boolean)) return [];
  const start = s.findIndex((v, i) => v && !s[(i + n - 1) % n]); if (start < 0) return null;
  const out: number[] = []; let cur = 0;
  for (let i = 0; i < n; i++) { if (s[(start + i) % n]) cur++; else if (cur) { out.push(cur); cur = 0; } }
  if (cur) out.push(cur);
  return out;
}
function describe(o: ShutterLampOptions, s: boolean[]): string {
  const r = runs(s), open = String(s.filter(Boolean).length);
  if (r === null) return o.patterns.steady.replace('{open}', open);
  if (!r.length) return o.patterns.none;
  return r.length === 1 ? o.patterns.single.replace('{n}', String(r[0])) : o.patterns.uneven.replace('{runs}', r.join('+'));
}
const periodOf = (o: ShutterLampOptions, ctx: ServerCtx): number => { const p = ctx.vars[o.periodVar]; return typeof p === 'number' ? p : o.startPeriod; };
const canHold = (ctx: ServerCtx) => ctx.side === 'a' || ctx.side === 'both';
const canSet = (ctx: ServerCtx) => ctx.side === 'b' || ctx.side === 'both';

const mod: ServerModule<ShutterLampOptions, ShutterLampState, ShutterLampView, ShutterLampMove> = {
  init: o => ({ shutters: o.start.slice(), crank: false, tries: 0 }),
  view(o, st, ctx) {
    const v: ShutterLampView = { canHold: canHold(ctx), canSet: canSet(ctx), crank: st.crank };
    if (v.canHold) Object.assign(v, { textA: o.textA, holdLabel: o.holdLabel });
    if (v.canSet) {
      const period = periodOf(o, ctx), ready = ctx.solo || st.crank;
      Object.assign(v, { textB: o.textB, centerLabel: o.centerLabel, shutters: st.shutters, period, button: o.button, ready,
        look: o.lookText.replace('{pattern}', describe(o, st.shutters)).replace('{period}', String(period)), gate: ready ? o.readyText : o.waitText });
    }
    return v;
  },
  act(o, st, move, ctx) {
    if ('hold' in move) {
      if (!canHold(ctx)) return;
      st.crank = !!move.hold; ctx.push(); return;
    }
    if (!canSet(ctx)) return;
    if ('toggle' in move) {
      const i = move.toggle; if (!Number.isInteger(i) || i < 0 || i >= st.shutters.length) return;
      st.shutters[i] = !st.shutters[i]; ctx.push(); return;
    }
    if (!move.fire || !(ctx.solo || st.crank)) return;
    const period = periodOf(o, ctx), r = runs(st.shutters);
    const good = !!r && r.join() === o.goal.runs.join() && period === o.goal.period;
    const code = good ? o.codes.good : st.tries ? o.codes.bad : o.codes.firstBad;
    st.tries++; st.crank = false;
    const message = o.message.replace('{code}', code).replace('{shutters}', st.shutters.map(v => v ? '●' : '○').join('')).replace('{pattern}', describe(o, st.shutters)).replace('{period}', String(period));
    // A right setting or a second wrong one ends the panel; after the first wrong one it can be fixed.
    return good || code === o.codes.bad ? { solved: true, message } : { message, close: true };
  },
  leave(_o, st, ctx) { if (st.crank && canHold(ctx)) { st.crank = false; } },
};
export default mod;
