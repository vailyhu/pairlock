// Own tooltip: fast and multi-line, replacing the browser's title. Also works with title attributes set by modules.
(function () {
  const tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  let timer = 0, cur = null;
  const text = el => { if (el.title) { el.dataset.tip = el.title; el.removeAttribute('title'); } return el.dataset.tip; };
  function place(el) {
    (document.querySelector('dialog[open]') || document.body).append(tip); tip.hidden = false;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, g = 8;
    let x = r.left + r.width / 2 - w / 2, y = r.top - h - g; if (y < 4) y = r.bottom + g;
    tip.style.left = Math.max(6, Math.min(innerWidth - w - 6, x)) + 'px'; tip.style.top = Math.min(innerHeight - h - 4, y) + 'px';
  }
  function show(el) { clearTimeout(timer); cur = el; timer = setTimeout(() => { if (cur !== el || !el.isConnected) return; tip.textContent = text(el); place(el); }, 90); }
  function hide() { clearTimeout(timer); cur = null; tip.hidden = true; }
  const find = t => t?.closest?.('[title],[data-tip]');
  document.addEventListener('mouseover', e => { const el = find(e.target); if (el && el !== cur) { if (text(el)) show(el); } else if (!el) hide(); });
  document.addEventListener('focusin', e => { const el = find(e.target); if (el && text(el) && el.matches(':focus-visible')) show(el); });
  for (const ev of ['click', 'focusout', 'scroll', 'keydown']) document.addEventListener(ev, hide, true);
})();
