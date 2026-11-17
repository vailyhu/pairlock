// Shared frame for module panels: window, side picker, speaking tube, hints, messages. Each module draws itself; every decision is on the server. Contract: modules/CLAUDE.md.
window.DuoModules = (() => {
  // The frame's player-facing text comes from locales/<lang>.json (section ui.frame), through public/strings.js.
  const STR = k => DuoStr.t('frame.' + k), fmtS = (k, v) => DuoStr.t('frame.' + k, v);
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  let cur = null;
  function close() { const c = cur; cur = null; c?.inst?.destroy?.(); document.getElementById('mod_modal')?.remove(); }
  const script = type => new Promise((ok, no) => { if (window.DuoTypes?.[type]) return ok(); const s = mk('script'); s.src = `/modules/${type}/client.js?v=${Date.now()}`; s.onload = ok; s.onerror = no; document.head.append(s); });
  async function open(id, api, img) {
    close(); const v = await api('mod', { id, move: { open: true } }); if (v.error) return note(v.error); await script(v.type);
    const m = mk('div', 'mod'); m.id = 'mod_modal'; m.addEventListener('mousedown', e => { if (e.target === m) close(); });
    const box = mk('div', 'box'), x = mk('button', 'x', '✕'); x.type = 'button'; x.setAttribute('aria-label', STR('close')); x.onclick = close; box.append(x, mk('h3', '', v.title)); if (v.intro) box.append(mk('p', '', v.intro));
    const side = mk('div'), body = mk('div'), msg = mk('div', 'mod-msg'), hints = mk('div'), tube = mk('div'); msg.setAttribute('aria-live', 'polite'); box.append(side, body, msg, hints, tube); m.append(box); document.body.append(m);
    const c = cur = { id, api, side, body, msg, hints, tube, inst: null, lastSide: undefined, type: v.type, wasSolved: v.solved, ctx: null };
    c.ctx = { img, act: async move => { const o = await api('mod', { id, move }); if (cur !== c) return o; if (o.error) { say(c, 'bad', o.error); return o; } if (o.text) say(c, o.justSolved || o.close ? 'ok' : 'bad', o.text); draw(c, o); return o; } };
    draw(c, v);
  }
  const say = (c, cls, t) => { c.msg.className = `mod-msg ${cls}`; c.msg.textContent = t; };
  function draw(c, v) {
    if (c.body.dataset.done) return;
    if (v.closed) { c.body.dataset.done = '1'; c.inst?.destroy?.(); c.inst = null; c.body.innerHTML = ''; c.side.innerHTML = ''; c.hints.innerHTML = ''; c.tube.innerHTML = ''; say(c, 'ok', v.closed); return; }
    if (v.close) { c.body.dataset.done = '1'; setTimeout(() => { if (cur === c) close(); }, 1100); }
    // a panel that stays a speaking tube after solving (talkAfterSolved): result text and the tube, no closing
    if (v.solved && v.talk) { c.inst?.destroy?.(); c.inst = null; c.body.innerHTML = ''; c.side.innerHTML = ''; c.hints.innerHTML = ''; say(c, 'ok', v.doneText || STR('solved')); drawTube(c, v); return; }
    // a panel that stays usable to look at after solving (keepAfterSolved, e.g. the UV marks): result text, the module keeps drawing, no closing
    if (v.solved && v.keep) { if (!c.msg.textContent) say(c, 'ok', v.doneText || STR('solved')); if (!c.inst && v.view) { c.body.innerHTML = ''; c.inst = window.DuoTypes[v.type](c.body, v.view, c.ctx) || {}; } else if (v.view) c.inst?.update?.(v.view); return; }
    if (v.solved) { c.body.dataset.done = '1'; c.inst?.destroy?.(); c.inst = null; c.body.innerHTML = ''; c.side.innerHTML = ''; c.hints.innerHTML = ''; c.tube.innerHTML = ''; if (!c.msg.textContent) say(c, 'ok', v.doneText || STR('solved')); if (!c.wasSolved) setTimeout(() => { if (cur === c) close(); }, 1100); return; }
    if (v.side !== c.lastSide) { c.lastSide = v.side; c.inst?.destroy?.(); c.inst = null; c.body.innerHTML = ''; if (v.view) c.inst = window.DuoTypes[v.type](c.body, v.view, c.ctx) || {}; }
    else if (v.view) c.inst?.update?.(v.view);
    drawSide(c, v); drawHints(c, v); drawTube(c, v);
  }
  function drawSide(c, v) {
    c.side.innerHTML = ''; if (!v.sides) return;
    if (!v.side) { if (v.fixedSide) return; c.side.append(mk('p', '', STR('pickSide'))); for (const s of ['a', 'b']) { const b = mk('button', 'mod-go', v.sides[s] || STR(s === 'a' ? 'sideA' : 'sideB')); b.type = 'button'; b.onclick = () => c.ctx.act({ side: s }); c.side.append(b); } return; }
    if (v.fixedSide) { if (v.sides[v.side]) c.side.append(mk('p', 'mod-info', v.sides[v.side])); return; }
    if (v.otherSide === v.side) c.side.append(mk('p', 'mod-warn', STR('sameSide'))); else if (!v.otherSide) c.side.append(mk('p', 'mod-warn', STR('noPartner')));
    if (v.fixedSide) return;
    const b = mk('button', 'mod-small', STR('otherSide')); b.type = 'button'; b.onclick = () => c.ctx.act({ side: null }); c.side.append(b);
  }
  function drawHints(c, v) {
    c.hints.innerHTML = ''; v.hints.forEach((t, i) => c.hints.append(mk('div', 'mod-hint', fmtS('hint', { n: i + 1 }) + t)));
    if (v.hintsLeft > 0) { const b = mk('button', 'mod-hintb', (v.hintCost ? fmtS('askHintCost', { cost: v.hintCost }) : STR('askHint'))); b.type = 'button'; b.onclick = async () => { b.disabled = true; const o = await c.api('mod', { id: c.id, move: { hint: true } }); if (cur === c) draw(c, o); }; c.hints.append(b); }
  }
  function drawTube(c, v) {
    if (!v.tube) { c.tube.innerHTML = ''; return; }
    let list = c.tube.querySelector('.mod-tube'); if (!list) { c.tube.append(mk('p', 'mod-info', STR('tube'))); list = mk('div', 'mod-tube'); const i = mk('input', 'mod-input'); i.type = 'text'; i.placeholder = STR('tubeInput'); i.addEventListener('keydown', e => { if (e.key === 'Enter' && i.value.trim()) { c.ctx.act({ line: i.value }); i.value = ''; } }); c.tube.append(list, i); }
    list.innerHTML = ''; v.tube.forEach(([w, t]) => list.append(mk('div', '', `${STR(w)}: ${t}`))); list.scrollTop = 1e6;
  }
  /** Update pushed by the server: the view of the open panel. */
  function push(v) { if (cur && cur.id === v.id) draw(cur, v); }
  function note(t) { const d = mk('div', 'm sys', t), l = document.getElementById('log'); l.append(d); l.scrollTop = l.scrollHeight; }
  return { open, push };
})();
