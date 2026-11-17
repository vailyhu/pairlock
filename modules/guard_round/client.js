// @ts-check
// Guard round UI: the watcher (a) sees the round of stations, on a picture or as a row, with the lamp where the guard is now; the worker (b) sees a clock and the work steps as buttons. Alone without places: both.
/** @typedef {import('./types.ts').GuardRoundView} View */
/** @typedef {import('./types.ts').GuardRoundMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.guard_round = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  if (!document.getElementById('guard-round-style')) {
    const s = mk('style'); s.id = 'guard-round-style';
    s.textContent = '.gr-map{position:relative;margin:8px auto;max-width:640px}.gr-map img{display:block;width:100%;border-radius:var(--radius)}'
      + '.gr-st{position:absolute;transform:translate(-50%,-50%);padding:2px 6px;border-radius:var(--radius);background:var(--panel);border:1px solid var(--line);font-size:12px;white-space:nowrap;transition:box-shadow .3s,background .3s}'
      + '.gr-row{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0}.gr-row .gr-st{position:static;transform:none;font-size:14px;padding:6px 10px}'
      + '.gr-st.danger{border-color:var(--err);border-style:dashed}.gr-st.on{background:var(--accent);color:var(--bg);box-shadow:0 0 22px var(--accent)}'
      + '.gr-clock{font:600 34px var(--ui);text-align:center;letter-spacing:2px;margin:6px 0}.gr-steps{display:flex;flex-direction:column;gap:6px;align-items:center;margin:8px 0}'
      + '.gr-steps button{min-width:220px}.gr-steps button.done{opacity:.55;text-decoration:line-through}';
    document.head.append(s);
  }
  if (first.side === null) { box.append(mk('p', 'mod-info', first.awayText || '')); return; }
  const watch = mk('div'), work = mk('div'), status = mk('p', 'mod-info');
  box.append(watch, work, status);
  /** @type {HTMLElement[]} */ let dots = [];
  if (first.watch) {
    const w = first.watch; if (w.text) watch.append(mk('p', 'mod-info', w.text));
    const pic = !!w.background && w.stations.every(s => typeof s.x === 'number' && typeof s.y === 'number');
    const holder = mk('div', pic ? 'gr-map' : 'gr-row');
    if (pic && w.background) { const img = new Image(); img.src = ctx.img?.(w.background) ?? w.background; img.alt = ''; img.draggable = false; holder.append(img); }
    dots = w.stations.map(s => { const d = mk('span', 'gr-st' + (s.danger ? ' danger' : ''), s.label); if (pic) { d.style.left = `${(s.x || 0) * 100}%`; d.style.top = `${(s.y || 0) * 100}%`; } holder.append(d); return d; });
    watch.append(holder);
  }
  const clock = mk('div', 'gr-clock'), steps = mk('div', 'gr-steps');
  if (first.work) { if (first.work.text) work.append(mk('p', 'mod-info', first.work.text)); work.append(clock, steps); }
  let asked = false;
  /** @param {View} v */
  function update(v) {
    // the guard walks while the panel is open; after a pause (someone left) ask once to start him again
    if (!v.running && !asked) { asked = true; ctx.act({ watch: true }); } else if (v.running) asked = false;
    if (v.watch) dots.forEach((d, i) => d.classList.toggle('on', i === v.watch?.at));
    if (v.work) {
      const W = v.work; clock.textContent = W.clock || ''; clock.hidden = !W.clock;
      steps.innerHTML = '';
      W.steps.forEach((label, i) => {
        const b = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go' + (i < W.done ? ' done' : ''), label)); b.type = 'button';
        b.disabled = i !== W.done; b.onclick = () => ctx.act({ step: i }); steps.append(b);
      });
    }
    status.textContent = v.last || '';
  }
  update(first);
  return { update };
};
