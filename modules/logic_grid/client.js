// @ts-check
// Logic grid UI: one select per row and aspect, shared live; the check happens on the server.
/** @typedef {import('./types.ts').LogicGridView} View */
/** @typedef {import('./types.ts').LogicGridMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.logic_grid = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  if (first.note) box.append(mk('p', 'mod-info', first.note));
  const table = /** @type {HTMLTableElement} */ (mk('table', 'mod-grid')), head = mk('tr');
  head.append(mk('th', '', first.rowLabel), ...first.columns.map(c => mk('th', '', c.label))); table.append(head);
  /** @type {Map<string, HTMLSelectElement>} */
  const selects = new Map();
  first.rows.forEach(row => {
    const tr = mk('tr'); tr.append(mk('th', '', row));
    first.columns.forEach((col, ci) => {
      const td = mk('td'), s = /** @type {HTMLSelectElement} */ (mk('select', 'mod-select'));
      s.append(new Option(first.emptyLabel, ''), ...col.values.map(v => new Option(v, v)));
      s.onchange = () => ctx.act({ row, col: ci, value: s.value });
      selects.set(`${row}\u0000${ci}`, s); td.append(s); tr.append(td);
    });
    table.append(tr);
  });
  const wrap = mk('div', 'mod-scroll'); wrap.append(table); box.append(wrap);
  const btn = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', first.checkLabel)); btn.type = 'button';
  btn.onclick = async () => { btn.disabled = true; try { await ctx.act({ check: true }); } finally { btn.disabled = false; } };
  box.append(btn);
  /** @param {View} v */
  function update(v) { for (const [k, s] of selects) { const [row, ci] = k.split('\u0000'); const val = v.cells[row]?.[Number(ci)] ?? ''; if (document.activeElement !== s && s.value !== val) s.value = val; } }
  update(first);
  return { update };
};
