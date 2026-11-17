// @ts-check
// Pipe network UI: draws the cells the server sends and reports clicks. Flow and win are decided on the server.
/** @typedef {import('./types.ts').PipesView} View */
/** @typedef {import('./types.ts').PipesMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.pipes = (box, first, ctx) => {
  const NS = 'http://www.w3.org/2000/svg', MAX_CELL = 66, rows = first.grid.length, cols = first.grid[0].length;
  const legend = document.createElement('p'), wrap = document.createElement('div'), status = document.createElement('p');
  legend.className = 'mod-info'; legend.textContent = first.legend ?? ''; wrap.className = 'mod-pipes'; status.className = 'mod-info'; status.setAttribute('aria-live', 'polite');
  box.append(legend, wrap, status);
  if (first.note) { const n = document.createElement('p'); n.className = 'mod-info'; n.textContent = first.note; box.append(n); }
  const cell = Math.min(MAX_CELL, Math.floor(Math.max(240, box.clientWidth - 16) / cols)), half = cell / 2;
  wrap.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
  /** @type {SVGSVGElement[][]} */ const svgs = [];
  for (let r = 0; r < rows; r++) {
    svgs.push([]);
    for (let c = 0; c < cols; c++) {
      const s = /** @type {SVGSVGElement} */ (document.createElementNS(NS, 'svg')); s.setAttribute('width', String(cell)); s.setAttribute('height', String(cell)); s.setAttribute('role', 'button'); s.setAttribute('aria-label', `${r + 1}. sor, ${c + 1}. oszlop`);
      s.addEventListener('click', () => ctx.act({ row: r, col: c })); svgs[r].push(s); wrap.append(s);
    }
  }
  /** @param {SVGElement} parent @param {number} m @param {string} color @param {number} width */
  function arms(parent, m, color, width) {
    const g = document.createElementNS(NS, 'g'); g.setAttribute('stroke', color); g.setAttribute('stroke-width', String(width)); g.setAttribute('stroke-linecap', 'round');
    /** @type {[number, number, number][]} */ const sides = [[1, half, 0], [2, cell, half], [4, half, cell], [8, 0, half]];
    for (const [bit, x, y] of sides) if (m & bit) { const l = document.createElementNS(NS, 'line'); l.setAttribute('x1', String(half)); l.setAttribute('y1', String(half)); l.setAttribute('x2', String(x)); l.setAttribute('y2', String(y)); g.append(l); }
    parent.append(g);
  }
  /** @param {View} v */
  function update(v) {
    const wet = new Set(v.wet);
    v.grid.forEach((row, r) => row.forEach((m, c) => {
      const s = svgs[r][c], color = wet.has(`${r},${c}`) ? (v.leak ? '#d9663c' : '#f0c040') : '#8a6a3c'; s.replaceChildren();
      arms(s, m, '#000', cell * .27); arms(s, m, color, cell * .18);
      const hub = document.createElementNS(NS, 'circle'); hub.setAttribute('cx', String(half)); hub.setAttribute('cy', String(half)); hub.setAttribute('r', String(cell * .14)); hub.setAttribute('fill', color); hub.setAttribute('stroke', '#000'); hub.setAttribute('stroke-width', '2'); s.append(hub);
      for (const mark of v.marks) if (mark.row === r && mark.col === c) { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', '3'); t.setAttribute('y', '13'); t.setAttribute('font-size', '11'); t.setAttribute('fill', mark.color); t.textContent = mark.label; s.append(t); }
    }));
    status.textContent = v.status; status.classList.toggle('mod-warn', v.leak);
  }
  update(first);
  return { update };
};
