// @ts-check
// Power router UI: one row per consumer with an on/off switch; fixed ones are shown but cannot be switched. All values come from the server.
/** @typedef {import('./types.ts').PowerRouterView} View */
/** @typedef {import('./types.ts').PowerRouterMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.power_router = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const text = mk('p'), list = mk('div'), status = mk('p', 'mod-msg');
  list.style.cssText = 'display:grid;gap:8px;margin:10px 0';
  box.append(text, list, status);
  /** @param {View} v */
  function update(v) {
    text.textContent = v.text; list.innerHTML = '';
    for (const c of v.consumers) {
      const row = mk('div'); row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 10px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel2)';
      const dot = mk('span'); dot.style.cssText = `width:12px;height:12px;border-radius:50%;flex:none;background:${c.on ? 'var(--ok)' : 'var(--line)'}`;
      const name = mk('span', '', c.label); name.style.flex = '1';
      row.append(dot, name);
      if (c.fixed || v.full) row.append(mk('small', '', c.fixed ? v.fixedLabel : v.onLabel));
      else {
        const b = /** @type {HTMLButtonElement} */ (mk('button', '', c.on ? v.onLabel : v.offLabel)); b.type = 'button';
        b.style.cssText = `min-width:72px;min-height:40px;border-radius:var(--radius);border:2px solid ${c.on ? 'var(--accent)' : 'var(--line)'};background:${c.on ? 'var(--accent)' : 'transparent'};color:${c.on ? 'var(--bg)' : 'var(--ink)'}`;
        b.onclick = () => ctx.act({ toggle: c.id });
        row.append(b);
      }
      list.append(row);
    }
    status.textContent = v.status;
  }
  update(first);
  return { update };
};
