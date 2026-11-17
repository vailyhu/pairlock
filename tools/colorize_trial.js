// Real-model trial of the colorizer (costs a little DeepSeek credit): every room's look-around and every visible thing's look,
// at the start state, RUNS times, written side by side (fixed / colorized / failed check) to saves/colorize-trial/<game>.md.
// The output quotes the games' fixed texts (spoilers only as far as the room and look texts go). Run: node tools/colorize_trial.js <game> [runs]
const fs = require('fs'), path = require('path'), W = require('../engine/world'), C = require('../engine/colorize'), AI = require('../engine/ai'), Settings = require('../engine/settings');
const game = process.argv[2], RUNS = +(process.argv[3] || 3), ROOT = path.join(__dirname, '..'), G = path.join(ROOT, 'games', game);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')), key = Settings.key(cfg), model = Settings.model();
const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/hu.json'), 'utf8'));
const w = JSON.parse(fs.readFileSync(path.join(G, 'world.json'), 'utf8')), g = JSON.parse(fs.readFileSync(path.join(G, 'game.json'), 'utf8'));
w.texts = { ...L.engine.world, inventoryMarker: L.ui.markers.inventory, ...w.texts };
const names = g.players || ['Jancsi', 'Juliska'], starts = [w.start].flat();
// which player walks a room: in a two-era game the one whose start is in the same era
const playerOf = room => starts.length > 1 ? (room.endsWith('74') === starts[0].endsWith('74') ? 0 : 1) : 0;
const cases = [];
for (const room of Object.keys(w.rooms)) {
  const p = playerOf(room);
  cases.push({ room, p, intent: { type: 'look_around', text: 'körülnézek' } });
  const s0 = W.initState(w); s0.loc[p] = room;
  for (const it of W.visibleItems(w, s0, p)) if (!it.literal && it.kind !== 'door') cases.push({ room, p, intent: { type: 'look', target: it.id, text: `megnézem: ${it.name}` } });
}
const out = [`# Színező próba: ${g.title || game}`, '', `${cases.length} eset × ${RUNS} futás, modell: ${model}, ${new Date().toISOString().slice(0, 16)}`, ''];
let ok = 0, fail = 0, ms = 0, n = 0; const reasons = {};
async function one(c) {
  const s = W.initState(w); s.loc[c.p] = c.room; s.visited[c.room] = true;
  const res = W.run(w, s, [{ player: c.p, ...c.intent }], names);
  const rows = [];
  for (let k = 0; k < RUNS; k++) {
    const r = await C.colorize({ w, s, res, names, aud: [c.p], cfg: { ...g.colorize, timeoutMs: 15000 }, L: L.engine.colorize, ai: input => AI.colorize(key, model, C.PROMPT, input) });
    for (const l of r.log) { rows.push(l); if (l.fail) { fail++; const why = l.fail.split(':')[0]; reasons[why] = (reasons[why] || 0) + 1; } else ok++; }
    ms += r.ms || 0; n++;
  }
  return rows;
}
(async () => {
  const results = new Array(cases.length); let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (next < cases.length) { const i = next++; results[i] = await one(cases[i]).catch(e => [{ fixed: '', fail: 'error: ' + e.message }]); process.stdout.write('.'); } }));
  cases.forEach((c, i) => {
    const rows = results[i]; if (!rows.length) return;
    out.push(`## ${w.rooms[c.room].name} · ${c.intent.type === 'look' ? (w.items.find(x => x.id === c.intent.target)?.name) : 'körülnézés'}`, '', `**Fix:** ${rows[0].fixed}`, '');
    rows.forEach((l, k) => out.push(`${k + 1}. ${l.fail ? `~~${l.out || '(nincs)'}~~ → **${l.fail}**` : l.out}`));
    out.push('');
  });
  const sum = `Sikeres: ${ok}, fix maradt: ${fail} (${Math.round(100 * fail / Math.max(1, ok + fail))}%), átlagos hívás: ${Math.round(ms / Math.max(1, n))} ms. Okok: ${JSON.stringify(reasons)}`;
  out.splice(3, 0, sum, '');
  const dir = path.join(ROOT, 'saves', 'colorize-trial'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${game}.md`), out.join('\n'));
  console.log('\n' + sum + '\n' + path.join(dir, `${game}.md`));
})();
