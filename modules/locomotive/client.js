// @ts-check
// Locomotive UI: big buttons for this player's levers, the partner's levers read-only, the segment and the speed, ready flags and "go". Evaluation happens on the server.
/** @typedef {import('./types.ts').LocomotiveView} View */
/** @typedef {import('./types.ts').LocomotiveMove} Move */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.locomotive = (box, first, ctx) => {
  /** @param {string} t @param {string} [c] @param {string} [x] */
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const root = mk('div'); box.append(root);
  /** @param {string} t @param {Record<string, string | number>} vars */
  const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
  /** @param {View} v */
  function render(v) {
    root.innerHTML = '';
    const head = mk('p', 'mod-trace', v.done ? v.texts.stopped : fill(v.texts.segment, { n: v.segment, of: v.segments, km: v.km }));
    const speed = mk('p', 'mod-info', fill(v.texts.speed || '{speed} km/h', { speed: v.speed }));
    root.append(head, speed);
    for (const c of v.controls) {
      if (!c.mine && !v.texts.partner) continue;
      const row = mk('div'); row.style.cssText = 'margin:8px 0;text-align:center';
      row.append(mk('div', 'mod-info', c.label + (c.mine ? '' : ` (${v.texts.partner})`)));
      for (const [val, lab] of c.values) {
        const b = /** @type {HTMLButtonElement} */ (mk('button', 'mod-pick', lab)); b.type = 'button'; b.style.cssText = 'padding:12px 16px;font-size:16px';
        b.classList.toggle('sel', c.value === val); b.disabled = !c.mine || v.done;
        b.onclick = () => ctx.act({ set: { control: c.id, value: val } });
        row.append(b);
      }
      root.append(row);
    }
    if (v.last) root.append(mk('p', v.last.ok ? 'mod-msg ok' : 'mod-msg bad', v.last.text));
    if (v.done) return;
    const both = v.mySide === 'both', me = v.mySide === 'b' ? 'b' : 'a', meReady = both ? v.ready.a && v.ready.b : v.ready[me], other = both ? true : v.ready[me === 'a' ? 'b' : 'a'];
    if (!both) {
      const r = /** @type {HTMLButtonElement} */ (mk('button', 'mod-hold' + (meReady ? ' sel' : ''), v.texts.ready)); r.type = 'button';
      r.onclick = () => ctx.act({ ready: !meReady }); root.append(r);
      if (meReady && !other) root.append(mk('p', 'mod-info', v.texts.waiting));
    }
    const go = /** @type {HTMLButtonElement} */ (mk('button', 'mod-go', v.texts.go)); go.type = 'button'; go.style.cssText = 'padding:14px 28px;font-size:18px';
    go.disabled = !both && !(meReady && other);
    go.onclick = async () => { go.disabled = true; try { await ctx.act({ go: true }); } finally { go.disabled = false; } };
    root.append(go);
  }
  render(first);
  return { update: render };
};
