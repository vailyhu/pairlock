// Gear pair: see CLAUDE.md in this folder. Installing publishes the driven axle's period for other panels.
import type { ServerModule } from '../types.ts';
import type { GearsOptions, GearsState, GearsView, GearsMove } from './types.ts';

export const period = (o: GearsOptions, a: number, b: number): number => Math.round(o.base * b / a * 10) / 10;

const mod: ServerModule<GearsOptions, GearsState, GearsView, GearsMove> = {
  init: o => ({ a: o.start[0], b: o.start[1] }),
  view(o, st) {
    const total = st.a + st.b, mesh = total === o.sum;
    return { teeth: o.teeth, a: st.a, b: st.b, sum: o.sum, labelA: o.labelA, labelB: o.labelB, button: o.button, mesh, status: mesh ? o.meshText : total > o.sum ? o.tooBigText : o.tooSmallText };
  },
  act(o, st, move, ctx) {
    if ('axle' in move) {
      if (!o.teeth.includes(move.teeth) || (move.axle !== 'a' && move.axle !== 'b')) return;
      st[move.axle] = move.teeth; ctx.push(); return;
    }
    if (!move.install || st.a + st.b !== o.sum) return;
    const p = period(o, st.a, st.b);
    ctx.vars[o.var] = p;
    return { message: o.message.replace('{a}', String(st.a)).replace('{b}', String(st.b)).replace('{period}', String(p)), close: true, text: o.okText };
  },
};
export default mod;
