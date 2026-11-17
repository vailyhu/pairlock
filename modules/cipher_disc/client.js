// @ts-check
// Cipher disc UI: the two rings drawn as two rows (the inner row shifted by the rotation), turn buttons, the secret signs and how they read now, and a "read" button.
/** @typedef {import('./types.ts').CipherDiscView} View */
/** @typedef {import('./types.ts').CipherDiscMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.cipher_disc = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const root = mk('div'); box.append(root);
  /** @param {View} v */
  function render(v) {
    root.innerHTML = '';
    const N = v.outer.length, disc = mk('div'); disc.style.cssText = 'position:relative;width:min(360px,92vw);aspect-ratio:1;margin:8px auto;border-radius:50%;background:radial-gradient(circle,#c9a35a 0 30%,#8a6a2e 31% 33%,#b8924a 34% 60%,#8a6a2e 61% 63%,#d1ad62 64% 100%);box-shadow:inset 0 0 18px #0008';
    for (let k = 0; k < N; k++) {
      const a = (k / N) * 2 * Math.PI - Math.PI / 2;
      const put = (/** @type {string} */ t, /** @type {number} */ r, /** @type {string} */ css) => { const e = mk('span', '', t); e.style.cssText = `position:absolute;left:${50 + r * Math.cos(a)}%;top:${50 + r * Math.sin(a)}%;transform:translate(-50%,-50%) rotate(${a + Math.PI / 2}rad);${css}`; disc.append(e); };
      put(v.outer[k], 43, 'font:700 15px var(--serif);color:#3a2a10');
      put(v.inner[(k + v.rot) % N], 29, 'font-size:16px');   // inner sign sitting above outer letter k
    }
    const pin = mk('div'); pin.style.cssText = 'position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px;border-radius:50%;background:#e8d18f;box-shadow:0 0 4px #0009'; disc.append(pin);
    const turn = mk('div'); turn.style.cssText = 'display:flex;gap:10px;justify-content:center';
    for (const [lab, d] of /** @type {[string, number][]} */ ([[v.texts.left, -1], [v.texts.right, 1]])) { const b = /** @type {HTMLButtonElement} */ (mk('button', 'mod-pick', lab)); b.type = 'button'; b.style.cssText = 'padding:10px 18px;font-size:20px'; b.disabled = !!v.plain; b.onclick = () => ctx.act({ rotate: d }); turn.append(b); }
    const signs = mk('p'); signs.style.cssText = 'text-align:center;font-size:20px;line-height:1.6;word-break:break-all'; signs.textContent = v.cipher.map(c => c === ' ' ? '\u2003\u2003' : c).join('');   // wide gaps between words
    root.append(disc, turn, signs);
    if (v.plain) { root.append(mk('p', 'mod-info', v.texts.solved), mk('p', 'mod-trace', v.plain)); return; }
    root.append(mk('p', 'mod-info', v.texts.reading), mk('p', 'mod-trace', v.reading));
    if (v.texts.read) { const r = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', v.texts.read)); r.type = 'button'; r.onclick = () => ctx.act({ read: true }); root.append(r); }
  }
  render(first);
  return { update: render };
};
