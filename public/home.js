// Home page: each game with "new game" (a dialog asks for the names) and "resume" (a dialog lists the saves with their player links, copy, regenerate and delete).
const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const J = (u, o) => fetch(u, o).then(r => r.json()), t = DuoStr.t;
document.documentElement.style.height = 'auto'; document.body.style.height = 'auto';
let G = [], R = [], fresh = null, resGame = null, newGame = null; const open = new Set(), V = {}, errors = {};
const duration = m => { const s = Math.floor((m || 0) / 1000), p = n => String(n).padStart(2, '0'); return `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`; };
const val = (g, k, d) => V[g]?.[k] ?? d;
const when = x => x ? new Date(x).toLocaleString(DuoStr.all.dateLocale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
let base = location.origin; const url = tok => `${base}/p/${tok}`;
function runCard(x) {
  const isNew = x.id === fresh;
  const meta = [when(x.updated || x.created), t('home.rounds', { n: x.rounds }), duration(x.playMs), x.ended && t('home.ended'), x.where && esc(x.where), x.solo && t('home.solo'), x.busy && t('home.busy')].filter(Boolean).join(' · ');
  return `<details class="run" ${isNew || open.has(x.id) ? 'open' : ''} data-run="${esc(x.id)}"><summary><b>${esc(t(isNew && !x.label ? 'home.newGame' : 'home.resume'))}</b> · ${esc(t('home.playerNames', { a: x.players[0], b: x.players[1] }))}${x.label ? ` · ${esc(x.label)}` : ''} <span class="meta">${meta}</span></summary>
<div class="links">${x.players.map((p, i) => `<div class="lnk"><span class="dot ${x.online[i] ? 'on' : ''}" title="${esc(t(x.online[i] ? 'home.online' : 'home.offline'))}"></span><b>${esc(p)}</b><a href="/p/${x.tokens[i]}" target="_blank">${esc(t('home.open'))}</a><button data-copy="${url(x.tokens[i])}">${esc(t('home.copyLink'))}</button><code>${esc(url(x.tokens[i]))}</code></div>`).join('')}</div>
<div class="row"><button data-regen="${esc(x.id)}" title="${esc(t('home.regenTitle'))}">${esc(t('home.regen'))}</button><button data-branch="${esc(x.id)}" title="${esc(t('home.branchTitle'))}">${esc(t('home.branch'))}</button><button class="dng" data-del="${esc(x.id)}" title="${esc(t('home.deleteTitle'))}">${esc(t('home.delete'))}</button></div></details>`;
}
/** A game's content warning (game.json contentWarning), on its card and before starting it. */
const warnOf = g => g.contentWarning ? `<p class="cwarn"><b>⚠ ${esc(t('home.contentWarning'))}</b> ${esc(g.contentWarning)}</p>` : '';
const runsOf = id => R.filter(r => r.game === id).sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
function draw() {
  $('#games').innerHTML = G.map(g => {
    const n = runsOf(g.id).length;
    return `<article class="card">${g.cover ? `<img class="cover" src="${esc(g.cover)}" alt="">` : ''}<h3 class="${g.cover ? 'sr' : ''}">${esc(g.title)}</h3>${warnOf(g)}<p>${esc(g.description)}</p><p class="goal"><b>${esc(t('home.goal'))}</b> ${esc(g.goal)}</p><div class="row"><button class="primary" data-new="${esc(g.id)}">${esc(t('home.newGame'))}</button>${n ? `<button data-resume="${esc(g.id)}">${esc(t('home.resumeGame'))}</button><span class="meta">${esc(t('home.saves', { n }))}</span>` : ''}</div></article>`;
  }).join('') || `<p class="meta">${esc(t('home.noGames'))}</p>`;
  drawResume();
}
// Resume dialog: the saves of one game, newest first, scrollable.
// force: redraw even under the pointer (after a delete); otherwise a list the user is reading or copying from stays put.
function drawResume(force) {
  if (!resGame || !$('#resdlg').open) return;
  const rs = runsOf(resGame); if (!rs.length) { $('#resdlg').close(); return; }
  if (!force && document.querySelector('#reslist .lnk:hover,#reslist summary:hover')) return;
  $('#reslist').innerHTML = rs.map(runCard).join('');
}
// The names and genders ('f' | 'm') used last time, kept by the server (settings.json) and fetched when the dialog opens.
// Before the first game the fields hold the game's sample names (game.json players: Jancsi, Juliska) with m and f.
let LP = { names: [], genders: [] };
const lastNames = () => LP.names, lastGenders = () => LP.genders;
const genderOf = (g, n) => val(g, 'g' + n, lastGenders()[n] || (lastNames()[n] ? (n ? 'm' : 'f') : (n ? 'f' : 'm')));
const genderBtn = (g, n) => { const x = genderOf(g, n); return `<button type="button" class="gender ${x}" data-gender="${n}" title="${esc(t('home.genderTitle'))}" aria-label="${esc(t(x === 'm' ? 'home.genderMale' : 'home.genderFemale'))}">${x === 'm' ? '♂' : '♀'}</button>`; };
// New game dialog: the names used last time on this browser, else empty fields (the placeholder only says which player), solo choice; after starting it shows the player links.
function drawNew(err) {
  const g = G.find(x => x.id === newGame);
  $('#newtitle').textContent = `${t('home.newTitle')}: ${g.title}`;
  $('#newbody').innerHTML = `${warnOf(g)}<p class="meta">${esc(t('home.namesAsk'))}</p><div class="names">${g.players.map((p, n) => `<label>${esc(g.eras ? t('home.eraName', { era: g.eras[n] }) : t('home.playerName', { n: n + 1 }))}<span class="nameline"><input id="nn${n}" maxlength="24" value="${esc(val(g.id, 'n' + n, lastNames()[n] || g.players[n] || ''))}" placeholder="${esc(t('home.namePlaceholder', { n: n + 1 }))}" autocomplete="off">${genderBtn(g.id, n)}</span></label>`).join('')}${g.eras ? `<button id="swapnames" type="button" title="${esc(t('home.swapErasTitle'))}">${esc(t('home.swapEras'))}</button>` : ''}</div>
<div class="row"><label><input type="checkbox" id="nsolo" ${val(g.id, 'solo', false) ? 'checked' : ''}> ${esc(t('home.soloLabel'))}</label></div>${err ? `<p class="error">${esc(err)}</p>` : ''}
<div class="row" style="margin-top:12px"><button id="newno">${esc(t('home.cancel'))}</button><button id="newok" class="primary">${esc(t('home.start'))}</button></div>`;
  setTimeout(() => $('#nn0')?.focus());
}
async function startNew() {
  const g = G.find(x => x.id === newGame), solo = $('#nsolo').checked, names = g.players.map((_, n) => $('#nn' + n).value.trim());
  const genders = [genderOf(g.id, 0), genderOf(g.id, 1)];
  V[g.id] = { n0: names[0], n1: names[1], g0: genders[0], g1: genders[1], solo };
  if (!names[0] || (!names[1] && !solo)) return drawNew(t(solo ? 'home.needName' : 'home.needNames'));
  const r = await J('/api/runs', { method: 'POST', body: JSON.stringify({ game: g.id, solo, names: names.map((x, i) => x || g.players[i]), genders, remember: true }) });
  if (r.error) return drawNew(r.error);
  fresh = r.id; V[g.id] = {}; LP = { names: [names[0], solo ? LP.names[1] : names[1]], genders }; await load();
  const x = R.find(y => y.id === r.id);
  $('#newbody').innerHTML = `<p>${esc(t('home.created'))}</p>${x ? runCard(x) : ''}<div class="row" style="margin-top:12px"><button id="newdone" class="primary">${esc(t('home.close'))}</button></div>`;
}
async function load() { [G, R] = await Promise.all([G.length ? G : J('/api/games'), J('/api/runs')]); if (!document.querySelector('.lnk:hover,summary:hover') && !/INPUT/.test(document.activeElement?.tagName || '')) draw(); }
document.addEventListener('input', e => { const d = e.target.dataset; if (d.g) (V[d.g] = V[d.g] || {})[d.k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; });
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset?.run) d.open ? open.add(d.dataset.run) : open.delete(d.dataset.run); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Enter' && $('#newdlg').open && e.target.tagName === 'INPUT') { e.preventDefault(); if ($('#newok')) startNew(); } });
document.addEventListener('click', async e => {
  const el = e.target, d = el.dataset;
  if (d.new) { newGame = d.new; try { LP = await J('/api/players/last'); } catch { } drawNew(); $('#newdlg').showModal(); }
  if (el.id === 'newok') startNew();
  if (el.id === 'swapnames') { const a = $('#nn0'), b = $('#nn1'); [a.value, b.value] = [b.value, a.value]; const v = V[newGame] = V[newGame] || {}, g0 = genderOf(newGame, 0); v.g0 = genderOf(newGame, 1); v.g1 = g0; v.n0 = a.value; v.n1 = b.value; drawNew(); }
  if (d.gender !== undefined && $('#newdlg').open) { const n = Number(d.gender), v = V[newGame] = V[newGame] || {}; v['g' + n] = genderOf(newGame, n) === 'm' ? 'f' : 'm'; v.n0 = $('#nn0').value; v.n1 = $('#nn1').value; v.solo = $('#nsolo').checked; el.outerHTML = genderBtn(newGame, n); }
  if (el.id === 'newno' || el.id === 'newdone') $('#newdlg').close();
  if (d.resume) { resGame = d.resume; fresh = null; $('#restitle').textContent = `${t('home.resumeTitle')} · ${G.find(x => x.id === d.resume).title}`; $('#reslist').innerHTML = runsOf(d.resume).map(runCard).join(''); $('#resdlg').showModal(); }
  if (el.id === 'resclose') $('#resdlg').close();
  if (d.branch) { const r = await J(`/api/runs/${d.branch}/branch`, { method: 'POST' }); if (!r.error) { fresh = r.id; open.add(r.id); } await load(); draw(); }
  if (d.del) { const x = R.find(r => r.id === d.del); $('#deltext').textContent = t('home.deleteText', { title: x.title, label: x.label ? ' · ' + x.label : '', when: when(x.updated || x.created), rounds: x.rounds, time: duration(x.playMs) }); $('#delok').dataset.id = x.id; $('#delask').showModal(); $('#delno').focus(); }
  if (el.id === 'delno') $('#delask').close();
  if (el.id === 'delok') { $('#delask').close(); await J(`/api/runs/${el.dataset.id}`, { method: 'DELETE' }); await load(); draw(); drawResume(true); }
  if (d.regen) { await J(`/api/runs/${d.regen}/regen`, { method: 'POST' }); load(); }
  if (d.copy) { let ok = false; try { await navigator.clipboard.writeText(d.copy); ok = true; } catch { const a = document.createElement('textarea'); a.value = d.copy; document.body.append(a); a.select(); ok = document.execCommand('copy'); a.remove(); } const old = el.textContent; el.textContent = t(ok ? 'home.copied' : 'home.copyFailed'); setTimeout(() => el.textContent = old, 1800); }
});
J('/api/strings').then(s => { DuoStr.set(s); DuoStr.apply(); load(); setInterval(load, 8000); J('/api/info').then(i => { if (/^(localhost|127\.)/.test(location.hostname)) { base = `http://${i.address}:${i.port}`; draw(); } }); });

// ---- AI settings: the key is only ever sent to the server, which returns whether it is set and its last 4 characters.
const setMsg = (k, bad) => { const m = $('#setmsg'); m.textContent = k ? t(k) : ''; m.className = bad ? 'error' : 'meta'; };
const setErr = text => { const m = $('#setmsg'); m.textContent = text; m.className = 'error'; };
function showSettings(st) {
  $('#keystate').textContent = st.keySource === 'settings' ? t('settings.keyOwn', { hint: st.keyHint }) : t('settings.keyNone');
  for (const id of ['newkey', 'savekey', 'clearkey', 'model', 'check']) $('#' + id).disabled = !st.canEdit;
  $('#clearkey').hidden = st.keySource !== 'settings';
  const sel = $('#model'); if (![...sel.options].some(o => o.value === st.model)) sel.append(new Option(st.model, st.model)); sel.value = st.model;
  if (!st.canEdit) setMsg('settings.readOnly', true);
}
async function checkSettings() {
  setMsg('settings.checking'); const r = await J('/api/settings/check', { method: 'POST', body: '{}' });
  if (r.error) { setErr(r.error); return; }
  const sel = $('#model'), cur = sel.value; sel.innerHTML = ''; for (const m of new Set([...r.models, cur])) sel.append(new Option(m, m)); sel.value = cur;
  $('#balance').textContent = r.balance.length ? r.balance.map(b => `${b.total} ${b.currency}`).join(', ') : '–';
  if (r.available === false) setMsg('settings.unavailable', true); else setMsg('settings.ok');
}
$('#setb').onclick = async () => { setMsg(''); $('#newkey').value = ''; const st = await J('/api/settings'); showSettings(st); $('#settings').showModal(); if (st.canEdit && st.keySet) checkSettings(); };
$('#savekey').onclick = async () => { const k = $('#newkey').value.trim(); if (!k) return; setMsg('settings.checking'); const r = await J('/api/settings', { method: 'POST', body: JSON.stringify({ apiKey: k }) }); if (r.error) { setErr(r.error); return; } $('#newkey').value = ''; showSettings(r); setMsg('settings.saved'); checkSettings(); };
$('#clearkey').onclick = async () => { const r = await J('/api/settings', { method: 'POST', body: JSON.stringify({ clearKey: true }) }); if (r.error) { setErr(r.error); return; } showSettings(r); setMsg('settings.saved'); };
$('#model').onchange = async () => { const r = await J('/api/settings', { method: 'POST', body: JSON.stringify({ model: $('#model').value }) }); if (r.error) setErr(r.error); else { showSettings(r); setMsg('settings.saved'); } };
$('#check').onclick = checkSettings;
