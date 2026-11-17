// Scratch reveal: scrape a paint layer off to uncover the picture under it. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { ScratchRevealMove, ScratchRevealOptions, ScratchRevealState, ScratchRevealView } from './types.ts';

const size = (o: ScratchRevealOptions) => ({ cols: o.cols ?? 64, rows: o.rows ?? 48, brush: o.brush ?? 0.04 });
const share = (mask: string) => mask.length ? mask.split('').filter(c => c === '1').length / mask.length : 0;

/** Marks every cell whose centre lies within the brush of a point. Cells are taken as square (cols:rows like the image), so the brush is round in pixels. */
export function scrape(o: ScratchRevealOptions, mask: string, points: [number, number][]): string {
  const { cols, rows, brush } = size(o), cells = mask.split('');
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const c0 = Math.max(0, Math.floor((x - brush) * cols)), c1 = Math.min(cols - 1, Math.ceil((x + brush) * cols));
    const ry = brush * cols / rows;   // the brush radius in shares of the image height
    const r0 = Math.max(0, Math.floor((y - ry) * rows)), r1 = Math.min(rows - 1, Math.ceil((y + ry) * rows));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const dx = (c + .5) / cols - x, dy = ((r + .5) / rows - y) * rows / cols;
      if (dx * dx + dy * dy <= brush * brush) cells[r * cols + c] = '1';
    }
  }
  return cells.join('');
}

const mod: ServerModule<ScratchRevealOptions, ScratchRevealState, ScratchRevealView, ScratchRevealMove> = {
  init(o) { const { cols, rows } = size(o); return { mask: '0'.repeat(cols * rows) }; },
  view(o, st) {
    const { cols, rows, brush } = size(o);
    return { top: o.top, bottom: o.bottom, brush, cols, rows, mask: st.mask, done: share(st.mask), help: o.help };
  },
  act(o, st, move, ctx) {
    if (!Array.isArray(move.points)) return;
    st.mask = scrape(o, st.mask, move.points.slice(0, 400));
    if (!move.live && share(st.mask) >= (o.need ?? 0.7)) return { solved: true, text: o.okText };
    ctx.push();
  },
};
export default mod;
