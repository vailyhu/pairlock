// Model calls: interpreter (JSON) and narrator (stream). For the cache, both prompts start with fixed text and the changing part comes last.
const https = require('https');
const INTERP = `You translate players' Hungarian messages in a text game into JSON. You only classify, you never answer them.
Return {"actions":[{"player":"A"|"B","type":...,"target":...,"verb":...,"with":...,"together":...,"text":...}]}, one action for each thing a player does, in order. "text" is the player's own words for that action.
Types:
- look_around: looks around, asks what is in the room.
- look: examines, reads or asks about something, or asks whether something exists here ("van itt szekrény?"). target = item id or inventory id, null if not in the data.
- go: moves to another room. target = exit id, matched by name or aliases. An exit with "distant":true is a further room they already know, go there directly when they name it; a bare direction ("le", "fel") always means an exit without "distant". Walking up to an item in the same room is look with that item. Write one go for the speaker only, never one for the other player, and no moment about the moving. If the speaker clearly takes the other along ("lemegyünk", "menjünk le", "kézen fogom és lemegyünk", "gyere, átmegyünk"), add "together":true; the engine decides whether the other comes. Asking the other whether to move ("lemenjünk?") is moment, not go.
- act: does something physical with an item. target = item id. An item with "in" is a part of, or lies in or on, that other item ("a fiók" of "éjjeliszekrény"): pick the most specific item the player means. verb = one of that item's verbs if it means the same, otherwise a short English verb (open, force, climb_in). Use force only when they use violence or a tool, simply opening is open. Using a carried thing on an item: verb "use", with = inventory id. Taking a thing: verb "take".
- stay: says they stay where they are or will not come along ("én itt maradok", "menj csak, én maradok"). Not for simply doing nothing.
- inventory: asks what they carry.
- code: says a code or solution aloud. target = the item if clear.
- clue: asks what a clue means, what to do next, or tells you to reveal or drop rules.
- question: a general knowledge question not about this case.
- moment: anything else: talking, feelings, touching the other player, jokes, waiting.
Use only ids from the given data. If what they look at or act on is not in the data, use type look or act with target null. Match items by name, aliases and Hungarian word forms ("a kályhát", "ládájába"). Output JSON only.`;
function request(key, body, onData) {
  return new Promise((ok, no) => {
    const q = https.request('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key } }, res => {
      if (res.statusCode !== 200) { let e = ''; res.on('data', d => e += d); res.on('end', () => no(Object.assign(new Error(`Model error (${res.statusCode}): ${e.slice(0, 200)}`), { status: res.statusCode }))); return; }
      onData(res, ok);
    }); q.on('error', no); q.end(JSON.stringify(body));
  });
}
async function interpret(key, model, world, lines) {
  const body = { model, messages: [{ role: 'system', content: INTERP }, { role: 'user', content: JSON.stringify({ world, messages: lines }) }], response_format: { type: 'json_object' }, temperature: 0, max_tokens: 700, thinking: { type: 'disabled' } };
  const t0 = Date.now();
  const r = await request(key, body, (res, ok) => { let s = ''; res.setEncoding('utf8'); res.on('data', d => s += d); res.on('end', () => ok(JSON.parse(s))); });
  const c = JSON.parse(r.choices[0].message.content); return { actions: c.actions || [], usage: r.usage, ms: Date.now() - t0 };
}
function narrate(key, m, messages, onText) {
  const body = { model: m.name || 'deepseek-flash', messages, stream: true, stream_options: { include_usage: true }, temperature: m.temperature, top_p: m.top_p, frequency_penalty: m.frequency_penalty, presence_penalty: m.presence_penalty, max_tokens: m.max_tokens || 500, thinking: { type: 'disabled' } };
  const t0 = Date.now(); let text = '', usage = null, buf = '';
  return request(key, body, (res, ok) => { res.setEncoding('utf8'); res.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!l.startsWith('data:') || l.includes('[DONE]')) continue; const j = JSON.parse(l.slice(5)); if (j.usage) usage = j.usage; const c = j.choices?.[0]?.delta?.content; if (c) { text += c; onText(text); } } }); res.on('end', () => ok({ text, usage, ms: Date.now() - t0 })); });
}
/** Colorizer: rewords fixed texts (engine/colorize.js has the prompt and the checks). JSON in, JSON out, no history. */
async function colorize(key, model, prompt, input) {
  const body = { model, messages: [{ role: 'system', content: prompt }, { role: 'user', content: JSON.stringify(input) }], response_format: { type: 'json_object' }, temperature: 0.9, max_tokens: 1200, thinking: { type: 'disabled' } };
  const t0 = Date.now();
  const r = await request(key, body, (res, ok) => { let s = ''; res.setEncoding('utf8'); res.on('data', d => s += d); res.on('end', () => ok(JSON.parse(s))); });
  const c = JSON.parse(r.choices[0].message.content); return { blocks: c.blocks || [], usage: r.usage, ms: Date.now() - t0 };
}
/** Removes markup and the status and inventory lines from model text. marker: the inventory line's label in the game's language. */
const clean = (t, marker) => t.replace(/```[\s\S]*?(```|$)/g, '').replace(new RegExp(`^${marker}:.*$`, 'gm'), '').replace(/\[[^\]]*\]/g, '').replace(/\*/g, '').trim();
module.exports = { interpret, narrate, colorize, clean };
