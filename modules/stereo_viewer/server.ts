// Stereo viewer: slide the right half of a cut stereo card over the left one until they line up. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { StereoViewerMove, StereoViewerOptions, StereoViewerState, StereoViewerView } from './types.ts';

const range = (o: StereoViewerOptions) => o.range ?? .1;
const clamp = (v: unknown, r: number) => Math.min(r, Math.max(-r, Number(v) || 0));

const mod: ServerModule<StereoViewerOptions, StereoViewerState, StereoViewerView, StereoViewerMove> = {
  init: () => ({ dx: 0, dy: 0 }),
  view: (o, st) => ({ left: o.left, right: o.right, dx: st.dx || 0, dy: st.dy || 0, range: range(o), solved: !!st.solved, help: o.help, xLabel: o.xLabel, yLabel: o.yLabel }),
  act(o, st, move, ctx) {
    if (st.solved) return;
    st.dx = clamp(move.dx, range(o)); st.dy = clamp(move.dy, range(o));
    const tol = o.tolerance ?? .01;
    if (Math.abs(st.dx - o.target.dx) <= tol && Math.abs(st.dy - o.target.dy) <= tol) {
      st.dx = o.target.dx; st.dy = o.target.dy; st.solved = true;   // snap into place
      return { solved: true, text: o.okText };
    }
    ctx.push();
  },
};
export default mod;
