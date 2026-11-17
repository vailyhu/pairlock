// @ts-check
// Time capsule UI: two radio groups (container, place) and a button; the other side only reads a text.
/** @typedef {import('./types.ts').TimeCapsuleView} View */
/** @typedef {import('./types.ts').TimeCapsuleMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.time_capsule = (box, v, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  box.append(mk('p', 'mod-info', v.text));
  if (!v.canChoose) return;
  /** @param {string} name @param {string | undefined} label @param {import('./types.ts').Choice[]} list */
  const group = (name, label, list) => {
    const fs = mk('fieldset', 'mod-choices'); if (label) fs.append(mk('legend', '', label));
    for (const c of list) { const l = mk('label'), i = /** @type {HTMLInputElement} */ (mk('input')); i.type = 'radio'; i.name = name; i.value = c.id; l.append(i, ' ' + c.label); fs.append(l, mk('br')); }
    box.append(fs);
  };
  group('tc-container', v.containerLabel, v.containers || []);
  group('tc-place', v.placeLabel, v.places || []);
  const btn = mk('button', 'btn', v.button || 'OK'); box.append(btn);
  /** @param {string} n */
  const val = n => /** @type {HTMLInputElement | null} */ (box.querySelector(`input[name="${n}"]:checked`))?.value;
  btn.onclick = () => { const container = val('tc-container'), place = val('tc-place'); if (container && place) ctx.act({ container, place }); };
};
