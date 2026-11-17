// @ts-check
// Gauge board UI: control wheels on one side, gauge dials on the other. All values come from the server.
/** @typedef {import('./types.ts').GaugeBoardView} View */
/** @typedef {import('./types.ts').GaugeBoardMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.gauge_board = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  /** @type {HTMLElement | undefined} */ let wheels;
  /** @type {HTMLElement | undefined} */ let dials;
  /** @type {HTMLButtonElement | undefined} */ let confirm;
  if (first.canControl) { box.append(mk('p', '', first.textA)); wheels = mk('div', 'mod-wheels'); box.append(wheels); }
  if (first.canRead) {
    box.append(mk('p', '', first.textB)); dials = mk('div', 'mod-dials'); box.append(dials);
    confirm = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', first.confirmLabel)); confirm.type = 'button'; confirm.onclick = () => ctx.act({ confirm: true }); box.append(confirm);
  }
  /** @param {number} value @param {number} index @param {View} v */
  function dial(value, index, v) {
    const max = v.gaugeMax ?? 100, [lo, hi] = v.band ?? [0, 0], angle = (/** @type {number} */ q) => -150 + q / max * 300;
    const at = (/** @type {number} */ r, /** @type {number} */ d) => `${70 + r * Math.sin(d * Math.PI / 180)} ${70 - r * Math.cos(d * Math.PI / 180)}`;
    return `<svg width="140" height="136" viewBox="0 0 140 136" role="img" aria-label="${index + 1}: ${value}"><circle cx="70" cy="70" r="58" fill="var(--panel2)" stroke="var(--line)" stroke-width="4"/><path d="M${at(50, angle(lo))}A50 50 0 0 1 ${at(50, angle(hi))}" stroke="var(--ok)" stroke-width="10" fill="none"/><line x1="70" y1="70" x2="${70 + 46 * Math.sin(angle(value) * Math.PI / 180)}" y2="${70 - 46 * Math.cos(angle(value) * Math.PI / 180)}" stroke="#d04a3a" stroke-width="3"/><circle cx="70" cy="70" r="5" fill="var(--ink)"/><text x="70" y="108" text-anchor="middle" font-size="12" fill="var(--ink)">${index + 1}</text></svg>`;
  }
  /** @param {View} v */
  function update(v) {
    if (wheels && v.controls && v.labels) {
      wheels.innerHTML = '';
      v.controls.forEach((value, i) => {
        const w = mk('div', 'mod-wheel');
        /** @param {string} label @param {1 | -1} delta */
        const btn = (label, delta) => { const b = /** @type {HTMLButtonElement} */ (mk('button', '', label)); b.type = 'button'; b.onclick = () => ctx.act({ control: i, delta }); return b; };
        w.append(mk('small', '', v.labels?.[i]), btn('▲', 1), mk('span', '', String(value)), btn('▼', -1)); wheels?.append(w);
      });
    }
    if (dials && v.gauges) dials.innerHTML = v.gauges.map((g, i) => dial(g, i, v)).join('');
    if (confirm) confirm.disabled = !v.ready;
  }
  update(first);
  return { update };
};
