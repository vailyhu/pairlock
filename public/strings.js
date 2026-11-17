// Player-facing text from locales/<lang>.json, sent by the server. t('section.key', {vars}) fills {placeholders}; apply() fills data-s* attributes in HTML.
window.DuoStr = (() => {
  let S = {};
  const get = path => path.split('.').reduce((o, k) => o?.[k], S);
  const t = (path, vars = {}) => String(get(path) ?? path).replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m);
  function apply(root = document) {
    for (const e of root.querySelectorAll('[data-s]')) e.textContent = t(e.dataset.s);
    for (const e of root.querySelectorAll('[data-s-tip]')) e.title = t(e.dataset.sTip);
    for (const e of root.querySelectorAll('[data-s-aria]')) e.setAttribute('aria-label', t(e.dataset.sAria));
    for (const e of root.querySelectorAll('[data-s-placeholder]')) e.placeholder = t(e.dataset.sPlaceholder);
    if (S.lang) document.documentElement.lang = S.lang;
  }
  return { set: s => { S = s || {}; }, t, apply, get all() { return S; } };
})();
