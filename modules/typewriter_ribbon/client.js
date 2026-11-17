// @ts-check
// Typewriter ribbon UI: a dark band with the struck letters (mirrored until "mirror" is on), paging along the ribbon, and an answer box. Checking happens on the server.
/** @typedef {import('./types.ts').TypewriterRibbonView} View */
/** @typedef {import('./types.ts').TypewriterRibbonMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.typewriter_ribbon = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const root = mk('div'); box.append(root);
  const band = /** @type {HTMLCanvasElement} */ (mk('canvas')); band.width = 1100; band.height = 220;
  band.style.cssText = 'display:block;width:100%;max-width:820px;margin:8px auto;border-radius:var(--radius);background:#121212';
  const nav = mk('div', 'mod-uvnav'), back = /** @type {HTMLButtonElement} */ (mk('button', '', '◀')), page = mk('span'), next = /** @type {HTMLButtonElement} */ (mk('button', '', '▶'));
  const mirror = /** @type {HTMLButtonElement} */ (mk('button', 'mod-pick')); [back, next, mirror].forEach(b => { b.type = 'button'; });
  back.onclick = () => ctx.act({ scroll: -1 }); next.onclick = () => ctx.act({ scroll: 1 });
  nav.append(back, page, next, mirror);
  const help = mk('p', 'mod-info'), plain = mk('p', 'mod-trace'), label = mk('p', 'mod-info');
  const input = /** @type {HTMLInputElement} */ (mk('input', 'mod-input')); input.type = 'text'; input.autocomplete = 'off';
  const go = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go')); go.type = 'button';
  const send = async () => { if (!input.value.trim()) return; go.disabled = true; try { await ctx.act({ answer: input.value }); } finally { go.disabled = false; } };
  go.onclick = send; input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  root.append(help, band, nav, plain, label, input, go);
  /** @type {HTMLImageElement | null} */ let bg = null, bgSrc = '';
  /** @type {View} */ let cur = first;
  function draw() {
    const g = band.getContext('2d'); if (!g) return; const W = band.width, H = band.height;
    g.clearRect(0, 0, W, H);
    if (bg && bg.complete && bg.naturalWidth) { g.globalAlpha = .35; g.drawImage(bg, 0, (bg.naturalHeight - bg.naturalWidth * H / W) / 2, bg.naturalWidth, bg.naturalWidth * H / W, 0, 0, W, H); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(10,10,10,.55)'; g.fillRect(0, H * .12, W, H * .76);
    g.font = '600 46px "Courier New", Courier, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const c of cur.glyphs) {
      g.save(); g.translate(c.x * W, c.y * H); g.rotate(c.r * Math.PI / 180); if (!cur.mirror) g.scale(-1, 1);
      g.fillStyle = `rgba(200,195,180,${c.a})`; g.fillText(c.c, 0, 0); g.restore();
    }
  }
  /** @param {View} v */
  function render(v) {
    cur = v;
    if (v.image && v.image !== bgSrc) { bgSrc = v.image; bg = new Image(); bg.onload = draw; bg.src = ctx.img?.(v.image) ?? v.image; }
    help.textContent = v.help || ''; help.hidden = !v.help;
    page.textContent = `${v.page} / ${v.pages}`; back.disabled = v.page <= 1; next.disabled = v.page >= v.pages;
    mirror.textContent = v.mirrorLabel || '⇋'; mirror.classList.toggle('sel', v.mirror); mirror.onclick = () => ctx.act({ mirror: !v.mirror });
    if (v.backLabel) back.textContent = v.backLabel; if (v.nextLabel) next.textContent = v.nextLabel;
    plain.textContent = v.plain || ''; plain.hidden = !v.plain;
    label.textContent = v.answerLabel; go.textContent = v.answerButton || '✓';
    [label, input, go].forEach(e => { e.hidden = !!v.plain; });
    draw();
  }
  render(first);
  return { update: render };
};
