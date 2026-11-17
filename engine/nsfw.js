// The 18+ games are not in the git repo. games/nsfw.json lists their files (size and sha256) and where they are published
// (a Hugging Face dataset at a fixed revision); with --nsfw the server fetches what is missing before it loads the games.
// A file is replaced only when it is missing, or when it is still exactly what this tool downloaded earlier and the list
// now names a newer version. A file changed here (a local rebuild that is not published yet) is never overwritten.
const fs = require('fs'), path = require('path'), https = require('https'), http = require('http'), crypto = require('crypto');

const sha256 = f => new Promise((ok, no) => { const h = crypto.createHash('sha256'); fs.createReadStream(f).on('error', no).on('data', d => h.update(d)).on('end', () => ok(h.digest('hex'))); });

/** GET to a file, following redirects (the Hub sends files from a CDN), hashing on the way; resolves with the sha256. */
function download(url, dest, hops = 0) {
  return new Promise((ok, no) => {
    const lib = url.startsWith('http://') ? http : https;
    const q = lib.get(url, { headers: { 'User-Agent': 'pairlock' }, timeout: 60000 }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume(); if (hops > 5) return no(new Error('too many redirects'));
        return download(new URL(res.headers.location, url).href, dest, hops + 1).then(ok, no);
      }
      if (res.statusCode !== 200) { res.resume(); return no(new Error(`HTTP ${res.statusCode}`)); }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const h = crypto.createHash('sha256'), out = fs.createWriteStream(dest);
      res.on('data', d => h.update(d)); res.pipe(out);
      out.on('finish', () => ok(h.digest('hex'))); out.on('error', no); res.on('error', no);
    });
    q.on('timeout', () => q.destroy(new Error('timeout'))); q.on('error', no);
  });
}

/** Runs tasks with at most n at a time. */
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); }

const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

/** The list of 18+ games, or null when there is none. */
const manifest = gamesDir => readJson(path.join(gamesDir, 'nsfw.json'));

/**
 * Brings the 18+ games in gamesDir up to the list. Returns { ready: Set of game ids complete on disk, notes: [log lines] }.
 * PAIRLOCK_NSFW_SOURCE overrides the list's source (tests use a local server).
 */
async function sync(gamesDir, log = console.log) {
  const m = manifest(gamesDir), ready = new Set();
  if (!m || !m.games) { log('[nsfw] no games/nsfw.json, nothing to fetch'); return { ready }; }
  const source = (process.env.PAIRLOCK_NSFW_SOURCE || m.source || '').replace(/\/$/, ''), rev = m.revision || 'main';
  const stateFile = path.join(gamesDir, '.nsfw-state.json'), state = readJson(stateFile) || {};
  for (const [id, files] of Object.entries(m.games)) {
    let got = 0, kept = 0, failed = 0;
    const todo = [];
    for (const [rel, [size, sum]] of Object.entries(files)) {
      const key = `${id}/${rel}`, f = path.join(gamesDir, id, rel);
      if (!fs.existsSync(f)) { todo.push([key, f, sum]); continue; }
      const have = fs.statSync(f).size === size ? await sha256(f) : null;
      if (have === sum) { state[key] = sum; continue; }
      const now = have || await sha256(f);
      if (state[key] && state[key] === now) todo.push([key, f, sum]);   // ours and untouched: an update
      else kept++;                                                         // changed here: keep it
    }
    await pool(todo, 4, async ([key, f, sum]) => {
      const part = f + '.part';
      try {
        if (!source) throw new Error('no source');
        const got1 = await download(`${source}/resolve/${rev}/${key.split('/').map(encodeURIComponent).join('/')}`, part);
        if (got1 !== sum) throw new Error('checksum mismatch');
        fs.renameSync(part, f); state[key] = sum; got++;
      } catch (e) { fs.rmSync(part, { force: true }); failed++; if (failed <= 3) log(`[nsfw] ${key}: ${e.message}`); }
    });
    const missing = Object.keys(files).filter(rel => !fs.existsSync(path.join(gamesDir, id, rel))).length;
    if (!missing) ready.add(id);
    log(`[nsfw] ${id}: ${Object.keys(files).length} files, ${got} downloaded${kept ? `, ${kept} changed here and kept` : ''}${failed ? `, ${failed} failed` : ''}${missing ? `, ${missing} missing: not loaded` : ''}`);
  }
  try { fs.writeFileSync(stateFile, JSON.stringify(state)); } catch { }
  return { ready };
}

module.exports = { sync, manifest, sha256 };
