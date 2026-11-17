// @ts-check
// Darkroom UI: the light switches, the trays (in / out), an in-game minute clock while the plate lies in a tray, and the plate itself, fading in while it develops. Timing is measured on the server.
/** @typedef {import('./types.ts').DarkroomView} View */
/** @typedef {import('./types.ts').DarkroomMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.darkroom = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const root = mk('div'); box.append(root);
  let cur = first, t0 = Date.now(), tick = 0;
  /** @param {string} label @param {Move} move @param {boolean} [sel] */
  const btn = (label, move, sel) => { const b = /** @type {HTMLButtonElement} */ (mk('button', 'mod-pick' + (sel ? ' sel' : ''), label)); b.type = 'button'; b.style.cssText = 'padding:10px 14px;font-size:15px'; b.onclick = () => ctx.act(move); return b; };
  function minutes() { return cur.inTray ? (cur.elapsed + Date.now() - t0) / 1000 / cur.secondsPerMinute : 0; }
  /** @param {View} v */
  function render(v) {
    cur = v; t0 = Date.now(); root.innerHTML = '';
    const lights = mk('div'); lights.style.textAlign = 'center';
    lights.append(btn('💡 ' + v.texts.white, { light: 'white' }, v.light === 'white'), btn('🔴 ' + v.texts.red, { light: 'red' }, v.light === 'red'), btn('⚫ ' + v.texts.off, { light: 'off' }, v.light === 'off'));
    const plate = mk('div'); plate.style.cssText = `position:relative;width:min(340px,90%);aspect-ratio:4/3;margin:10px auto;border-radius:4px;overflow:hidden;background:${v.fogged ? '#2a2a2a' : '#d8d4c8'}`;
    const img = new Image(); img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s';
    if (v.result && !v.fogged) { img.src = ctx.img?.(v.result) ?? v.result; plate.append(img); }
    const tint = mk('div'); tint.style.cssText = `position:absolute;inset:0;pointer-events:none;background:${v.light === 'red' ? 'rgba(170,0,0,.45)' : v.light === 'off' ? 'rgba(0,0,0,.7)' : 'transparent'}`;
    plate.append(tint);
    const clock = mk('p', 'mod-trace');
    const trays = mk('div'); trays.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center';
    v.trays.forEach((t, i) => {
      const card = mk('div'); card.style.cssText = `border:1px solid var(--line);border-radius:var(--radius);padding:6px 10px;text-align:center;min-width:110px;${i < v.done ? 'opacity:.55' : ''}`;
      card.append(mk('div', '', t.name));
      if (v.inTray === t.id) card.append(btn(v.texts.lift, { lift: true }, true)); else card.append(btn(v.texts.dip, { dip: t.id }));
      trays.append(card);
    });
    const reset = /** @type {HTMLButtonElement} */ (mk('button', 'mod-small', v.texts.reset)); reset.type = 'button'; reset.onclick = () => ctx.act({ reset: true });
    root.append(lights, plate, clock, trays, reset);
    clearInterval(tick);
    const upd = () => {
      clock.textContent = v.inTray ? v.texts.minutes.replace('{m}', minutes().toFixed(1)) : '';
      const dev = v.result ? (v.done > 0 ? 1 : v.fade ? Math.min(1, minutes() * v.secondsPerMinute / v.fade) : 0) : 0;
      img.style.opacity = String(dev);
    };
    upd(); if (v.inTray) tick = window.setInterval(upd, 200);
  }
  render(first);
  return { update: render, destroy() { clearInterval(tick); } };
};
