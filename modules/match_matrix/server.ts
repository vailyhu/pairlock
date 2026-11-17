// Match matrix: a picture logic grid with ✓ / ✗ marks, shared live. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { MatchMatrixMove, MatchMatrixOptions, MatchMatrixState, MatchMatrixView, MatchReward } from './types.ts';

const groupOf = (o: MatchMatrixOptions, col: string) => o.groups.findIndex(g => g.cols.some(c => c.id === col));
/** Right when, in every group, the only ✓ of the row is the answer's column. */
const rowRight = (o: MatchMatrixOptions, st: MatchMatrixState, row: string) => o.groups.every((g, gi) => {
  const yes = g.cols.filter(c => st.cells[row]?.[c.id] === 'y').map(c => c.id);
  return yes.length === 1 && yes[0] === o.answer[row]?.[gi];
});
const reward = (r: string | MatchReward | undefined): MatchReward | null => (r === undefined ? null : typeof r === 'string' ? { text: r } : r);

const mod: ServerModule<MatchMatrixOptions, MatchMatrixState, MatchMatrixView, MatchMatrixMove> = {
  init: () => ({ cells: {}, done: [] }),
  // after solving the table stays open, so the last row's reward (e.g. a code) can still be read; the frame takes no more moves
  keep: o => !!o.rowReward && Object.keys(o.rowReward).length > 0,
  view(o, st, ctx) {
    const rewards: Record<string, MatchReward> = {};
    for (const r of st.done || []) { const x = reward(o.rowReward?.[r]); if (x) rewards[r] = x; }
    return { rows: o.rows, groups: o.groups, cells: st.cells || {}, rewards, checkLabel: o.checkLabel, ...(ctx.solo ? {} : { note: o.sharedNote }) };
  },
  act(o, st, move, ctx) {
    st.cells = st.cells || {}; st.done = st.done || [];
    if ('check' in move) {
      const right = o.rows.filter(r => rowRight(o, st, r.id)).map(r => r.id), fresh = right.filter(r => !st.done.includes(r));
      st.done.push(...fresh);
      const messages = fresh.map(r => (o.rowMessage || 'MATRIX {row} ok').replace('{row}', r));
      if (fresh.length) ctx.push();
      if (right.length === o.rows.length) return { solved: true, text: o.okText, messages };
      return { bad: true, text: o.countText ? o.countText.replace('{n}', String(right.length)) : o.badText, messages };
    }
    const { row, col } = move, gi = groupOf(o, col);
    if (!o.rows.some(r => r.id === row) || gi < 0) return;
    const cells = st.cells[row] = st.cells[row] || {}, now = cells[col], next = !now ? 'y' : now === 'y' ? 'n' : undefined;
    if (next) cells[col] = next; else delete cells[col];
    // one ✓ per row and group: a new ✓ turns the earlier one into ✗ (a convenience, it tells nothing)
    if (next === 'y') for (const c of o.groups[gi].cols) if (c.id !== col && cells[c.id] === 'y') cells[c.id] = 'n';
    ctx.push();
  },
};
export default mod;
