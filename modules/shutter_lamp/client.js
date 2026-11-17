// @ts-check
// Shutter lamp UI: the crank on one side; on the other the shutter ring, a strip of two turns and a light that flashes at the drum's speed.
/** @typedef {import('./types.ts').ShutterLampView} View */
/** @typedef {import('./types.ts').ShutterLampMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.shutter_lamp = (box, first, ctx) => {
  const NS = 'http://www.w3.org/2000/svg';
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  /** @param {string} t @param {Record<string, string | number>} a */
  const sv = (t, a) => { const e = document.createElementNS(NS, t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); return e; };
  let held = false, v = first, timer = 0;
  /** @type {HTMLButtonElement | undefined} */ let hold;
  if (first.canHold) {
    box.append(mk('p', '', first.textA)); hold = /** @type {HTMLButtonElement} */ (mk('button', 'mod-hold', first.holdLabel)); hold.type = 'button';
    const set = (/** @type {boolean} */ on) => { if (on === held) return; held = on; hold?.classList.toggle('sel', on); ctx.act({ hold: on }); };
    hold.addEventListener('pointerdown', e => { hold?.setPointerCapture?.(e.pointerId); set(true); }); hold.addEventListener('pointerup', () => set(false)); hold.addEventListener('pointercancel', () => set(false));
    box.append(hold);
  }
  const ring = sv('svg', { width: 260, height: 260, viewBox: '0 0 260 260' }), strip = mk('div', 'mod-strip'), look = mk('p', 'mod-info'), glow = mk('div', 'mod-lamp mod-glow'), gate = mk('p', 'mod-warn');
  const fire = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', first.button || ''));
  if (first.canSet) {
    /** @type {SVGElement} */ (ring).style.display = 'block'; /** @type {SVGElement} */ (ring).style.margin = '0 auto';
    fire.type = 'button'; fire.onclick = () => ctx.act({ fire: true });
    box.append(ring, mk('p', 'mod-info', first.textB), strip, look, glow, gate, fire);
    const t0 = performance.now();
    timer = window.setInterval(() => {
      const s = v.shutters || [], n = s.length || 1, p = v.period || 1, f = (((performance.now() - t0) / 1000) % p) / p * n, on = !!s[Math.floor(f) % n] && f % 1 < .5;
      glow.classList.toggle('on', on);
    }, 60);
  }
  /** @param {View} next */
  function update(next) {
    v = next; hold?.classList.toggle('sel', held);
    if (!v.canSet || !v.shutters) return;
    const s = v.shutters, n = s.length, cx = 130, cy = 130, pt = (/** @type {number} */ r, /** @type {number} */ a) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
    ring.replaceChildren();
    s.forEach((open, i) => {
      const a0 = i / n * 2 * Math.PI - Math.PI / 2, a1 = (i + 1) / n * 2 * Math.PI - Math.PI / 2, m = (a0 + a1) / 2;
      const seg = sv('path', { d: `M${pt(46, a0)}L${pt(120, a0)}A120 120 0 0 1 ${pt(120, a1)}L${pt(46, a1)}A46 46 0 0 0 ${pt(46, a0)}Z`, fill: open ? '#e9dc9c' : '#15130f', stroke: '#8a7345', 'stroke-width': 2, role: 'button', tabindex: 0, 'aria-pressed': String(open), 'aria-label': String(i + 1) });
      /** @type {SVGElement} */ (seg).style.cursor = 'pointer';
      seg.addEventListener('click', () => ctx.act({ toggle: i }));
      seg.addEventListener('keydown', e => { if (/** @type {KeyboardEvent} */ (e).key === 'Enter' || /** @type {KeyboardEvent} */ (e).key === ' ') { e.preventDefault(); ctx.act({ toggle: i }); } });
      const num = sv('text', { x: cx + 84 * Math.cos(m), y: cy + 84 * Math.sin(m) + 5, 'text-anchor': 'middle', fill: open ? '#222' : '#8a7345', 'font-size': 14, 'pointer-events': 'none' }); num.textContent = String(i + 1);
      ring.append(seg, num);
    });
    const hub = sv('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', fill: 'currentColor', 'font-size': 12 }); hub.textContent = v.centerLabel || '';
    ring.append(sv('circle', { cx, cy, r: 38, fill: 'var(--panel2)', stroke: '#8a7345' }), hub);
    strip.replaceChildren(); for (let i = 0; i < 2 * n; i++) strip.append(mk('i', s[i % n] ? 'on' : ''));
    look.textContent = v.look || ''; gate.textContent = v.gate || ''; fire.disabled = !v.ready;
  }
  update(first);
  return { update, destroy: () => { clearInterval(timer); if (held) { held = false; ctx.act({ hold: false }); } } };
};
