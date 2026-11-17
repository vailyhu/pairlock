// Camera guide: one player sees a mark on a camera picture, the other taps the spot on their own picture of the place. See CLAUDE.md in this folder.
import type { ServerCtx, ServerModule } from '../types.ts';
import type { CameraGuideMove, CameraGuideOptions, CameraGuideState, CameraGuideView, Dir, Rect } from './types.ts';

/** [left, top, right, bottom] from either rectangle form; null when malformed (then nothing hits). */
function box(t: Rect): [number, number, number, number] | null {
  const b = Array.isArray(t) ? t : t && typeof t === 'object' ? [t.x, t.y, t.x + t.w, t.y + t.h] : null;
  return b && b.length === 4 && b.every(Number.isFinite) ? [Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])] : null;
}
/** Two players and the partner is not at the other place: side b waits, side a has nobody to guide. */
const waiting = (ctx: ServerCtx) => !ctx.solo && (ctx.side === 'a' || ctx.side === 'b') && ctx.otherSide !== (ctx.side === 'a' ? 'b' : 'a');
const flash = (o: CameraGuideOptions) => o.flashMs ?? 2500;

function feedback(o: CameraGuideOptions, st: CameraGuideState): string | undefined {
  const d = o.dirTexts, l = st.last;
  if (!d || !l || l.hit || !l.dirs.length) return undefined;
  const dir = l.dirs.map(k => d[k]).join(d.join ?? ', '), dist = l.dist ? d[l.dist] ?? '' : '';
  return d.line.replace('{dir}', dir).replace('{dist}', dist);
}

const mod: ServerModule<CameraGuideOptions, CameraGuideState, CameraGuideView, CameraGuideMove> = {
  init: () => ({ n: 0 }),
  view(o, st, ctx) {
    const side = ctx.side, seeA = side === 'a' || side === 'both', seeB = side === 'b' || side === 'both', l = st.last, onA = o.showOnA !== false;
    if (side === null) return { side, awayText: o.awayText, flashMs: flash(o), canTap: false };
    const wait = waiting(ctx);
    return {
      side, flashMs: flash(o), canTap: seeB && !wait,
      imageA: seeA ? o.imageA : undefined, marker: seeA ? o.marker : undefined, labelA: seeA ? o.labelA : undefined, hintLine: seeA ? o.hintLine : undefined,
      imageB: seeB ? o.imageB : undefined, labelB: seeB ? o.labelB : undefined,
      feedback: seeA ? feedback(o, st) : undefined,
      poke: l && (seeB || onA) ? { n: st.n, x: l.x, y: l.y, hit: l.hit, age: Math.max(0, Date.now() - l.t), onA } : undefined,
      waiting: wait ? o.waitText : undefined,
    };
  },
  act(o, st, move, ctx) {
    if (ctx.side !== 'b' && ctx.side !== 'both') return;
    if (waiting(ctx)) return o.waitText ? { text: o.waitText } : undefined;
    const x = Number(move?.x), y = Number(move?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) return;
    const b = box(o.target), hit = !!b && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
    const dirs: Dir[] = [];
    let dist: 'near' | 'mid' | 'far' | null = null;
    if (b && !hit) {
      if (x < b[0]) dirs.push('left'); else if (x > b[2]) dirs.push('right');
      if (y < b[1]) dirs.push('up'); else if (y > b[3]) dirs.push('down');
      const d = Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3]));
      dist = d < 0.08 ? 'near' : d < 0.2 ? 'mid' : 'far';
    }
    st.n = (st.n || 0) + 1; st.last = { x, y, t: Date.now(), hit, dirs, dist };
    ctx.push();
    if (hit) return { solved: true, text: o.okText };
    return o.missIsBad ? { bad: true, text: o.missText } : { text: o.missText };
  },
};
export default mod;
