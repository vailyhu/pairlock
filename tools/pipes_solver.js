// Authoring aid: checks that a pipes grid can be solved. Returns the solved grid, so its output is a spoiler.
const { flow, isClosed } = require('../modules/pipes/server.ts');
const rot = m => ((m << 1) & 15) | (m >> 3);
// Tries the rotations of every connected cell until the network closes; returns the grid, or null if impossible.
function solve(o) {
  const SIDES = [[1, -1, 0, 4], [2, 0, 1, 8], [4, 1, 0, 1], [8, 0, -1, 2]], R = o.grid.length, C = o.grid[0].length, fixed = {};
  const options = m => { const out = []; let x = m; for (let i = 0; i < 4; i++) { if (!out.includes(x)) out.push(x); x = rot(x); } return out; };
  const go = (queue, grid) => {
    if (!queue.length) return isClosed(o, flow(o, grid)) ? grid : null;
    const [[r, c], ...rest] = queue, key = `${r},${c}`; if (fixed[key] !== undefined) return go(rest, grid);
    for (const m of options(o.grid[r][c])) {
      if (r === o.source.row && c === o.source.col && !(m & o.source.side)) continue;
      let fits = true; const next = [];
      for (const [bit, dr, dc, back] of SIDES) {
        const open = !!(m & bit), isEnd = (r === o.source.row && c === o.source.col && bit === o.source.side) || o.exits.some(e => e.row === r && e.col === c && e.side === bit), nr = r + dr, nc = c + dc, n = fixed[`${nr},${nc}`];
        if (isEnd) continue;
        if (nr < 0 || nc < 0 || nr >= R || nc >= C) { if (open) fits = false; continue; }
        if (n !== undefined && !!(n & back) !== open) fits = false;
        if (open && n === undefined) next.push([nr, nc]);
      }
      if (!fits) continue;
      fixed[key] = m; grid[r][c] = m;
      const res = go([...rest, ...next], grid); if (res) return res;
      delete fixed[key]; grid[r][c] = o.grid[r][c];
    }
    return null;
  };
  return go([[o.source.row, o.source.col]], o.grid.map(x => [...x]));
}
module.exports = solve;
