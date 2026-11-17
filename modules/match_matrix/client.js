// @ts-check
// Match matrix UI: picture headings, cells cycling empty → ✓ → ✗, shared live; the check happens on the server.
/** @typedef {import('./types.ts').MatchMatrixView} View */
/** @typedef {import('./types.ts').MatchMatrixMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.match_matrix = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const src = (/** @type {string} */ p) => ctx.img?.(p) ?? p;
  /** Large picture or whole text over the panel; a tap closes it. @param {string} [image] @param {string} [text] @param {string} [label] */
  function zoom(image, text, label) {
    const o = mk('div', 'mm-zoom'); o.onclick = () => o.remove();
    if (image) { const i = /** @type {HTMLImageElement} */ (mk('img')); i.src = src(image); i.alt = label || ''; o.append(i); }
    if (label) o.append(mk('b', '', label));
    if (text) o.append(mk('p', '', text));
    box.append(o);
  }
  /** A heading: small picture and/or label, clamped text; tap for large. @param {{label: string, image?: string, text?: string}} x */
  function head(x) {
    const d = mk('button', 'mm-head'); /** @type {HTMLButtonElement} */ (d).type = 'button';
    if (x.image) { const i = /** @type {HTMLImageElement} */ (mk('img')); i.src = src(x.image); i.alt = x.label; i.loading = 'lazy'; d.append(i); }
    if (x.label) d.append(mk('span', 'mm-label', x.label));
    if (x.text) d.append(mk('span', 'mm-text', x.text));
    if (x.image || x.text) d.onclick = () => zoom(x.image, x.text, x.label);
    return d;
  }
  if (first.note) box.append(mk('p', 'mod-info', first.note));
  const table = mk('table', 'mm-grid'), g1 = mk('tr'), g2 = mk('tr');
  g1.append(mk('th', 'mm-corner')); g2.append(mk('th', 'mm-corner'));
  first.groups.forEach((g, gi) => {
    const th = /** @type {HTMLTableCellElement} */ (mk('th', 'mm-group', g.label)); th.colSpan = g.cols.length; g1.append(th);
    g.cols.forEach((c, ci) => { const h = mk('th', 'mm-col' + (ci === 0 && gi > 0 ? ' mm-sep' : '')); h.append(head(c)); g2.append(h); });
  });
  table.append(g1, g2);
  /** @type {Map<string, HTMLButtonElement>} */
  const cells = new Map(); /** @type {Map<string, HTMLElement>} */ const rewardRows = new Map();
  const ncols = first.groups.reduce((n, g) => n + g.cols.length, 0);
  for (const r of first.rows) {
    const tr = mk('tr'), th = mk('th', 'mm-row'); th.append(head(r)); tr.append(th);
    first.groups.forEach((g, gi) => g.cols.forEach((c, ci) => {
      const td = mk('td', ci === 0 && gi > 0 ? 'mm-sep' : ''), b = /** @type {HTMLButtonElement} */ (mk('button', 'mm-cell')); b.type = 'button';
      b.setAttribute('aria-label', `${r.label} · ${c.label}`);
      b.onclick = () => ctx.act({ row: r.id, col: c.id });
      cells.set(`${r.id}\u0000${c.id}`, b); td.append(b); tr.append(td);
    }));
    table.append(tr);
    const rw = mk('tr', 'mm-reward'), td = /** @type {HTMLTableCellElement} */ (mk('td')); td.colSpan = ncols + 1; rw.append(td); rw.hidden = true; table.append(rw); rewardRows.set(r.id, td);
  }
  const wrap = mk('div', 'mm-scroll'); wrap.append(table); box.append(wrap);
  const btn = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', first.checkLabel)); btn.type = 'button';
  btn.onclick = async () => { btn.disabled = true; try { await ctx.act({ check: true }); } finally { btn.disabled = false; } };
  box.append(btn);
  /** @param {View} v */
  function update(v) {
    for (const [k, b] of cells) { const [row, col] = k.split('\u0000'), m = v.cells[row]?.[col]; b.textContent = m === 'y' ? '✓' : m === 'n' ? '✗' : ''; b.className = 'mm-cell' + (m ? ' ' + m : ''); }
    for (const [row, td] of rewardRows) {
      const x = v.rewards[row], tr = /** @type {HTMLElement} */ (td.parentElement); tr.hidden = !x; if (!x || td.dataset.shown) continue;
      td.dataset.shown = '1'; td.innerHTML = '';
      if (x.image) { const i = /** @type {HTMLImageElement} */ (mk('img')); i.src = src(x.image); i.alt = ''; i.onclick = () => zoom(x.image); td.append(i); }
      if (x.text) td.append(mk('span', '', x.text));
    }
  }
  update(first);
  return { update };
};
