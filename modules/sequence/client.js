// @ts-check
// Sequence UI: numbered slots and a tray. Tap a picture, then a slot (or the tray) to move it; dragging works too. The sketch side only looks.
/** @typedef {import('./types.ts').SequenceView} View */
/** @typedef {import('./types.ts').SequenceMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.sequence = (box, first, ctx) => {
  const frame = /** @type {HTMLElement | null} */ (box.closest('.box')); if (frame) frame.style.maxWidth = 'min(1200px, 96vw)';
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const src = (/** @type {string} */ p) => ctx.img?.(p) ?? p;
  /** @type {string | null} */ let held = null;
  const root = mk('div'); box.append(root);
  /** @param {{ id: string, image: string, label?: string }} it @param {number | null} [slot] the slot it sits on, so tapping it with another picture held swaps them */
  function card(it, slot = null) {
    const c = /** @type {HTMLButtonElement} */ (mk('button', 'mod-card')); c.type = 'button'; c.draggable = true; c.dataset.id = it.id; c.classList.toggle('held', held === it.id);
    const img = new Image(); img.src = src(it.image); img.alt = it.label || ''; img.draggable = false; c.append(img); if (it.label) c.append(mk('small', '', it.label));
    c.onclick = e => { e.stopPropagation(); if (held && held !== it.id && slot !== null) { const item = held; held = null; ctx.act({ item, slot }); return; } held = held === it.id ? null : it.id; render(current); };
    c.ondragstart = e => { e.dataTransfer?.setData('text/plain', it.id); };
    return c;
  }
  /** @param {HTMLElement} el @param {number | null} slot */
  function target(el, slot) {
    el.onclick = () => { if (!held) return; const item = held; held = null; ctx.act({ item, slot }); };
    el.ondragover = e => e.preventDefault();
    el.ondrop = e => { e.preventDefault(); const item = e.dataTransfer?.getData('text/plain'); if (item) { held = null; ctx.act({ item, slot }); } };
  }
  let current = first;
  /** @param {View} v */
  function render(v) {
    current = v; root.innerHTML = '';
    if (v.sketches) {
      if (v.sketchText) root.append(mk('p', 'mod-info', v.sketchText));
      const row = mk('div', 'mod-cards');
      v.sketches.forEach(s => { const f = mk('figure', 'mod-sketch'), img = new Image(); img.src = src(s.image); img.alt = ''; f.append(img, mk('b', '', String(s.number))); row.append(f); });
      root.append(row);
    }
    if (!v.canArrange || !v.slots || !v.placed || !v.items) return;
    if (v.arrangeText) root.append(mk('p', 'mod-info', v.arrangeText));
    const byId = new Map(v.items.map(it => [it.id, it])), slots = mk('div', 'mod-slots');
    v.slots.forEach((name, i) => {
      const s = mk('div', 'mod-slot'); s.append(mk('span', '', name));
      const id = v.placed?.[i], it = id ? byId.get(id) : undefined; if (it) s.append(card(it, i));
      target(s, i); slots.append(s);
    });
    const tray = mk('div', 'mod-tray'); tray.append(mk('span', '', v.trayLabel || ''));
    const cards = mk('div', 'mod-cards'); (v.tray || []).forEach(it => cards.append(card(it))); tray.append(cards); target(tray, null);
    const btn = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', v.checkLabel || '')); btn.type = 'button';
    btn.onclick = async () => { btn.disabled = true; try { await ctx.act({ check: true }); } finally { btn.disabled = false; } };
    root.append(slots, tray, btn);
  }
  render(first);
  return { update: render };
};
