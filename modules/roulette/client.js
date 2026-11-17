// @ts-check
// Roulette UI: side a gets the control (SECTOR switch, FINE dial, MAGNET lever) and never the results; side b gets the drawn wheel, a SPIN button, a short animation and the last results, never the control. Alone without places: both.
/** @typedef {import('./types.ts').RouletteView} View */
/** @typedef {import('./types.ts').RouletteMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.roulette = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const NS = 'http://www.w3.org/2000/svg';
  /** @param {string} t @param {Record<string, string | number>} a */
  const sv = (t, a) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); return e; };
  if (!document.getElementById('roulette-style')) {
    const s = mk('style'); s.id = 'roulette-style';
    s.textContent = '.rl-ctl{display:flex;flex-direction:column;gap:12px;align-items:center;margin:10px auto;padding:12px;max-width:520px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel2) center/cover no-repeat}'
      + '.rl-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center}.rl-row b{min-width:90px;text-align:right;font:600 13px var(--ui);color:var(--muted)}'
      + '.rl-row button.on{background:var(--accent);color:var(--bg)}.rl-fine{font:600 28px var(--ui);min-width:48px;text-align:center}'
      + '.rl-wheel{display:block;width:min(340px,80vw);margin:8px auto}.rl-wheel g.rot{transform-origin:0 0}'
      + '.rl-hist{display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin:6px 0}.rl-hist span{min-width:28px;padding:2px 4px;border-radius:4px;color:#fff;text-align:center;font:600 13px var(--ui)}';
    document.head.append(s);
  }
  const COL = { green: '#1d7a3a', red: '#b3261e', black: '#1b1b1b' };
  if (first.side === null) { box.append(mk('p', 'mod-info', first.awayText || '')); return; }
  const L = first.labels || {};
  // ---- control (side a)
  /** @type {HTMLButtonElement[]} */ let secBtns = []; const fineOut = mk('span', 'rl-fine'), magBtn = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go'));
  if (first.control) {
    const C = first.control, panel = mk('div', 'rl-ctl');
    if (C.background) panel.style.backgroundImage = `linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)),url("${ctx.img?.(C.background) ?? C.background}")`;
    const r1 = mk('div', 'rl-row'), r2 = mk('div', 'rl-row'), r3 = mk('div', 'rl-row');
    r1.append(mk('b', '', L.sector || ''));
    secBtns = C.sectors.map((label, i) => { const b = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', label)); b.type = 'button'; b.onclick = () => ctx.act({ sector: i }); r1.append(b); return b; });
    const minus = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', '−')), plus = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', '+')); minus.type = plus.type = 'button';
    minus.onclick = () => { const c = cur.control; if (c) ctx.act({ fine: c.fine <= 1 ? c.fineMax : c.fine - 1 }); };
    plus.onclick = () => { const c = cur.control; if (c) ctx.act({ fine: c.fine >= c.fineMax ? 1 : c.fine + 1 }); };
    r2.append(mk('b', '', L.fine || ''), minus, fineOut, plus);
    magBtn.type = 'button'; magBtn.onclick = () => ctx.act({ magnet: !cur.control?.magnet });
    r3.append(mk('b', '', L.magnet || ''), magBtn);
    panel.append(r1, r2, r3); box.append(panel);
  }
  // ---- wheel (side b)
  const hist = mk('div', 'rl-hist'), last = mk('p', 'mod-info'), spinBtn = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', L.spin || '⟳'));
  /** @type {SVGGElement | null} */ let rot = null; let angle = 0, seen = first.wheel?.spins ?? 0, busy = false;
  if (first.wheel) {
    const P = first.wheel.pockets, n = P.length, R = 100, svg = sv('svg', { viewBox: '-110 -112 220 222', class: 'rl-wheel' });
    rot = /** @type {SVGGElement} */ (sv('g', { class: 'rot' }));
    P.forEach((p, i) => {
      const a0 = (i - .5) / n * 2 * Math.PI - Math.PI / 2, a1 = (i + .5) / n * 2 * Math.PI - Math.PI / 2, pt = (/** @type {number} */ a, /** @type {number} */ r) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
      rot?.append(sv('path', { d: `M0 0 L${pt(a0, R)} A${R} ${R} 0 0 1 ${pt(a1, R)} Z`, fill: COL[p.color] || '#555', stroke: '#c9a227', 'stroke-width': .6 }));
      const am = i / n * 2 * Math.PI - Math.PI / 2, t = sv('text', { x: Math.cos(am) * 86, y: Math.sin(am) * 86, fill: '#fff', 'font-size': n > 24 ? 8 : 11, 'text-anchor': 'middle', 'dominant-baseline': 'central', transform: `rotate(${i / n * 360} ${(Math.cos(am) * 86).toFixed(2)} ${(Math.sin(am) * 86).toFixed(2)})` });
      t.textContent = String(p.n); rot?.append(t);
    });
    rot.append(sv('circle', { r: 62, fill: '#3a2a1a', stroke: '#c9a227', 'stroke-width': 2 }));
    svg.append(rot, sv('path', { d: 'M0 -96 L-6 -110 L6 -110 Z', fill: 'var(--accent)' }));
    spinBtn.type = 'button'; spinBtn.onclick = () => { if (!busy) ctx.act({ spin: true }); };
    box.append(svg, spinBtn, last, hist);
  }
  /** @param {number[]} h @param {import('./types.ts').RoulettePocket[]} P */
  const drawHist = (h, P) => { hist.innerHTML = ''; for (const x of h) { const s = mk('span', '', String(x)); s.style.background = COL[P.find(p => p.n === x)?.color || 'black']; hist.append(s); } };
  let cur = first;
  /** @param {View} v */
  function update(v) {
    cur = v;
    if (v.control) { const C = v.control; secBtns.forEach((b, i) => b.classList.toggle('on', i === C.sector)); fineOut.textContent = String(C.fine); magBtn.classList.toggle('on', C.magnet); magBtn.textContent = C.magnet ? '●' : '○'; }
    if (v.wheel && rot) {
      const W = v.wheel; spinBtn.disabled = W.won;
      if (W.spins !== seen && W.history.length) {
        // a new spin: turn the wheel so the result stops under the pointer, then show the text and the list
        seen = W.spins; busy = true; spinBtn.disabled = true;
        const i = W.pockets.findIndex(p => p.n === W.history[W.history.length - 1]), want = -i / W.pockets.length * 360;
        angle = angle - (angle % 360) + 360 * 4 + ((want % 360) + 360) % 360;
        rot.style.transition = `transform ${W.spinMs}ms cubic-bezier(.15,.7,.2,1)`; rot.style.transform = `rotate(${angle}deg)`;
        last.textContent = ''; drawHist(W.history.slice(0, -1), W.pockets);
        setTimeout(() => { busy = false; spinBtn.disabled = !!cur.wheel?.won; last.textContent = cur.wheel?.last || ''; if (cur.wheel) drawHist(cur.wheel.history, cur.wheel.pockets); }, W.spinMs);
      } else if (!busy) { last.textContent = W.last || ''; drawHist(W.history, W.pockets); }
    }
  }
  if (first.wheel?.history.length) { const W = first.wheel, i = W.pockets.findIndex(p => p.n === W.history[W.history.length - 1]); angle = ((-i / W.pockets.length * 360) % 360 + 360) % 360; if (rot) rot.style.transform = `rotate(${angle}deg)`; }
  update(first);
  return { update };
};
