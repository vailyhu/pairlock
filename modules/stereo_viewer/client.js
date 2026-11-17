// @ts-check
// Stereo viewer UI: the left half below, the right half above at half opacity; drag it or use the sliders. The server decides when it lines up.
/** @typedef {import('./types.ts').StereoViewerView} View */
/** @typedef {import('./types.ts').StereoViewerMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.stereo_viewer = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const src = (/** @type {string} */ p) => ctx.img?.(p) ?? p;
  const help = mk('p', 'mod-info');
  const stage = mk('div'); stage.style.cssText = 'position:relative;max-width:min(560px,100%);margin:6px auto;overflow:hidden;border-radius:var(--radius);touch-action:none;cursor:grab;background:#000';
  const a = new Image(), b = new Image(); a.draggable = b.draggable = false; a.style.cssText = 'display:block;width:100%'; b.style.cssText = 'position:absolute;left:0;top:0;width:100%;opacity:.5;pointer-events:none';
  stage.append(a, b);
  /** @param {string} label */
  const slider = label => { const w = mk('label', 'mod-info'); w.style.display = 'block'; const s = /** @type {HTMLInputElement} */ (mk('input')); s.type = 'range'; s.step = '0.001'; s.style.width = '100%'; w.append(label, s); return { w, s }; };
  const sx = slider(first.xLabel || '↔'), sy = slider(first.yLabel || '↕');
  box.append(help, stage, sx.w, sy.w);
  let cur = first, dx = first.dx, dy = first.dy, timer = 0;
  const place = () => { b.style.transform = `translate(${dx * 100}%, ${dy * 100}%)`; sx.s.value = String(dx); sy.s.value = String(dy); };
  const send = () => { clearTimeout(timer); timer = window.setTimeout(() => ctx.act({ dx, dy }), 120); };
  for (const [s, k] of /** @type {const} */ ([[sx.s, 'x'], [sy.s, 'y']])) s.oninput = () => { if (cur.solved) return; if (k === 'x') dx = Number(s.value); else dy = Number(s.value); place(); send(); };
  /** @type {{x:number,y:number,dx:number,dy:number}|null} */ let drag = null;
  stage.onpointerdown = e => { if (cur.solved) return; drag = { x: e.clientX, y: e.clientY, dx, dy }; stage.setPointerCapture(e.pointerId); };
  stage.onpointermove = e => { if (!drag) return; const r = stage.getBoundingClientRect(), R = cur.range;
    dx = Math.max(-R, Math.min(R, drag.dx + (e.clientX - drag.x) / r.width)); dy = Math.max(-R, Math.min(R, drag.dy + (e.clientY - drag.y) / r.height)); place(); };
  stage.onpointerup = () => { if (drag) { drag = null; send(); } };
  /** @param {View} v */
  function render(v) {
    cur = v; help.textContent = v.help || ''; help.hidden = !v.help;
    if (a.dataset.src !== v.left) { a.dataset.src = v.left; a.src = src(v.left); } if (b.dataset.src !== v.right) { b.dataset.src = v.right; b.src = src(v.right); }
    for (const s of [sx.s, sy.s]) { s.min = String(-v.range); s.max = String(v.range); s.disabled = v.solved; }
    if (!drag) { dx = v.dx; dy = v.dy; } place(); stage.style.cursor = v.solved ? 'default' : 'grab';
  }
  render(first);
  return { update: render };
};
