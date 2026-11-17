// Airlock: see CLAUDE.md in this folder. Two sides work a pressure sequence; each sees only its own controls and gauges. The order stays on the server.
import type { ServerModule } from '../types.ts';
import type { AirlockOptions, AirlockState, AirlockView, AirlockMove } from './types.ts';

const mine = (side: string | null, of: 'a' | 'b') => side === 'both' || side === of;

/** Controls and gauges as they stand after the first `n` steps. */
function at(o: AirlockOptions, n: number): Pick<AirlockState, 'controls' | 'gauges'> {
  const controls = Object.fromEntries(o.controls.map(c => [c.id, c.start])), gauges = Object.fromEntries(o.gauges.map(g => [g.id, g.start]));
  for (const s of o.steps.slice(0, n)) { controls[s.control] = s.value; Object.assign(gauges, s.gauges || {}); }
  return { controls, gauges };
}

const mod: ServerModule<AirlockOptions, AirlockState, AirlockView, AirlockMove> = {
  init: o => ({ step: 0, ...at(o, 0) }),
  view(o, st, ctx) {
    const side = ctx.side;
    return {
      text: side === 'both' ? `${o.textA}\n\n${o.textB}` : side === 'b' ? o.textB : o.textA,
      controls: o.controls.filter(c => mine(side, c.side)).map(c => ({ id: c.id, label: c.label, values: c.values, value: st.controls[c.id] })),
      gauges: o.gauges.filter(g => mine(side, g.side)).map(g => ({ id: g.id, label: g.label, unit: g.unit, max: g.max, value: st.gauges[g.id] })),
      note: st.note, resetLabel: o.resetLabel, done: st.step >= o.steps.length,
    };
  },
  act(o, st, move, ctx) {
    if (st.step >= o.steps.length) return;
    if ('reset' in move) { Object.assign(st, { step: 0, ...at(o, 0), note: undefined }); ctx.push(); return; }
    const c = o.controls.find(x => x.id === move.set?.control);
    if (!c || !mine(ctx.side, c.side) || !c.values.some(v => v.id === move.set.value) || st.controls[c.id] === move.set.value) return;
    const next = o.steps[st.step];
    if (next.control === c.id && next.value === move.set.value) {
      if (next.if !== undefined && !ctx.test(next.if)) { st.note = next.blockedText || o.wrongText; ctx.push(); return { text: st.note }; }
      st.controls[c.id] = move.set.value; Object.assign(st.gauges, next.gauges || {}); st.step++; st.note = next.text;
      ctx.push();
      if (st.step >= o.steps.length) return { solved: true, text: o.okText || next.text };
      return next.text ? { text: next.text } : undefined;
    }
    const f = (o.faults || []).find(x => x.control === c.id && (x.value === undefined || x.value === move.set.value) && (x.before === undefined || st.step < x.before));
    if (f && f.back !== undefined) Object.assign(st, { step: Math.min(f.back, st.step), ...at(o, Math.min(f.back, st.step)) });
    st.note = f ? f.text : o.wrongText;   // the wrong move itself is not kept: the control springs back
    ctx.push();
    return { text: st.note };
  },
};
export default mod;
