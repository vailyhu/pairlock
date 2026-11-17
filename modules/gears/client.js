// @ts-check
// Gears UI: two gears drawn to scale, turning while they mesh, and a tooth-count picker for each axle.
/** @typedef {import('./types.ts').GearsView} View */
/** @typedef {import('./types.ts').GearsMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.gears = (box, first, ctx) => {
  const NS = 'http://www.w3.org/2000/svg';
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  /** @param {string} t @param {Record<string, string | number>} a */
  const sv = (t, a) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); return e; };
  const K = 2.1, svg = sv('svg', {}), status = mk('p', 'mod-info'), rows = mk('div'), go = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', first.button));
  go.type = 'button'; go.onclick = () => ctx.act({ install: true });
  svg.style.display = 'block'; svg.style.margin = '0 auto'; svg.style.maxWidth = '100%';
  box.append(svg, status, rows, go);
  /** @type {SVGGElement[]} */ let wheels = []; let v = first, a1 = 0, a2 = 0, t0 = performance.now(), raf = 0;
  /** @param {number} n @param {number} R @param {string} fill */
  function gear(n, R, fill) {
    const g = /** @type {SVGGElement} */ (sv('g', {})), inner = R * .9, st = Math.PI / n, P = (/** @type {number} */ r, /** @type {number} */ b) => `${(r * Math.cos(b)).toFixed(1)} ${(r * Math.sin(b)).toFixed(1)}`;
    let d = ''; for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI; d += (i ? 'L' : 'M') + P(inner, a - st * .5) + 'L' + P(R, a - st * .25) + 'L' + P(R, a + st * .25) + 'L' + P(inner, a + st * .5); }
    const label = sv('text', { x: 0, y: -R * .3, 'text-anchor': 'middle', 'font-size': 16, fill: '#2a1d08' }); label.textContent = String(n);
    g.append(sv('path', { d: d + 'Z', fill, stroke: '#2a1d08' }), sv('circle', { r: R * .18, fill: '#222' }), sv('line', { x1: 0, y1: 0, x2: R * .75, y2: 0, stroke: '#2a1d08', 'stroke-width': 4 }), label);
    return g;
  }
  /** @param {string} label @param {'a' | 'b'} axle */
  function row(label, axle) {
    const p = mk('p', '', label);
    for (const t of v.teeth) { const b = mk('button', 'mod-pick' + (v[axle] === t ? ' sel' : ''), String(t)); b.setAttribute('type', 'button'); b.setAttribute('aria-pressed', String(v[axle] === t)); b.onclick = () => ctx.act({ axle, teeth: t }); p.append(b); }
    return p;
  }
  /** @param {View} next */
  function update(next) {
    v = next; const max = Math.max(...v.teeth), H = Math.max(2 * max * K + 30, 230), X1 = 150, r1 = v.a * K, r2 = v.b * K;
    svg.setAttribute('viewBox', `0 0 660 ${H}`); svg.setAttribute('width', '660'); svg.setAttribute('height', String(H)); svg.replaceChildren();
    const g1 = gear(v.a, r1, '#c99a43'), g2 = gear(v.b, r2, '#b87f3c'), w1 = /** @type {SVGGElement} */ (sv('g', { transform: `translate(${X1},${H / 2})` })), w2 = /** @type {SVGGElement} */ (sv('g', { transform: `translate(${X1 + v.sum * K},${H / 2})` }));
    w1.append(g1); w2.append(g2); svg.append(w1, w2); wheels = [g1, g2];
    status.textContent = v.status; status.className = v.mesh ? 'mod-msg ok' : 'mod-msg bad'; go.disabled = !v.mesh;
    rows.replaceChildren(row(v.labelA, 'a'), row(v.labelB, 'b'));
  }
  /** @param {number} t */
  const tick = t => { const dt = (t - t0) / 1000; t0 = t; if (v.mesh && wheels.length) { a1 += 6 * dt; a2 -= 6 * dt * v.a / v.b; wheels[0].setAttribute('transform', `rotate(${a1})`); wheels[1].setAttribute('transform', `rotate(${a2})`); } raf = requestAnimationFrame(tick); };
  update(first); raf = requestAnimationFrame(tick);
  return { update, destroy: () => cancelAnimationFrame(raf) };
};
