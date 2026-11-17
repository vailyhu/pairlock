// @ts-check
// Scratch reveal UI: the top picture on a canvas over the bottom one; scraping erases it locally at once and sends the points (thinned) to the server, whose mask is the truth.
/** @typedef {import('./types.ts').ScratchRevealView} View */
/** @typedef {import('./types.ts').ScratchRevealMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.scratch_reveal = (box, first, ctx) => {
  const frame = /** @type {HTMLElement | null} */ (box.closest('.box')); if (frame) frame.style.maxWidth = 'min(1100px, 96vw)';
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const SEND_MS = 90, holder = mk('div', 'mod-scratch'), under = new Image(), top = new Image(), canvas = /** @type {HTMLCanvasElement} */ (mk('canvas')), g = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d')), meter = mk('p', 'mod-info');
  under.src = ctx.img?.(first.bottom) ?? first.bottom; under.alt = ''; under.draggable = false; top.src = ctx.img?.(first.top) ?? first.top;
  holder.append(under, canvas); box.append(holder, meter); if (first.help) box.append(mk('p', 'mod-info', first.help));
  let v = first, down = false, last = 0;
  /** @type {[number, number][]} */ let pending = [];
  function size() { const aspect = top.naturalHeight / top.naturalWidth || .75, W = Math.min(box.clientWidth || 600, Math.max(260, window.innerHeight - 260) / aspect); holder.style.width = `${W}px`; canvas.width = Math.round(W); canvas.height = Math.round(W * aspect); paint(); }
  function erase(/** @type {number} */ x, /** @type {number} */ y) { g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x * canvas.width, y * canvas.height, v.brush * canvas.width, 0, Math.PI * 2); g.fill(); g.restore(); }
  function paint() {
    if (!top.complete || !top.naturalWidth) return;
    g.globalCompositeOperation = 'source-over'; g.drawImage(top, 0, 0, canvas.width, canvas.height);
    g.save(); g.globalCompositeOperation = 'destination-out';
    const cw = canvas.width / v.cols, ch = canvas.height / v.rows;
    for (let i = 0; i < v.mask.length; i++) if (v.mask[i] === '1') { g.beginPath(); g.arc((i % v.cols + .5) * cw, (Math.floor(i / v.cols) + .5) * ch, Math.max(cw, ch) * .85, 0, Math.PI * 2); g.fill(); }
    g.restore();
    meter.textContent = `${Math.round(v.done * 100)}%`;
  }
  const pos = (/** @type {PointerEvent} */ e) => { const r = canvas.getBoundingClientRect(); return /** @type {[number, number]} */ ([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]); };
  function send(/** @type {boolean} */ end) { if (!pending.length) return; const points = pending; pending = []; ctx.act(end ? { points } : { points, live: true }); }
  canvas.addEventListener('pointerdown', e => { down = true; canvas.setPointerCapture?.(e.pointerId); const p = pos(e); pending.push(p); erase(...p); });
  canvas.addEventListener('pointermove', e => { if (!down) return; const p = pos(e); pending.push(p); erase(...p); const t = performance.now(); if (t - last > SEND_MS) { last = t; send(false); } });
  const up = () => { if (!down) return; down = false; send(true); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.style.touchAction = 'none';
  top.onload = size; window.addEventListener('resize', size);
  return { update(nv) { v = nv; if (!down) paint(); else meter.textContent = `${Math.round(nv.done * 100)}%`; }, destroy() { window.removeEventListener('resize', size); } };
};
