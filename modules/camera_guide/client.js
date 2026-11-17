// @ts-check
// Camera guide UI: side a sees the camera picture (with the mark) and where the last tap fell; side b taps on the picture of the place. Alone with side "both": both pictures.
/** @typedef {import('./types.ts').CameraGuideView} View */
/** @typedef {import('./types.ts').CameraGuideMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.camera_guide = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  if (first.side === null) { box.append(mk('p', 'mod-info', first.awayText || '')); return; }
  if (first.side === 'both') { const frame = /** @type {HTMLElement | null} */ (box.closest('.box')); if (frame) frame.style.maxWidth = 'min(1400px, 96vw)'; }
  const row = mk('div', 'mod-pair'), wait = mk('p', 'mod-warn'), hint = mk('p', 'mod-info'), fb = mk('p', 'mod-info cg-feedback');
  /** @type {{ layer: HTMLElement, isA: boolean, img: HTMLImageElement }[]} */
  const pics = [];
  /** @param {string} src @param {string | undefined} label @param {boolean} isA */
  function picture(src, label, isA) {
    const fig = mk('figure', 'mod-spot'), holder = mk('div', 'mod-spotimg cg-img'), img = new Image(), layer = mk('div', 'cg-layer');
    img.src = ctx.img?.(src) ?? src; img.alt = label || ''; img.draggable = false;
    if (isA) img.style.cursor = 'default';
    else img.onclick = e => { if (!cur.canTap) return; const r = img.getBoundingClientRect(); ctx.act({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); };
    holder.append(img, layer); fig.append(holder); if (label) fig.append(mk('figcaption', '', label)); row.append(fig);
    pics.push({ layer, isA, img });
  }
  if (first.imageA) picture(first.imageA, first.labelA, true);
  if (first.imageB) picture(first.imageB, first.labelB, false);
  box.append(wait, row, hint, fb);
  /** @type {number | undefined} */ let seen;
  let cur = first;
  /** @param {View} v */
  function update(v) {
    cur = v;
    wait.textContent = v.waiting || ''; hint.textContent = v.hintLine || ''; fb.textContent = v.feedback || '';
    for (const p of pics) {
      p.img.style.cursor = p.isA ? 'default' : v.canTap ? 'crosshair' : 'not-allowed';
      if (p.isA && v.marker && !p.layer.querySelector('.cg-marker')) {
        const m = mk('b', 'cg-marker'); const { x, y, r } = v.marker;
        m.style.left = `${(x - r) * 100}%`; m.style.top = `${y * 100}%`; m.style.width = `${2 * r * 100}%`; p.layer.append(m);
      }
    }
    const k = v.poke;
    if (!k || k.n === seen) return;
    seen = k.n;
    const left = v.flashMs - k.age; if (left <= 0) return;
    for (const p of pics) {
      if (p.isA && !k.onA) continue;
      p.layer.querySelector('.cg-poke')?.remove();
      const d = mk('i', 'cg-poke' + (k.hit ? ' hit' : '')); d.style.left = `${k.x * 100}%`; d.style.top = `${k.y * 100}%`; d.style.animationDuration = `${left}ms`;
      d.addEventListener('animationend', () => d.remove()); p.layer.append(d);
    }
  }
  update(first);
  return { update };
};
