// @ts-check
// UV lamp UI: the picture is dimmed; around the pointer a violet light shows the picture brighter and the hidden marks.
// The marks are drawn here, not baked into the image, so they stay exact and translatable.
/** @typedef {import('./types.ts').UvLampView} View */
/** @typedef {import('./types.ts').UvLampMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.uv_lamp = (box, first, ctx) => {
  const frame = /** @type {HTMLElement | null} */ (box.closest('.box')); if (frame) frame.style.maxWidth = 'min(1100px, 96vw)';
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  let v = first, index = 0, lx = -1, ly = -1;
  const nav = mk('div', 'mod-uvnav'), prev = /** @type {HTMLButtonElement} */ (mk('button', '', '◀')), next = /** @type {HTMLButtonElement} */ (mk('button', '', '▶')), label = mk('span');
  prev.type = next.type = 'button'; nav.append(prev, label, next);
  const canvas = /** @type {HTMLCanvasElement} */ (mk('canvas', 'mod-uv')), g = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  box.append(nav, canvas); if (first.help) box.append(mk('p', 'mod-info', first.help));
  /** @type {HTMLImageElement[]} */
  const imgs = first.images.map(im => { const i = new Image(); i.onload = () => { if (imgs[index] === i) draw(); }; i.src = ctx.img?.(im.image) ?? im.image; return i; });
  const reported = new Set(first.seen);
  function show(/** @type {number} */ i) { index = (i + v.images.length) % v.images.length; label.textContent = v.images[index].label || `${index + 1} / ${v.images.length}`; nav.style.display = v.images.length > 1 ? '' : 'none'; lx = ly = -1; draw(); }
  function draw() {
    const img = imgs[index]; if (!img.complete || !img.naturalWidth) return;
    const room = Math.max(260, box.clientWidth), maxH = Math.max(240, window.innerHeight - 260), aspect = img.naturalHeight / img.naturalWidth, W = Math.min(room, maxH / aspect), H = W * aspect;
    if (canvas.width !== Math.round(W)) { canvas.width = Math.round(W); canvas.height = Math.round(H); }
    g.save(); g.filter = `brightness(${v.dim})`; g.drawImage(img, 0, 0, canvas.width, canvas.height); g.restore();
    if (v.allSeen) v.images[index].marks.forEach(m => mark(m, .55));   // all found: every mark stays readable, the lamp still works
    if (lx < 0) return;
    const R = v.radius * canvas.width;
    g.save(); g.beginPath(); g.arc(lx, ly, R, 0, Math.PI * 2); g.clip();
    g.filter = 'brightness(0.9) saturate(0.6)'; g.drawImage(img, 0, 0, canvas.width, canvas.height); g.filter = 'none';
    const glow = g.createRadialGradient(lx, ly, 0, lx, ly, R); glow.addColorStop(0, 'rgba(150,80,255,.1)'); glow.addColorStop(1, 'rgba(110,40,220,.3)'); g.fillStyle = glow; g.fillRect(0, 0, canvas.width, canvas.height);
    v.images[index].marks.forEach((m, mi) => {
      const x = m.x * canvas.width, y = m.y * canvas.height; mark(m, 1);
      const key = `${index}:${mi}`;
      if (!reported.has(key) && Math.hypot(x - lx, y - ly) < R * .8) { reported.add(key); ctx.act({ seen: [index, mi] }); }
    });
    g.restore();
    g.strokeStyle = 'rgba(190,140,255,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(lx, ly, R, 0, Math.PI * 2); g.stroke();
  }
  /** @param {import('./types.ts').UvMark} m @param {number} alpha */
  function mark(m, alpha) {
    const x = m.x * canvas.width, y = m.y * canvas.height, size = (m.size ?? 0.05) * canvas.height;
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate((m.angle ?? 0) * Math.PI / 180); g.font = `600 ${size}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#d8ff6a'; g.shadowBlur = size * .6; g.fillStyle = '#eaffb0'; g.fillText(m.text, 0, 0); g.restore();
  }
  const at = (/** @type {PointerEvent} */ e) => { const r = canvas.getBoundingClientRect(); lx = (e.clientX - r.left) * canvas.width / r.width; ly = (e.clientY - r.top) * canvas.height / r.height; draw(); };
  canvas.addEventListener('pointermove', at); canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture?.(e.pointerId); at(e); });
  canvas.addEventListener('pointerleave', () => { lx = ly = -1; draw(); });
  canvas.style.touchAction = 'none';
  prev.onclick = () => show(index - 1); next.onclick = () => show(index + 1);
  window.addEventListener('resize', draw);
  show(0);
  return { update(nv) { v = nv; nv.seen.forEach(k => reported.add(k)); draw(); }, destroy() { window.removeEventListener('resize', draw); } };
};
