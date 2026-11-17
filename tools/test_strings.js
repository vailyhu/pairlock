// Every string key used in the code must exist in every locales/*.json, and no Hungarian text may be left in client code. No server needed.
const fs = require('fs'), path = require('path');
let bad = 0; const check = (n, ok, info = '') => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}${ok ? '' : ': ' + info}`); };
const locales = Object.fromEntries(fs.readdirSync('locales').filter(f => f.endsWith('.json')).map(f => [f.slice(0, -5), JSON.parse(fs.readFileSync(path.join('locales', f), 'utf8'))]));
const get = (o, p) => p.split('.').reduce((x, k) => x?.[k], o);
const read = f => fs.readFileSync(f, 'utf8');
const ui = new Set(), server = new Set();
for (const f of ['public/play.js', 'public/home.js', 'public/play.html', 'public/index.html']) for (const m of read(f).matchAll(/(?:\bt|DuoStr\.t)\(\s*'([\w.]+)'|data-s(?:-\w+)?="([\w.]+)"|t\((?:[^()']*\?\s*)?'([\w.]+)'\s*:\s*'([\w.]+)'/g)) for (const k of m.slice(1)) if (k && k.includes('.')) ui.add(k);
for (const m of read('public/play.js').matchAll(/t\(\w[^()]*\?\s*'([\w.]+)'\s*:\s*'([\w.]+)'/g)) { ui.add(m[1]); ui.add(m[2]); }
for (const m of read('public/modules.js').matchAll(/(?:STR|fmtS)\('(\w+)'/g)) ui.add('frame.' + m[1]);
for (const f of ['server.js', 'engine/world.js']) for (const m of read(f).matchAll(/\bL0?\.((?:engine|ui)\.[\w.]+)/g)) server.add(m[1]);
for (const m of read('engine/world.js').matchAll(/w\.texts\.(\w+)/g)) if (m[1] !== 'inventoryMarker') server.add('engine.world.' + m[1]);
for (const [lang, L] of Object.entries(locales)) {
  const miss = [...ui].filter(k => typeof get(L.ui, k) !== 'string'); check(`${lang}: ${ui.size} client keys present`, !miss.length, miss.join(', '));
  const missS = [...server].filter(k => get(L, k) === undefined); check(`${lang}: ${server.size} server keys present`, !missS.length, missS.join(', '));
  check(`${lang}: markers`, ['inventory', 'place', 'pass'].every(k => typeof L.ui.markers?.[k] === 'string') && L.ui.markers.pass.includes('{name}'));
}
const HU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/;
for (const f of ['public/play.js', 'public/home.js', 'public/modules.js', 'public/play.html', 'public/index.html', 'engine/world.js', 'engine/ai.js', 'server.js', ...fs.readdirSync('modules').filter(d => fs.existsSync(`modules/${d}/client.js`)).map(d => `modules/${d}/client.js`)]) {
  const lines = read(f).split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => HU.test(l) && !/Őrség/.test(l) && !(f === 'engine/ai.js' && /^- |Match items/.test(l)));
  check(`no Hungarian text in ${f}`, !lines.length, lines.map(([n]) => n).join(','));
}
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
