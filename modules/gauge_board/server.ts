// Gauge board: see CLAUDE.md in this folder. One player sets controls, the other reads gauges. The weights stay on the server.
import type { ServerModule } from '../types.ts';
import type { GaugeBoardOptions, GaugeBoardState, GaugeBoardView, GaugeBoardMove } from './types.ts';

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function gauges(o: GaugeBoardOptions, st: GaugeBoardState): number[] {
  return o.matrix.map(row => clamp(st.controls.reduce((sum, v, i) => sum + row[i] * v, row[st.controls.length]), 0, o.gaugeMax));
}
const ready = (o: GaugeBoardOptions, st: GaugeBoardState) => gauges(o, st).every(g => g >= o.band[0] && g <= o.band[1]);

const mod: ServerModule<GaugeBoardOptions, GaugeBoardState, GaugeBoardView, GaugeBoardMove> = {
  init: o => ({ controls: o.controls.map(() => 0) }),
  view(o, st, ctx) {
    const canControl = ctx.side === 'a' || ctx.side === 'both', canRead = ctx.side === 'b' || ctx.side === 'both';
    return {
      canControl, canRead,
      ...(canControl ? { labels: o.controls, controls: st.controls, controlMax: o.controlMax, textA: o.textA } : {}),
      ...(canRead ? { gauges: gauges(o, st), band: o.band, gaugeMax: o.gaugeMax, textB: o.textB, confirmLabel: o.confirmLabel, ready: ready(o, st) } : {}),
    };
  },
  act(o, st, move, ctx) {
    if ('control' in move) {
      if ((ctx.side !== 'a' && ctx.side !== 'both') || !(move.control in st.controls) || Math.abs(move.delta) !== 1) return;
      st.controls[move.control] = clamp(st.controls[move.control] + move.delta, 0, o.controlMax);
      ctx.push();
      return;
    }
    if ((ctx.side === 'b' || ctx.side === 'both') && ready(o, st)) return { solved: true, text: o.okText };
  },
};
export default mod;
