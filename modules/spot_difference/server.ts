// Spot the difference: two images side by side, a click on a difference marks it. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { SpotDifferenceMove, SpotDifferenceOptions, SpotDifferenceState, SpotDifferenceView } from './types.ts';

const mod: ServerModule<SpotDifferenceOptions, SpotDifferenceState, SpotDifferenceView, SpotDifferenceMove> = {
  init() { return { found: [] }; },
  view(o, st) {
    return { left: o.left, right: o.right, leftLabel: o.leftLabel, rightLabel: o.rightLabel, found: st.found.map(i => o.areas[i]).filter(Boolean), total: o.areas.length };
  },
  act(o, st, move, ctx) {
    const { x, y } = move;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const hit = o.areas.findIndex((a, i) => !st.found.includes(i) && x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h);
    if (hit < 0) return o.missIsBad ? { bad: true, text: o.missText } : { text: o.missText };
    st.found.push(hit);
    if (st.found.length >= o.areas.length) return { solved: true, text: o.okText };
    ctx.push();
    return { text: o.foundText };
  },
};
export default mod;
