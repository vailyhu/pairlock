// @ts-nocheck
// Types: ./types.ts (MorseView, MorseMove).
// Morse UI: the lever and the lamp. Timing runs on the server, this only displays it.
window.DuoTypes = window.DuoTypes || {};
window.DuoTypes.morse = (box, first, ctx) => {
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  let held = false, btn, lamp, inf, trace;
  const set = v => { if (v === held) return; held = v; btn?.classList.toggle('sel', v); ctx.act({ hold: v }); };
  if (first.canHold) {
    box.append(mk('p', '', first.textA)); btn = mk('button', 'mod-hold', first.holdLabel); btn.type = 'button'; btn.style.touchAction = 'none';
    btn.addEventListener('pointerdown', e => { btn.setPointerCapture?.(e.pointerId); set(true); }); btn.addEventListener('pointerup', () => set(false)); btn.addEventListener('pointercancel', () => set(false)); box.append(btn);
  }
  if (first.canSee) {
    box.append(mk('p', '', first.textB)); lamp = mk('div', 'mod-lamp'); inf = mk('p', 'mod-info'); trace = mk('div', 'mod-trace'); trace.setAttribute('aria-label', first.traceLabel || ''); box.append(lamp, inf, trace);
  }
  const inp = mk('input', 'mod-input'); inp.type = 'text'; inp.autocomplete = 'off'; inp.placeholder = first.guessLabel; const go = mk('button', 'mod-go', first.button); go.type = 'button';
  const send = () => ctx.act({ guess: inp.value }); go.onclick = send; inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); }); box.append(inp, go);
  const update = v => { if (!lamp) return; lamp.classList.toggle('on', !!v.on); inf.textContent = v.run ? v.runText : v.idleText; trace.textContent = v.trace || ''; };
  update(first);
  return { update, destroy: () => { if (held) { held = false; ctx.act({ hold: false }); } } };
};
