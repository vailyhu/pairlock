// Pipe network: see CLAUDE.md in this folder. Clicking turns a cell a quarter; the server follows the fluid and decides when the network is closed.
import type { ServerModule } from '../types.ts';
import type { Cell, PipesFlow, PipesMove, PipesOptions, PipesState, PipesView } from './types.ts';

const NORTH = 1, EAST = 2, SOUTH = 4, WEST = 8;
/** Open side, row step, column step, and the side the neighbour must have open. */
const STEPS = [[NORTH, -1, 0, SOUTH], [EAST, 0, 1, WEST], [SOUTH, 1, 0, NORTH], [WEST, 0, -1, EAST]] as const;

const rotate = (m: Cell): Cell => ((m << 1) & 15) | (m >> 3);

export function flow(o: PipesOptions, grid: Cell[][]): PipesFlow {
  const { source } = o, start = `${source.row},${source.col}`;
  if (!(grid[source.row][source.col] & source.side)) return { wet: [], leak: false, reached: 0 };
  const seen = new Set([start]), queue: [number, number][] = [[source.row, source.col]], out = new Set<string>();
  let leak = false;
  while (queue.length) {
    const [r, c] = queue.pop() as [number, number];
    for (const [side, dr, dc, back] of STEPS) {
      if (!(grid[r][c] & side)) continue;
      if (r === source.row && c === source.col && side === source.side) continue;
      if (o.exits.some(e => e.row === r && e.col === c && e.side === side)) { out.add(`${r},${c},${side}`); continue; }
      const nr = r + dr, nc = c + dc;
      if (!(grid[nr]?.[nc] !== undefined && grid[nr][nc] & back)) { leak = true; continue; }
      const key = `${nr},${nc}`;
      if (!seen.has(key)) { seen.add(key); queue.push([nr, nc]); }
    }
  }
  return { wet: [...seen], leak, reached: out.size };
}

export const isClosed = (o: PipesOptions, f: PipesFlow) => !f.leak && f.reached === o.exits.length;

const mod: ServerModule<PipesOptions, PipesState, PipesView, PipesMove> = {
  init: o => ({ grid: o.grid.map(row => [...row]) }),
  view(o, st, ctx) {
    const f = flow(o, st.grid);
    return { ...f, grid: st.grid, marks: o.marks ?? [], legend: o.legend, status: f.leak ? o.leakText : o.progressText.replace('{reached}', String(f.reached)).replace('{total}', String(o.exits.length)), ...(ctx.solo ? {} : { note: o.sharedNote }) };
  },
  act(o, st, move, ctx) {
    if (st.grid[move.row]?.[move.col] === undefined) return;
    st.grid[move.row][move.col] = rotate(st.grid[move.row][move.col]);
    if (isClosed(o, flow(o, st.grid))) return { solved: true, text: o.okText };
    ctx.push();
  },
};
export default mod;
