// Locomotive: a turn-based, two-handed reasoning finale. Each track segment is set once on the levers and then run; a wrong setting tells its consequence and the segment can be tried again. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { LocomotiveMove, LocomotiveOptions, LocomotiveState, LocomotiveView } from './types.ts';

const all = (o: LocomotiveOptions) => [...o.controls.a.map(c => ({ ...c, side: 'a' as const })), ...o.controls.b.map(c => ({ ...c, side: 'b' as const }))];
const fit = (o: LocomotiveOptions, st: LocomotiveState) => {
  st.set = st.set || {}; st.ready = st.ready || { a: false, b: false }; st.seg = st.seg || 0;
  for (const c of all(o)) if (!c.values.some(([v]) => v === st.set[c.id])) st.set[c.id] = c.initial;
  if (typeof st.speed !== 'number') st.speed = o.gauges?.speedStart ?? 0;
};
const mine = (side: string | null, s: 'a' | 'b') => side === 'both' || side === s;

const mod: ServerModule<LocomotiveOptions, LocomotiveState, LocomotiveView, LocomotiveMove> = {
  init(o) { const st = { seg: 0, set: {}, ready: { a: false, b: false }, speed: o.gauges?.speedStart ?? 0 } as LocomotiveState; fit(o, st); return st; },
  view(o, st, ctx) {
    fit(o, st);
    const n = o.segments.length, seg = Math.min(st.seg, n - 1);
    return {
      controls: all(o).map(c => ({ id: c.id, label: c.label, values: c.values, value: st.set[c.id], mine: mine(ctx.side, c.side) })),
      segment: st.done ? n : st.seg + 1, segments: n, km: o.segments[seg].km, speed: st.speed,
      ready: { ...st.ready }, mySide: (ctx.side || 'both') as 'a' | 'b' | 'both', last: st.last, done: !!st.done,
      texts: { ready: o.texts.ready, go: o.texts.go, segment: o.texts.segment, waiting: o.texts.waiting, stopped: o.texts.stopped, partner: o.texts.partner, speed: o.texts.speed },
    };
  },
  act(o, st, move, ctx) {
    fit(o, st);
    if (st.done || !ctx.side) return;
    if ('set' in move) {
      const c = all(o).find(x => x.id === move.set?.control);
      if (!c || !mine(ctx.side, c.side) || !c.values.some(([v]) => v === move.set.value)) return;
      st.set[c.id] = move.set.value; st.ready = { a: false, b: false }; st.last = undefined; ctx.push(); return;   // a changed lever needs both to confirm again
    }
    if ('ready' in move) {
      if (ctx.side === 'both') st.ready = { a: !!move.ready, b: !!move.ready }; else st.ready[ctx.side] = !!move.ready;
      ctx.push(); return;
    }
    if ('go' in move) {
      if (!(ctx.solo || ctx.side === 'both') && !(st.ready.a && st.ready.b)) return { text: o.texts.waiting };
      const seg = o.segments[st.seg], ok = Object.entries(seg.right).every(([k, v]) => v === 'any' || st.set[k] === v);
      st.ready = { a: false, b: false };
      if (ok) {
        const text = o.texts.segmentOk[st.seg] || '';
        st.speed = o.gauges?.speedOk?.[st.seg] ?? st.speed; st.seg++; st.last = { ok: true, text };
        if (st.seg >= o.segments.length) { st.done = true; ctx.push(); return { solved: true, text: text || o.texts.stopped }; }
        ctx.push(); return { text };
      }
      const f = o.faults.find(x => Object.entries(x.if).every(([k, vals]) => vals.includes(k === 'track' ? seg.track : st.set[k])));
      const text = f?.text || o.texts.bad || '';
      st.speed = o.gauges?.speedBad ?? st.speed; st.last = { ok: false, text };
      ctx.push(); return { text };   // no "bad": a wrong run is part of the reasoning, not a penalty
    }
  },
};
export default mod;
