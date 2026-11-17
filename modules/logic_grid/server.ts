// Logic grid: a shared assignment table (row × aspects). See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { LogicGridMove, LogicGridOptions, LogicGridState, LogicGridView } from './types.ts';

const empty = (o: LogicGridOptions): Record<string, string[]> => Object.fromEntries(o.rows.map(r => [r, o.columns.map(() => '')]));

/** A row is right cell by cell, or, when unordered (options.unordered or the row in unorderedRows), as a set of values in any order. */
const unordered = (o: LogicGridOptions, r: string) => !!o.unordered || !!o.unorderedRows?.includes(r);
const sorted = (a: string[]) => [...a].sort().join('\u0000');
const rowRight = (o: LogicGridOptions, r: string, cells: string[]) => { const want = o.answer[r] || []; return unordered(o, r) ? cells.every(Boolean) && sorted(cells) === sorted(want) : o.columns.every((_, c) => cells[c] === want[c]); };

const mod: ServerModule<LogicGridOptions, LogicGridState, LogicGridView, LogicGridMove> = {
  init(o) { return { cells: empty(o) }; },
  view(o, st, ctx) {
    return { rowLabel: o.rowLabel, rows: o.rows, columns: o.columns, cells: { ...empty(o), ...st.cells }, checkLabel: o.checkLabel, emptyLabel: o.emptyLabel, ...(ctx.solo ? {} : { note: o.sharedNote }) };
  },
  act(o, st, move, ctx) {
    st.cells = { ...empty(o), ...st.cells };
    if ('check' in move) {
      const right = o.rows.filter(r => rowRight(o, r, st.cells[r])).length;
      if (right === o.rows.length) return { solved: true, text: o.okText };
      return { bad: true, text: o.countText ? o.countText.replace('{n}', String(right)) : o.badText };
    }
    const { row, col, value } = move;
    if (!o.rows.includes(row) || !Number.isInteger(col) || !o.columns[col] || (value !== '' && !o.columns[col].values.includes(value))) return;
    st.cells[row][col] = value;
    ctx.push();
  },
};
export default mod;
