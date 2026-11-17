// @ts-check
// Dual word UI: the own word field and whether the partner has typed (never their word). Alone: two fields, one button.
/** @typedef {import('./types.ts').DualWordView} View */
/** @typedef {import('./types.ts').DualWordMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.dual_word = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  /** @param {string} [ph] */
  const field = ph => { const i = /** @type {HTMLInputElement} */ (mk('input')); i.autocomplete = 'off'; i.spellcheck = false; i.placeholder = ph || ''; i.setAttribute('aria-label', ph || ''); return i; };
  const form = mk('form', 'dw-form'), lamps = mk('div', 'dw-lamps'), status = mk('p', 'mod-info');
  const btn = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', first.sendLabel || 'OK'));
  if (first.side === null) { box.append(mk('p', 'mod-info', first.awayText || '')); return; }
  if (first.mode === 'press') return pressLock(first);
  /** @type {HTMLInputElement[]} */ let inputs;
  if (first.side === 'both') {
    inputs = [field(first.soloLabels?.a || first.placeholder), field(first.soloLabels?.b || first.placeholder)];
    form.onsubmit = e => { e.preventDefault(); if (inputs.every(i => i.value.trim())) ctx.act({ words: { a: inputs[0].value, b: inputs[1].value } }); };
  } else {
    inputs = [field(first.placeholder)];
    form.onsubmit = async e => { e.preventDefault(); const w = inputs[0].value; if (!w.trim()) return; const o = await ctx.act({ word: w }); if (!o?.error) inputs[0].value = ''; };
  }
  form.append(...inputs, btn); box.append(form, lamps, status);
  /** @param {View} v */
  function update(v) {
    lamps.innerHTML = '';
    if (v.side === 'a' || v.side === 'b') {
      const me = mk('span', 'dw-lamp' + (v.mine ? ' on' : ''), v.mine ? v.waitText : ''), it = mk('span', 'dw-lamp' + (v.otherTyped ? ' on' : ''), v.otherTyped ? v.otherTypedText || '…' : '');
      lamps.append(me, it);
    }
    status.textContent = v.status || '';
  }
  update(first);
  return { update };

  /** Two-key lock: one turn button per key the player holds (alone: both keys), lamps for the turned keys. @param {View} v0 */
  function pressLock(v0) {
    const keys = mk('div', 'mod-pair'), lamps = mk('div', 'dw-lamps'), status = mk('p', 'mod-info');
    box.append(keys, lamps, status);
    /** @param {View} v */
    function update(v) {
      keys.innerHTML = '';
      for (const k of /** @type {('a' | 'b')[]} */ (['a', 'b'])) {
        if (!v.canPress || !(k in v.canPress)) continue;
        const cell = mk('div', 'dw-key');
        if (v.side === 'both' && v.soloLabels) cell.append(mk('p', 'mod-small', v.soloLabels[k]));
        if (v.canPress[k]) { const b = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', v.pressLabel || '⟳')); b.type = 'button'; b.onclick = () => ctx.act({ press: v.side === 'both' ? k : true }); cell.append(b); }
        else cell.append(mk('p', 'mod-warn', v.noKeyText || ''));
        keys.append(cell);
      }
      lamps.innerHTML = '';
      lamps.append(mk('span', 'dw-lamp' + (v.mine ? ' on' : ''), v.mine ? v.waitText : ''), mk('span', 'dw-lamp' + (v.otherTyped ? ' on' : ''), v.otherTyped ? (v.side === 'both' ? v.waitText : v.otherTypedText || '…') : ''));
      status.textContent = v.status || '';
    }
    update(v0);
    return { update };
  }
};
