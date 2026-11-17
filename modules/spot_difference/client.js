// @ts-check
// Spot the difference UI: both images side by side (stacked on a phone); a click sends its position as shares of the image size.
/** @typedef {import('./types.ts').SpotDifferenceView} View */
/** @typedef {import('./types.ts').SpotDifferenceMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.spot_difference = (box, first, ctx) => {
  const frame = /** @type {HTMLElement | null} */ (box.closest('.box')); if (frame) frame.style.maxWidth = 'min(1400px, 96vw)';
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const row = mk('div', 'mod-pair'), count = mk('p', 'mod-info'); box.append(row, count);
  /** @type {HTMLElement[]} */
  const layers = [];
  for (const [src, label] of [[first.left, first.leftLabel], [first.right, first.rightLabel]]) {
    const fig = mk('figure', 'mod-spot'), holder = mk('div', 'mod-spotimg'), img = new Image(), layer = mk('div', 'mod-marks');
    img.src = ctx.img?.(String(src)) ?? String(src); img.alt = label || ''; img.draggable = false;
    img.onclick = e => { const r = img.getBoundingClientRect(); ctx.act({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); };
    holder.append(img, layer); fig.append(holder); if (label) fig.append(mk('figcaption', '', label)); row.append(fig); layers.push(layer);
  }
  /** @param {View} v */
  function update(v) {
    for (const layer of layers) layer.innerHTML = v.found.map(a => `<i style="left:${a.x * 100}%;top:${a.y * 100}%;width:${a.w * 100}%;height:${a.h * 100}%"></i>`).join('');
    count.textContent = v.total > 1 ? `${v.found.length} / ${v.total}` : '';
  }
  update(first);
  return { update };
};
