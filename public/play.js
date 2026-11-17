// Player page: both players use the same one. Panels come from modules/ through public/modules.js.
const T = location.pathname.split('/').pop(), $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const api = (a, b) => fetch(`/api/p/${T}/${a}`, b === undefined ? {} : { method: 'POST', body: JSON.stringify(b) }).then(r => r.json());
let S, G, me, gal = [], cur = [], fresh = new Set(), noteTab = 'mine', notes = { mine: '', shared: '' };
const t = DuoStr.t, M = () => DuoStr.all.markers || {};
const IMG = id => `/g/${G.id}/images/${id}.jpg`, ICO = id => `/g/${G.id}/icons/${id}.png`, name = id => G.imageNames?.[id] || id.replace(/^i_/, '').replace(/_/g, ' ');

/** Splits narrator text into status, inventory, images and panels. While streaming it hides a half-written marker. */
function parse(text, live) {
  const st = [...text.matchAll(/```[a-z]*\n?([\s\S]*?)```/g)].pop(); const invRe = new RegExp(`^${M().inventory}:(.*)$`, 'gm'), lt = [...text.matchAll(invRe)].pop();
  let body = text.replace(/```[\s\S]*?(```|$)/g, '').replace(invRe, '');
  if (live) body = body.replace(/\[[^\]]*$/, '');
  const imgs = [...body.matchAll(/\[img:([a-z_0-9]+)\]/g)].map(m => m[1]);
  const inv = lt ? [...lt[1].matchAll(/\[i:([a-z_0-9]+)\|([^\]]+)\]/g)].map(m => ({ id: m[1], name: m[2] })) : null;
  const html = esc(body).replace(/\[img:([a-z_0-9]+)\][ \t]*\n?/g, (_, i) => `<button class="tmb" data-show="${i}" title="${esc(name(i))}"><img src="${IMG(i)}" alt="${esc(name(i))}"></button>`).replace(/\[i:[a-z_0-9]+\|([^\]]+)\]/g, '<b>$1</b>').replace(/\[panel:([a-z_0-9]+)\|([^\]]*)\]\n?/g, '<button class="pbtn" data-j="$1">🔧 $2</button>').replace(/\*/g, '').trim().replace(/\n{3,}/g, '\n\n');
  return { status: st ? st[1].trim() : null, inv, imgs, html };
}
/** A player's pass, as the server writes it from the pass marker. */
const passRe = () => new RegExp('^' + (M().pass || '').replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace('{name}', '.*') + '$');
function msgEl(m, live) {
  const e = document.createElement('div'); e.dataset.id = m.id ?? '';
  if (m.role === 'user') {
    const g = m.text.match(/^\(GAME: .*$/s), n = m.text.match(/^([^:\n]{1,24}): ([\s\S]*)$/);
    if (g) { if (/SOLVED/.test(m.text)) { e.className = 'm sys'; e.textContent = '✓ ' + m.text.replace(/^\(GAME: SOLVED, /, '').replace(/\).*$/, ''); } else e.hidden = true; }
    else if (/^\(OOC/.test(m.text)) e.hidden = true;
    else if (m.kind === 'notice' || passRe().test(m.text)) { e.className = 'm sys'; e.textContent = m.text.slice(1, -1); }
    else { e.className = 'm u'; e.innerHTML = n ? `<b>${esc(n[1])}</b> ${esc(n[2])}` : esc(m.text); }
    return e;
  }
  const p = parse(m.text, live); e.className = 'm n'; e.innerHTML = p.html; if (!p.html && !live) e.hidden = true;
  return e;
}
const log = $('#log'); let liveEl = null;
const atEnd = () => log.scrollHeight - log.scrollTop - log.clientHeight < 90;
function apply(m, isNew) {
  if (m.role !== 'assistant') return; const p = parse(m.text);
  if (p.status) { $('#chips').innerHTML = p.status.split('\n').map(l => l.split(' · ').filter(x => !(S.rooms && x.startsWith(M().place + ': '))).map(x => { const i = x.indexOf(': '); return i < 0 ? esc(x) : `<span>${esc(x.slice(0, i))}: <b>${esc(x.slice(i + 2))}</b></span>`; }).join('')).join(''); }
  if (p.inv) renderInv(p.inv);
  if (p.imgs.length) { for (const i of p.imgs) if (!gal.includes(i)) { gal.push(i); if (isNew) fresh.add(i); } cur = [...new Set(p.imgs)]; if (isNew || !S._init) { renderView(); } renderStrip(); }
}
let invList = [];
function renderInv(list) { invList = list.map(x => x.id); const b = $('#inventory'); b.innerHTML = `<span class="l">${esc(t('page.inventory'))}</span>` + list.map(x => `<button data-zoom="${esc(x.id)}" data-src="inv" title="${esc(x.name)}\n${esc(t('play.zoomHint'))}"><img src="${ICO(x.id)}" alt="${esc(x.name)}" onerror="this.src='${IMG(x.id)}'"></button>`).join(''); }
function renderView() {
  const v = $('#view'); v.querySelectorAll('figure,.empty').forEach(x => x.remove());
  if (!cur.length) { v.insertAdjacentHTML('beforeend', `<div class="empty">${esc(t('play.noImages'))}</div>`); v.style.gridTemplateColumns = '1fr'; return; }
  const n = cur.length, c = n <= 3 ? n : n === 4 ? 2 : 3; v.style.gridTemplateColumns = `repeat(${c},minmax(0,1fr))`; v.style.gridTemplateRows = `repeat(${Math.ceil(n / c)},minmax(0,1fr))`;
  for (const i of cur) { fresh.delete(i); v.insertAdjacentHTML('beforeend', `<figure data-zoom="${esc(i)}" title="${esc(name(i))}\n${esc(t('play.zoomHint'))}"><img src="${IMG(i)}" alt="${esc(name(i))}"><figcaption>${esc(name(i))}</figcaption></figure>`); }
  renderStrip();
}
function renderStrip() { $('#strip').innerHTML = gal.map(i => `<button data-show="${esc(i)}" class="${cur.includes(i) ? 'cur' : ''} ${fresh.has(i) ? 'new' : ''}" title="${esc(name(i))}"><img src="${IMG(i)}" alt="${esc(name(i))}"></button>`).join(''); const c = $('#strip .cur'); c?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
function page(d) { if (!gal.length) return; const a = gal.indexOf(cur[cur.length - 1]); cur = [gal[(a + d + gal.length) % gal.length]]; renderView(); }
/** Large view: page with arrows, wheel, side buttons or dragging; Esc or a click beside the image closes it. The list follows the source: gallery or inventory. */
function zoom(i, list) {
  document.getElementById('zoom')?.remove();
  const L = list?.length ? list : (gal.includes(i) ? gal : [i]); let n = Math.max(0, L.indexOf(i)), wheel = 0, sx = null;
  const d = document.createElement('div'); d.id = 'zoom'; d.tabIndex = -1; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', t('play.largeView'));
  d.innerHTML = `<button class="znav zp" aria-label="${esc(t('play.prev'))}">‹</button><img alt=""><button class="znav zn" aria-label="${esc(t('play.next'))}">›</button><div class="zcap"></div><button class="zx" aria-label="${esc(t('play.close'))}">✕</button>`;
  const im = d.querySelector('img'), cap = d.querySelector('.zcap');
  const show = () => { const k = L[n]; im.src = IMG(k); im.alt = name(k); cap.textContent = L.length > 1 ? `${n + 1} / ${L.length} · ${name(k)}` : name(k); for (const o of [L[n + 1], L[n - 1]]) if (o) new Image().src = IMG(o); d.querySelectorAll('.znav').forEach(b => b.hidden = L.length < 2); };
  const go = x => { n = (n + x + L.length) % L.length; show(); };
  const close = () => { d.remove(); document.removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1); else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1); else return; e.preventDefault(); e.stopPropagation(); };
  d.addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('.zp')) go(-1); else if (e.target.closest('.zn')) go(1); else if (e.target !== im) close(); });
  d.addEventListener('wheel', e => { e.preventDefault(); const t = Date.now(); if (t - wheel < 220) return; wheel = t; go(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1); }, { passive: false });
  d.addEventListener('pointerdown', e => { sx = e.clientX; }); d.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1); sx = null; });
  document.addEventListener('keydown', key, true); document.body.append(d); d.focus(); show();
}
let autoEnd = null, otherTyping = 0;
function setAuto() { autoEnd = S.autoIn != null ? Date.now() + S.autoIn : null; }
function roundLine() {
  const r = $('#round'), o = 1 - me, ow = G.players[o]; r.className = '';
  $('#passb').hidden = !!S.apart;
  if (S.writing && !S.writing.includes(me)) { r.textContent = t('play.partnerWriting'); return; }
  if (S.busy) { r.textContent = t('play.narratorWriting'); r.className = 'go'; return; }
  if (S.apart) { r.textContent = t('play.apart'); r.className = 'go'; return; }
  if (S.solo) { r.textContent = t('play.yourTurn'); return; }
  const left = autoEnd ? Math.max(0, Math.ceil((autoEnd - Date.now()) / 1000)) : null, uneven = S.pending[me] !== S.pending[o];
  if (!uneven) { r.textContent = Date.now() < otherTyping ? t('play.typing', { name: ow }) : t('play.writeBoth'); return; }
  const iam = !S.pending[me];   // I still have to move
  let line = iam ? t('play.otherMoved', { name: ow }) : t(Date.now() < otherTyping ? 'play.sentTyping' : 'play.sentWaiting', { name: ow });
  if (S.autoPaused) line += iam ? t('play.autoPausedMe') : t('play.autoPausedOther', { name: ow });
  else if (left !== null) { line += iam ? t('play.autoMe', { s: left }) : t('play.autoOther', { name: ow, s: left }); if (left <= 5) r.className = 'soon'; else if (iam) r.className = 'go'; }
  else if (iam) r.className = 'go';
  r.textContent = line;
}
setInterval(() => { if (S && G) roundLine(); }, 500);
let clockBase = 0, clockAt = 0;
function setClock() { clockBase = S.playMs || 0; clockAt = Date.now(); drawClock(); }
function drawClock() { const ms = clockBase + (S?.clockOn && !S.ended ? Date.now() - clockAt : 0), t = Math.floor(ms / 1000), p = n => String(n).padStart(2, '0'); const e = $('#clock'); e.textContent = `${Math.floor(t / 3600)}:${p(Math.floor(t / 60) % 60)}:${p(t % 60)}`; e.classList.toggle('ended', !!S?.ended); }
setInterval(() => { if (S) drawClock(); }, 1000);
function who() { const one = p => esc(G.players[p]) + (G.eras ? ` <span class="era">${esc(G.eras[p])}</span>` : '') + (S.rooms?.[p] ? `: <b>${esc(S.rooms[p])}</b>` : ''); $('#who').innerHTML = (S.solo ? one(me) : `${one(me)} · <span class="dot ${S.online?.[1 - me] ? 'on' : ''}"></span>${one(1 - me)}`)
  // a game in two eras played alone: one click to the other era's view
  + (S.switchTo && G.eras ? ` <a class="eraswitch" href="/p/${esc(S.switchTo)}">${esc(DuoStr.t('page.switchEra', { era: G.eras[1 - me] }))}</a>` : ''); }
async function load() {
  S = await api('state'); if (S.error) { document.body.textContent = S.error; return; } DuoStr.set(S.strings); DuoStr.apply(); G = S.game; me = S.player; if (G.ui?.layout) document.body.dataset.layout = G.ui.layout; if (G.hasTheme && !document.getElementById('theme')) document.head.insertAdjacentHTML('beforeend', `<link id="theme" rel="stylesheet" href="/g/${G.id}/theme.css">`); document.title = G.title; $('#title').textContent = G.title;
  $('#hgoal').textContent = G.goal || ''; $('#htext').textContent = G.help || ''; notes = S.notes; $('#note').value = notes[noteTab] || '';
  const button = (b, i) => `<button data-b="${i}" title="${esc(b.title)}">${esc(b.label)}</button>`, gs = (G.buttons || []).map((b, i) => [b, i]);
  $('#gb').innerHTML = gs.filter(([b]) => b.place !== 'help').map(([b, i]) => button(b, i)).join(''); $('#hbtns').innerHTML = gs.filter(([b]) => b.place === 'help').map(([b, i]) => button(b, i)).join('');
  log.innerHTML = ''; gal = []; cur = []; S._init = true; for (const m of S.messages) { log.append(msgEl(m)); apply(m, false); } S._init = false;
  cur = cur.slice(-1); renderView(); renderStrip(); setAuto(); setClock(); roundLine(); who(); const end = () => { log.scrollTop = log.scrollHeight; }; end(); document.fonts?.ready.then(end); setTimeout(end, 400);
}
function connect() {
  const es = new EventSource(`/api/p/${T}/events`);
  es.addEventListener('round', e => { Object.assign(S, JSON.parse(e.data)); setAuto(); setClock(); roundLine(); who(); });
  es.addEventListener('stream', e => { const d = JSON.parse(e.data), end = atEnd(); if (!liveEl) { liveEl = document.createElement('div'); log.append(liveEl); } liveEl.replaceWith(liveEl = msgEl({ role: 'assistant', text: d.text }, true)); if (end) log.scrollTop = log.scrollHeight; });
  es.addEventListener('msg', e => { const m = JSON.parse(e.data), end = atEnd() || m.role === 'assistant'; if (S.messages.some(x => x.id === m.id)) return; S.messages.push(m); if (m.role === 'assistant' && liveEl) { liveEl.remove(); liveEl = null; } log.append(msgEl(m)); apply(m, true); if (end) log.scrollTop = log.scrollHeight; });
  es.addEventListener('remove', e => { const { id } = JSON.parse(e.data); S.messages = S.messages.filter(m => m.id !== id); log.querySelector(`[data-id="${id}"]`)?.remove(); });
  es.addEventListener('error', e => { if (e.data) { const d = document.createElement('div'); d.className = 'm sys'; d.style.color = 'var(--err)'; d.textContent = t('play.error', { text: JSON.parse(e.data).text }); log.append(d); liveEl?.remove(); liveEl = null; } });
  es.addEventListener('mod', e => DuoModules.push(JSON.parse(e.data)));
  es.addEventListener('notes', e => { pendingShared = JSON.parse(e.data).shared; applyShared(); });
  es.addEventListener('typing', () => { otherTyping = Date.now() + 3000; roundLine(); });
  es.onopen = () => { if (S && S.messages) api('state').then(n => { if (n.error) return; pendingShared = n.notes.shared; applyShared(); if (n.messages.length !== S.messages.length) load(); }); };
}
/** Panels found so far: only those shown in a normal reply. No model call, so it cannot spoil anything. */
function foundPanels() {
  const out = new Map(); let prev = null;
  for (const m of S.messages) {
    if (m.role === 'assistant' && !(prev && /^\(OOC: show again/.test(prev.text))) for (const x of m.text.matchAll(/\[panel:([a-z_0-9]+)\|([^\]]*)\]/g)) out.set(x[1], x[2]);
    prev = m;
  }
  return [...out];
}
/** Solved but still open to retry: the game says until which message (panelRetryUntil). */
const panelOpenAgain = id => { const r = G.panelRetryUntil?.[id]; return !!r && !S.messages.some(m => m.role === 'user' && new RegExp(r).test(m.text)); };
const panelDone = id => { const r = G.panelDone?.[id]; return !!r && S.messages.some(m => m.role === 'user' && new RegExp(r).test(m.text)); };
function showGoto() {
  const l = S.travel?.[me] || [];
  $('#golist').innerHTML = l.length ? l.map(x => `<button class="pbtn" data-go="${esc(x.id)}">${esc(x.name)}</button>`).join('') : `<p>${esc(t('play.noRoutes'))}</p>`; $('#goto').showModal();
}
function showPanels() {
  const l = foundPanels().filter(([id]) => !(S.locked || []).includes(id)).map(([id, n]) => ({ id, n, done: panelDone(id), again: panelDone(id) && panelOpenAgain(id) })).sort((a, b) => a.done - b.done);
  $('#plist').innerHTML = l.length ? l.map(x => `<button class="pbtn${x.again ? ' again' : x.done ? ' done' : ''}" data-j="${esc(x.id)}" title="${esc(t(x.again ? 'play.panelAgain' : x.done ? 'play.panelDone' : 'play.panelOpen'))}">${x.done ? '✓' : '🔧'} ${esc(x.n)}${x.done ? ` <small>${esc(G.panelDoneLabel?.[x.id] || t('play.solvedLabel'))}</small>` : ''}</button>`).join('') : `<p>${esc(t('play.noPanels'))}</p>`; $('#panels').showModal();
}
function sendIt(pass) { const i = $('#in'), v = i.value.trim(); if (!v && !pass) return; api('say', { text: pass ? '' : v }); if (!pass) i.value = ''; }
document.addEventListener('click', e => {
  const t = e.target.closest('button,figure'); if (!t) return;
  if (t.dataset.show) { cur = [t.dataset.show]; renderView(); document.body.dataset.tab = 'stage'; }
  else if (t.dataset.zoom) zoom(t.dataset.zoom, t.dataset.src === 'inv' ? invList : gal);
  else if (t.dataset.go) { $('#goto').close(); api('go', { room: t.dataset.go }); }
  else if (t.dataset.j) { $('#panels').close(); if ((S.locked || []).includes(t.dataset.j)) { t.disabled = true; t.dataset.tip = DuoStr.t('play.lockedTip'); t.title = ''; const d = document.createElement('div'); d.className = 'm sys'; d.textContent = DuoStr.t('play.locked'); log.append(d); log.scrollTop = log.scrollHeight; } else if (G.modPanels?.includes(t.dataset.j)) DuoModules.open(t.dataset.j, api, p => `/g/${G.id}/${p}`); }
  else if (t.dataset.b) { const x = G.buttons[t.dataset.b]; if (x.place === 'help') $('#help').close(); if (x.local === 'panels') showPanels(); else api('message', { text: x.message }); }
  else if (t.dataset.t) document.body.dataset.tab = t.dataset.t;
});
$('#gotob').onclick = showGoto; $('#sendb').onclick = () => sendIt(); $('#passb').onclick = () => sendIt(true); $('#prev').onclick = () => page(-1); $('#next').onclick = () => page(1); $('#helpb').onclick = () => $('#help').showModal();
$('#in').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendIt(); } });
let tyT = 0; $('#in').addEventListener('input', () => { if (Date.now() - tyT > 2000) { tyT = Date.now(); api('typing', {}); } });
document.addEventListener('keydown', e => { if (/TEXTAREA|INPUT/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowLeft') page(-1); if (e.key === 'ArrowRight') page(1); });
function tab(t) { noteTab = t; if (t === 'shared') applyShared(); $('#note').value = notes[t] || ''; $('#tmine').classList.toggle('cur', t === 'mine'); $('#tshared').classList.toggle('cur', t === 'shared'); $('#notebook').classList.remove('collapsed'); $('#tcoll').textContent = DuoStr.t('page.collapse'); }
$('#tmine').onclick = () => tab('mine'); $('#tshared').onclick = () => tab('shared'); $('#tcoll').onclick = () => { const z = $('#notebook').classList.toggle('collapsed'); $('#tcoll').textContent = DuoStr.t(z ? 'page.expand' : 'page.collapse'); };
// shared note: the partner's edit shows at once and the cursor stays put; while you are typing it waits for a pause
let nt, lastType = 0, pendingShared = null, sharedTimer = 0;
function applyShared() {
  if (pendingShared === null) return; const n = $('#note'), wait = 1200 - (Date.now() - lastType);
  if (noteTab === 'shared' && document.activeElement === n && wait > 0) { clearTimeout(sharedTimer); sharedTimer = setTimeout(applyShared, wait + 50); return; }
  notes.shared = pendingShared; pendingShared = null;
  if (noteTab === 'shared' && n.value !== notes.shared) { const a = n.selectionStart, b = n.selectionEnd; n.value = notes.shared; if (document.activeElement === n) n.setSelectionRange(a, b); $('#saved').textContent = DuoStr.t('play.partnerEdited', { name: G.players[1 - me] }); }
}
$('#note').addEventListener('input', () => { lastType = Date.now(); notes[noteTab] = $('#note').value; pendingShared = noteTab === 'shared' ? null : pendingShared; $('#saved').textContent = DuoStr.t('play.saving'); clearTimeout(nt); const t = noteTab; nt = setTimeout(async () => { await api('notes', { [t]: notes[t] }); $('#saved').textContent = DuoStr.t('play.saved'); }, t === 'shared' ? 250 : 500); });
// while a panel is open the other player gets no auto-pass
new MutationObserver(() => { const o = !!document.getElementById('mod_modal'); if (o !== window._po) { window._po = o; api('panel', { open: o }); } }).observe(document.body, { childList: true });
load().then(connect);
