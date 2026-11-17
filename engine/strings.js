// Player-facing text, one JSON file per language in locales/. Code refers to keys only; fmt fills {placeholders}.
const fs = require('fs'), path = require('path'), DIR = path.join(__dirname, '..', 'locales'), all = {};
for (const f of fs.readdirSync(DIR)) if (f.endsWith('.json')) all[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
/** The strings of a language; falls back to the default language when there is no such file. */
const forLang = (lang, fallback) => all[lang] || all[fallback] || all.hu;
const fmt = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m);
module.exports = { forLang, fmt, languages: Object.keys(all) };
