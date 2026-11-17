// @ts-check
// Airlock UI: this side's controls as rows of position buttons, this side's gauges as slowly moving bars. All values come from the server.
/** @typedef {import('./types.ts').AirlockView} View */
/** @typedef {import('./types.ts').AirlockMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.airlock = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const text = mk('p'), controls = mk('div'), gauges = mk('div'), note = mk('p', 'mod-msg');
  const reset = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go')); reset.type = 'button'; reset.onclick = () => ctx.act({ reset: true });
  controls.style.cssText = 'display:grid;gap:10px;margin:10px 0'; gauges.style.cssText = 'display:grid;gap:10px;margin:12px 0';
  box.append(text, controls, gauges, note, reset);
  /** @type {Record<string, number>} */ const shown = {};   // the value each gauge shows now, for the slow movement
  /** @type {Record<string, number>} */ const timers = {};
  /** @param {HTMLElement} bar @param {HTMLElement} num @param {{id: string, max: number, unit?: string, value: number}} g */
  function move(bar, num, g) {
    const from = shown[g.id] ?? g.value, to = g.value, t0 = performance.now(), ms = Math.min(2500, 600 + Math.abs(to - from) / Math.max(1, g.max) * 3000);
    cancelAnimationFrame(timers[g.id]);
    const tick = (/** @type {number} */ t) => {
      const k = Math.min(1, (t - t0) / ms), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
      shown[g.id] = v; bar.style.width = `${Math.max(0, Math.min(100, v / g.max * 100))}%`; num.textContent = `${Math.round(v)}${g.unit ? ' ' + g.unit : ''}`;
      if (k < 1) timers[g.id] = requestAnimationFrame(tick);
    };
    timers[g.id] = requestAnimationFrame(tick);
  }
  /** @param {View} v */
  function update(v) {
    text.textContent = v.text;
    controls.innerHTML = '';
    for (const c of v.controls) {
      const row = mk('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px';
      const lab = mk('b', '', c.label); lab.style.cssText = 'flex:1 1 100%;font-size:14px'; row.append(lab);
      for (const val of c.values) {
        const b = /** @type {HTMLButtonElement} */ (mk('button', '', val.label)); b.type = 'button';
        const on = val.id === c.value;
        b.style.cssText = `flex:1 1 0;min-height:44px;padding:8px 10px;border-radius:var(--radius);border:2px solid ${on ? 'var(--accent)' : 'var(--line)'};background:${on ? 'var(--accent)' : 'var(--panel2)'};color:${on ? 'var(--bg)' : 'var(--ink)'};font-weight:${on ? 700 : 400}`;
        b.disabled = v.done; b.onclick = () => { if (!on) ctx.act({ set: { control: c.id, value: val.id } }); };
        row.append(b);
      }
      controls.append(row);
    }
    const keep = new Set(v.gauges.map(g => g.id));
    if (gauges.dataset.ids !== [...keep].join(',')) { gauges.innerHTML = ''; gauges.dataset.ids = [...keep].join(','); }
    for (const g of v.gauges) {
      let row = /** @type {HTMLElement | null} */ (gauges.querySelector(`[data-g="${g.id}"]`));
      if (!row) {
        row = mk('div'); row.dataset.g = g.id; row.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center';
        const track = mk('div'); track.style.cssText = 'grid-column:1/-1;height:14px;border-radius:7px;background:var(--panel2);border:1px solid var(--line);overflow:hidden';
        const fill = mk('i'); fill.style.cssText = 'display:block;height:100%;width:0;background:var(--accent)'; track.append(fill);
        row.append(mk('small', '', g.label), mk('b'), track); gauges.append(row);
      }
      move(/** @type {HTMLElement} */ (row.querySelector('i')), /** @type {HTMLElement} */ (row.querySelector('b')), g);
    }
    note.textContent = v.note || ''; reset.textContent = v.resetLabel; reset.hidden = v.done;
  }
  update(first);
  return { update, destroy() { for (const t of Object.values(timers)) cancelAnimationFrame(t); } };
};
