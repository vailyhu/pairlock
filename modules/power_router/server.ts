// Power router: see CLAUDE.md in this folder. On reserve power only `capacity` consumers can be on; each switch is reported to the world as a message.
import type { ServerModule } from '../types.ts';
import type { PowerRouterOptions, PowerRouterState, PowerRouterView, PowerRouterMove } from './types.ts';

const fill = (t: string, v: Record<string, unknown>) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
const used = (o: PowerRouterOptions, st: PowerRouterState) => o.consumers.filter(c => !c.fixed && st.on[c.id]).length;
const isFull = (o: PowerRouterOptions, ctx: { test(c: unknown): boolean }) => o.fullIf !== undefined && ctx.test(o.fullIf);

const mod: ServerModule<PowerRouterOptions, PowerRouterState, PowerRouterView, PowerRouterMove> = {
  init: o => ({ on: Object.fromEntries(o.consumers.map(c => [c.id, !!(c.fixed || c.start)])) }),
  view(o, st, ctx) {
    const full = isFull(o, ctx);
    return {
      text: o.text, full, onLabel: o.onLabel, offLabel: o.offLabel, fixedLabel: o.fixedLabel,
      consumers: o.consumers.map(c => ({ id: c.id, label: c.label, on: full || !!c.fixed || !!st.on[c.id], fixed: !!c.fixed })),
      status: full ? o.fullPowerText : fill(o.usageText, { used: used(o, st), capacity: o.capacity }),
    };
  },
  act(o, st, move, ctx) {
    const c = o.consumers.find(x => x.id === move.toggle);
    if (!c || c.fixed || isFull(o, ctx)) return;
    if (st.on[c.id]) {
      if (c.room && ctx.test({ player: 'any', at: c.room })) return { text: fill(o.occupiedText, { label: c.label }) };
      st.on[c.id] = false;
    } else {
      if (used(o, st) >= o.capacity) return { text: fill(o.fullText, { capacity: o.capacity }) };
      st.on[c.id] = true;
    }
    ctx.push();
    return { message: fill(o.message || 'POWER {id} {state}', { id: c.id, state: st.on[c.id] ? 'on' : 'off' }), silent: true };
  },
};
export default mod;
