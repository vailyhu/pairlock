// @ts-check
// Knocking UI: a wall panel that trembles and a dot that flashes on every knock, the pairs heard so far as numbers, a listen button. Timing runs on the server; there is no sound.
/** @typedef {import('./types.ts').KnockingView} View */
/** @typedef {import('./types.ts').KnockingMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.knocking = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  if (!document.getElementById('knocking-style')) {
    const s = mk('style'); s.id = 'knocking-style';
    s.textContent = '@keyframes knocking-shake{0%,100%{transform:translate(0,0)}20%{transform:translate(-4px,1px)}40%{transform:translate(4px,-1px)}60%{transform:translate(-3px,0)}80%{transform:translate(2px,1px)}}'
      + '.knocking-wall{position:relative;height:120px;margin:10px auto;max-width:360px;border-radius:var(--radius);border:1px solid var(--line);background:repeating-linear-gradient(90deg,var(--panel2) 0 46px,var(--line) 46px 48px)}'
      + '.knocking-wall.hit{animation:knocking-shake .22s linear}'
      + '.knocking-dot{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:var(--panel);border:2px solid var(--line);transition:background .08s,box-shadow .08s}'
      + '.knocking-wall.hit .knocking-dot{background:var(--accent);box-shadow:0 0 24px var(--accent)}';
    document.head.append(s);
  }
  const rows = mk('div'), silence = mk('p', 'mod-info'), btn = /** @type {HTMLButtonElement} */ (mk('button', 'mod-hold')); btn.type = 'button';
  btn.onclick = () => ctx.act({ listen: true });
  box.append(silence, rows, btn);
  /** @type {Record<string, {wall: HTMLElement, trace: HTMLElement, knocks: number, t: number}>} */
  const ui = {};
  /** @param {[number, number]} p */ const pair = p => `${p[0]}-${p[1]}`;
  /** @param {View} v */
  function render(v) {
    const T = v.texts;
    silence.textContent = v.channels.length ? '' : T.silence; silence.hidden = !!v.channels.length; btn.hidden = !v.channels.length;
    for (const k of Object.keys(ui)) if (!v.channels.some(c => c.side === k)) { ui[k].wall.remove(); ui[k].trace.remove(); clearTimeout(ui[k].t); delete ui[k]; }
    for (const c of v.channels) {
      let u = ui[c.side];
      if (!u) { const wall = mk('div', 'knocking-wall'); wall.append(mk('div', 'knocking-dot')); const trace = mk('div', 'mod-trace'); rows.append(wall, trace); u = ui[c.side] = { wall, trace, knocks: c.knocks, t: 0 }; }
      if (c.knocks > u.knocks && c.playing) { const w = u.wall; w.classList.remove('hit'); void w.offsetWidth; w.classList.add('hit'); clearTimeout(u.t); u.t = window.setTimeout(() => w.classList.remove('hit'), Math.min(300, v.knockMs * .6)); }
      u.knocks = c.knocks;
      const parts = c.heard.map(pair); if (c.current) parts.push(c.current[1] ? pair(c.current) : `${c.current[0]}-…`);
      u.trace.textContent = parts.length ? `${T.heard} ${parts.join(' · ')}` : '';
    }
    const any = v.channels.some(c => c.playing || c.heard.length || c.current);
    btn.textContent = any ? `↻ ${T.again}` : `👂 ${T.listen}`;
  }
  render(first);
  return { update: render, destroy: () => { for (const u of Object.values(ui)) clearTimeout(u.t); } };
};
