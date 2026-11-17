// @ts-check
// Planchette UI: the board with the pointer, arrow buttons for this player's axis (hold to repeat; a tap on the board moves along the own axis), the ready button. The server decides what counts.
/** @typedef {import('./types.ts').PlanchetteView} View */
/** @typedef {import('./types.ts').PlanchetteMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.planchette = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const src = (/** @type {string} */ p) => ctx.img?.(p) ?? p;
  const stage = mk('div'); stage.style.cssText = 'position:relative;max-width:min(640px,100%);margin:6px auto;border-radius:var(--radius);overflow:hidden;touch-action:none;user-select:none;background:#000';
  const img = new Image(); img.draggable = false; img.style.cssText = 'display:block;width:100%';
  const ptr = mk('div'); ptr.style.cssText = 'position:absolute;width:9%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:3px solid var(--accent);box-shadow:0 0 0 2px rgba(0,0,0,.6),0 0 14px var(--accent);background:rgba(255,255,255,.12);pointer-events:none;transition:left .25s,top .25s';
  stage.append(img, ptr);
  const written = mk('div', 'mod-trace'), state = mk('p', 'mod-info');
  const pad = mk('div'); pad.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(64px,96px));gap:8px;justify-content:center;margin:10px 0';
  const readyB = /** @type {HTMLButtonElement} */ (mk('button', 'mod-hold')); readyB.type = 'button';
  const clearB = /** @type {HTMLButtonElement} */ (mk('button', 'mod-small')); clearB.type = 'button';
  box.append(stage, written, state, pad, readyB, clearB);
  let cur = first, rep = 0, after = /** @type {{base:number, timer:number, closed:boolean}|null} */ (null);
  const stopRep = () => { clearTimeout(rep); rep = 0; };
  /** One arrow: pressing moves once, holding repeats. @param {string} label @param {Move} move @param {string} area */
  const arrow = (label, move, area) => {
    const b = /** @type {HTMLButtonElement} */ (mk('button', 'mod-hold', label)); b.type = 'button'; b.style.cssText = `margin:0;padding:16px 6px;grid-area:${area}`;
    const loop = () => { ctx.act(move); rep = window.setTimeout(loop, 160); };
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); stopRep(); ctx.act(move); rep = window.setTimeout(loop, 350); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, stopRep);
    return b;
  };
  /** @param {View} v */
  function buildPad(v) {
    pad.innerHTML = ''; const s = v.step, T = v.texts;
    pad.style.gridTemplateAreas = v.axis === 'both' ? '". u ." "l . r" ". d ."' : v.axis === 'x' ? '"l . r"' : '"u . d"';
    if (v.axis !== 'y') pad.append(arrow(`◀ ${T.left}`, { dx: -s }, 'l'), arrow(`${T.right} ▶`, { dx: s }, 'r'));
    if (v.axis !== 'x') pad.append(arrow(`▲ ${T.up}`, { dy: -s }, 'u'), arrow(`▼ ${T.down}`, { dy: s }, 'd'));
  }
  // A tap on the board moves the pointer there along this player's own axis.
  stage.addEventListener('pointerdown', e => {
    if (cur.after) return; const r = stage.getBoundingClientRect(), tx = (e.clientX - r.left) / r.width, ty = (e.clientY - r.top) / r.height;
    if (cur.axis !== 'y') ctx.act({ dx: tx - cur.x }); if (cur.axis !== 'x') ctx.act({ dy: ty - cur.y });
  });
  readyB.onclick = () => ctx.act({ ready: true }); clearB.onclick = () => ctx.act({ clear: true });
  const place = (/** @type {number} */ x, /** @type {number} */ y) => { ptr.style.left = `${x * 100}%`; ptr.style.top = `${y * 100}%`; };
  /** The closing spelling: the pointer goes from letter to letter by itself; at the end the frame is asked for a fresh view (it closes). @param {View} v */
  function runAfter(v) {
    if (after || !v.after) return; const A = v.after; after = { base: performance.now() - A.elapsed, timer: 0, closed: false };
    pad.hidden = readyB.hidden = clearB.hidden = true; state.textContent = '';
    const total = A.tokens.length * A.msPerLetter, done = v.done.join(' · ');
    const tick = () => {
      if (!after) return; const t = performance.now() - after.base, n = Math.min(A.tokens.length, Math.floor(t / A.msPerLetter) + 1);
      const shown = A.tokens.slice(0, n), last = [...shown].reverse().find(k => k.x !== undefined);
      if (last) place(/** @type {number} */ (last.x), /** @type {number} */ (last.y));
      written.textContent = `${done}\n${shown.map(k => k.ch).join('')}`;
      if (t > total + 2600 && !after.closed) { after.closed = true; ctx.act(/** @type {any} */ ({ open: true })); return; }
      after.timer = window.setTimeout(tick, 120);
    };
    tick();
  }
  /** @param {View} v */
  function render(v) {
    const axisChanged = !pad.childElementCount || v.axis !== cur.axis; cur = v;
    if (img.dataset.src !== v.board) { img.dataset.src = v.board; img.src = src(v.board); }
    if (v.after) { runAfter(v); return; }
    if (axisChanged) buildPad(v);
    place(v.x, v.y);
    const T = v.texts; written.textContent = `${T.written} ${[...v.done, v.cur + '_'].join(' · ')}`;
    const mine = v.me === 'both' ? false : v.ready[v.me], other = v.me === 'a' ? v.ready.b : v.me === 'b' ? v.ready.a : false;
    state.textContent = mine ? T.waiting : other ? `✋ ${T.ready}` : '';
    readyB.textContent = `✋ ${T.ready}`; readyB.classList.toggle('sel', mine); clearB.textContent = T.clear;
  }
  render(first);
  return { update: render, destroy: () => { stopRep(); if (after) clearTimeout(after.timer); after = null; } };
};
