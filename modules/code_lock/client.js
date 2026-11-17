// @ts-nocheck
// Types: ./types.ts (CodeLockView, CodeLockMove).
// Code lock UI: only collects and sends the guess, checking happens on the server.
window.DuoTypes = window.DuoTypes || {};
window.DuoTypes.code_lock = (box, v, ctx) => {
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  let read;
  if (v.kind === 'text') {
    const i = mk('input', 'mod-input'); i.type = 'text'; i.autocomplete = 'off'; i.placeholder = v.placeholder || ''; i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); box.append(i); read = () => i.value;
  } else {
    const set = v.kind === 'digits' ? '0123456789' : (window.DuoStr?.t('alphabet') || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), vals = Array(v.n).fill(0), row = mk('div', 'mod-wheels');
    vals.forEach((_, i) => { const w = mk('div', 'mod-wheel'), s = mk('span', '', set[0]), b = (l, d) => { const x = mk('button', '', l); x.type = 'button'; x.onclick = () => { vals[i] = (vals[i] + d + set.length) % set.length; s.textContent = set[vals[i]]; }; return x; }; w.append(b('▲', -1), s, b('▼', 1)); row.append(w); });
    box.append(row); read = () => vals.map(x => set[x]).join('');
  }
  const btn = mk('button', 'mod-go', v.button); btn.type = 'button'; btn.onclick = () => go(); box.append(btn);
  async function go() { btn.disabled = true; try { await ctx.act({ guess: read() }); } finally { btn.disabled = false; } }
};
