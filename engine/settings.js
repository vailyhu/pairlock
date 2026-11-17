// Server-side settings the user changes on the home page: the AI provider's key and model. Stored in settings.json next to server.js,
// readable only by this user, never served and never sent back to a browser (only whether a key is set and its last 4 characters).
const fs = require('fs'), path = require('path'), https = require('https');
const FILE = process.env.DUO_SETTINGS || path.join(__dirname, '..', 'settings.json'), DEFAULT_MODEL = 'deepseek-flash';
const read = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
function write(s) { fs.writeFileSync(FILE + '.tmp', JSON.stringify(s, null, 1), { mode: 0o600 }); fs.renameSync(FILE + '.tmp', FILE); fs.chmodSync(FILE, 0o600); }
const key = () => read().ai?.apiKey || null;
const model = () => read().ai?.model || DEFAULT_MODEL;
function status() { const k = read().ai?.apiKey; return { provider: 'deepseek', keySet: !!k, keySource: k ? 'settings' : null, keyHint: k ? k.slice(-4) : null, model: model() }; }
/** GET on the DeepSeek API with a key: /models and /user/balance cost nothing. */
function get(k, p) {
  return new Promise((ok, no) => {
    const q = https.request('https://api.deepseek.com' + p, { headers: { Authorization: 'Bearer ' + k, Accept: 'application/json' }, timeout: 15000 }, res => {
      let s = ''; res.setEncoding('utf8'); res.on('data', d => s += d);
      res.on('end', () => { if (res.statusCode !== 200) return no(Object.assign(new Error(`HTTP ${res.statusCode}`), { status: res.statusCode })); try { ok(JSON.parse(s)); } catch (e) { no(e); } });
    }); q.on('timeout', () => q.destroy(new Error('timeout'))); q.on('error', no); q.end();
  });
}
/** Models and balance for a key; throws when the key does not work. */
async function check(k) {
  const [m, b] = await Promise.all([get(k, '/models'), get(k, '/user/balance').catch(() => null)]);
  return { models: (m.data || []).map(x => x.id), balance: (b?.balance_infos || []).map(x => ({ currency: x.currency, total: x.total_balance })), available: b ? !!b.is_available : null };
}
function save({ apiKey, model: m, clearKey }) {
  const s = read(); s.ai = s.ai || {};
  if (clearKey) delete s.ai.apiKey; else if (apiKey) s.ai.apiKey = apiKey;
  if (m) s.ai.model = m;
  write(s);
}
/** Player names and genders last used for a new game from the home page. Not secret, the same for every browser. */
function lastPlayers() { const p = read().lastPlayers || {}; return { names: Array.isArray(p.names) ? p.names : [], genders: Array.isArray(p.genders) ? p.genders : [] }; }
/** Alone, the second name is not asked for, so the one saved before stays. */
function saveLastPlayers(names, genders, solo) {
  const s = read(), prev = lastPlayers();
  s.lastPlayers = { names: [names[0], solo ? prev.names[1] : names[1]].map(x => String(x || '').slice(0, 24)), genders: [0, 1].map(n => (genders || [])[n] === 'm' ? 'm' : 'f') };
  write(s);
}
module.exports = { key, model, status, check, save, lastPlayers, saveLastPlayers, DEFAULT_MODEL, file: FILE };
