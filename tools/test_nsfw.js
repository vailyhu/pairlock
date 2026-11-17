// The --nsfw download (engine/nsfw.js) against a local stand-in for the Hugging Face dataset, with a made-up game:
// missing files come down, a second run fetches nothing, a file changed here is kept, an update replaces only what this tool
// wrote, a bad checksum leaves the game unloaded, and redirects are followed. No network, no account.
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), crypto = require('crypto');
const Nsfw = require('../engine/nsfw');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
let fails = 0; const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pairlock-nsfw-')), games = path.join(tmp, 'games'), hub = {};
fs.mkdirSync(games);
const put = (rev, rel, body) => { hub[`/resolve/${rev}/${rel}`] = Buffer.from(body); };
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/redirect/')) { res.writeHead(302, { Location: req.url.replace('/redirect', '') }); return res.end(); }
  const b = hub[decodeURIComponent(req.url)]; if (!b) { res.writeHead(404); return res.end(); }
  res.writeHead(200); res.end(b);
});
const list = (rev, files, extra = {}) => fs.writeFileSync(path.join(games, 'nsfw.json'), JSON.stringify({ source: 'unused', revision: rev, games: { fake: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, [Buffer.byteLength(v), sha(Buffer.from(v))]])) }, ...extra }));
const read = rel => fs.readFileSync(path.join(games, 'fake', rel), 'utf8');
const quiet = () => {};

server.listen(0, async () => {
  process.env.PAIRLOCK_NSFW_SOURCE = `http://localhost:${server.address().port}`;
  const v1 = { 'game.json': '{"title":"Fake","nsfw":true}', 'images/room á.jpg': 'IMG1' };
  for (const [k, v] of Object.entries(v1)) put('r1', `fake/${k}`, v);
  list('r1', v1);
  let r = await Nsfw.sync(games, quiet);
  check('missing files downloaded, game ready', [read('game.json'), read('images/room á.jpg'), r.ready.has('fake')], [v1['game.json'], 'IMG1', true]);
  check('no .part left over', fs.readdirSync(path.join(games, 'fake', 'images')), ['room á.jpg']);

  const lines = []; r = await Nsfw.sync(games, l => lines.push(l));
  check('second run downloads nothing', /0 downloaded/.test(lines.join()), true);

  fs.writeFileSync(path.join(games, 'fake', 'game.json'), '{"title":"Local rebuild","nsfw":true}');
  const v2 = { 'game.json': '{"title":"Fake v2","nsfw":true}', 'images/room á.jpg': 'IMG2' };
  for (const [k, v] of Object.entries(v2)) put('r2', `fake/${k}`, v);
  list('r2', v2);
  r = await Nsfw.sync(games, quiet);
  check('update replaces only what this tool wrote', [read('game.json'), read('images/room á.jpg')], ['{"title":"Local rebuild","nsfw":true}', 'IMG2']);

  fs.rmSync(path.join(games, 'fake'), { recursive: true }); fs.rmSync(path.join(games, '.nsfw-state.json'));
  put('r3', 'fake/game.json', 'tampered'); put('r3', 'fake/images/room á.jpg', 'IMG2');
  list('r3', v2);
  r = await Nsfw.sync(games, quiet);
  check('bad checksum: file not kept, game not ready', [fs.existsSync(path.join(games, 'fake', 'game.json')), r.ready.has('fake')], [false, false]);

  process.env.PAIRLOCK_NSFW_SOURCE += '/redirect';
  list('r2', v2);
  r = await Nsfw.sync(games, quiet);
  check('redirect followed', [read('game.json'), r.ready.has('fake')], [v2['game.json'], true]);

  delete process.env.PAIRLOCK_NSFW_SOURCE;
  fs.rmSync(path.join(games, 'nsfw.json'));
  r = await Nsfw.sync(games, quiet);
  check('no list: nothing to do', r.ready.size, 0);

  server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0);
});
