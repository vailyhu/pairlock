// @ts-check
// Parameter console UI: one row of choice buttons per parameter; locked, a note and an optional code field. All decisions on the server.
/** @typedef {import('./types.ts').ParamConsoleView} View */
/** @typedef {import('./types.ts').ParamConsoleMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.param_console = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const root = mk('div'); box.append(root);
  /** @param {View} v */
  function update(v) {
    const typing = root.querySelector('input');
    if (typing && document.activeElement === typing && v.locked) return;   // keep a half-typed code
    root.innerHTML = '';
    if (v.texts.text) root.append(mk('p', '', v.texts.text));
    if (v.locked) {
      if (v.lockedText) root.append(mk('p', 'mod-info', v.lockedText));
      if (v.needsCode) {
        const f = mk('form', 'pc-code'), inp = /** @type {HTMLInputElement} */ (mk('input')), b = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', v.texts.codeButton || 'OK'));
        inp.autocomplete = 'off'; inp.setAttribute('aria-label', v.texts.codeLabel || ''); inp.placeholder = v.texts.codeLabel || '';
        f.onsubmit = e => { e.preventDefault(); if (inp.value.trim()) ctx.act({ code: inp.value }); };
        f.append(inp, b); root.append(f);
      }
      return;
    }
    for (const p of v.params) {
      const row = mk('div', 'pc-row'); row.append(mk('span', 'pc-label', p.label));
      const opts = mk('div', 'pc-opts'); opts.setAttribute('role', 'radiogroup'); opts.setAttribute('aria-label', p.label);
      for (const x of p.values) {
        const b = /** @type {HTMLButtonElement} */ (mk('button', 'mod-pick' + (x.id === p.value ? ' sel' : ''), x.label)); b.type = 'button';
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(x.id === p.value));
        b.onclick = () => { if (x.id !== p.value) ctx.act({ param: p.id, value: x.id }); };
        opts.append(b);
      }
      row.append(opts); root.append(row);
    }
  }
  update(first);
  return { update };
};
