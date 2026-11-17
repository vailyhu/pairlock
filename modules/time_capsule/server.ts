// Time capsule: one side picks a container and a hiding place; every pair is accepted, the world reads the message. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { TimeCapsuleMove, TimeCapsuleOptions, TimeCapsuleState, TimeCapsuleView } from './types.ts';

const fill = (t: string, c: Record<string, string>, p: Record<string, string>) => t.replace(/\{container\}/g, c.v).replace(/\{place\}/g, p.v);

const mod: ServerModule<TimeCapsuleOptions, TimeCapsuleState, TimeCapsuleView, TimeCapsuleMove> = {
  init: () => ({}),
  view(o, _st, ctx) {
    const canChoose = ctx.side === 'a' || ctx.side === 'both';
    if (!canChoose) return { canChoose, text: o.textB || '' };
    return { canChoose, text: o.textA, containers: o.containers, places: o.places, containerLabel: o.containerLabel, placeLabel: o.placeLabel, button: o.button };
  },
  act(o, _st, move, ctx) {
    if (ctx.side !== 'a' && ctx.side !== 'both') return;
    const c = o.containers.find(x => x.id === move?.container), p = o.places.find(x => x.id === move?.place);
    if (!c || !p) return;
    const text = o.doneText ? fill(o.doneText, { v: c.label }, { v: p.label }) : undefined;
    return { solved: true, text, message: fill(o.message || 'CAPSULE {container} {place}', { v: c.id }, { v: p.id }) };
  },
};
export default mod;
