// @ts-check
// Report form UI: one drop-down per question and the signing button. Both players see the same picks.
/** @typedef {import('./types.ts').ReportFormView} View */
/** @typedef {import('./types.ts').ReportFormMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.report_form = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  /** @type {HTMLSelectElement[]} */ const sels = [];
  first.questions.forEach((q, i) => {
    const label = mk('label', '', `${i + 1}. ${q.text}`), se = /** @type {HTMLSelectElement} */ (mk('select', 'mod-select'));
    const none = /** @type {HTMLOptionElement} */ (mk('option', '', first.choose)); none.value = ''; se.append(none);
    for (const c of q.choices) { const o = /** @type {HTMLOptionElement} */ (mk('option', '', c)); o.value = c; se.append(o); }
    se.onchange = () => ctx.act({ pick: i, value: se.value || null });
    label.style.display = 'block'; label.style.marginTop = '8px'; label.append(se); box.append(label); sels.push(se);
  });
  const go = mk('button', 'mod-go', first.button); go.setAttribute('type', 'button'); go.onclick = () => ctx.act({ sign: true }); box.append(go);
  /** @param {View} v */
  const update = v => v.picks.forEach((p, i) => { if (sels[i] && document.activeElement !== sels[i]) sels[i].value = p || ''; });
  update(first);
  return { update };
};
