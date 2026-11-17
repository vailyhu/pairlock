// Stand-in for engine/ai.js in tests: no model call and no cost. Interpreter answers come from a recorded file; the narrator returns a fixed marker.
// DUO_AI_FIXTURE=<file> replays. Adding DUO_AI_RECORD=1 calls the real interpreter once for each new sentence and stores the answer.
const fs = require('fs'), real = require('./ai');
const file = process.env.DUO_AI_FIXTURE, record = !!process.env.DUO_AI_RECORD;
const store = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const NARRATOR_MARK = '(narrator)';
const keyOf = (world, lines) => JSON.stringify([world.A.room, world.B.room, lines]);
async function interpret(key, model, world, lines) {
  const k = keyOf(world, lines);
  if (!store[k]) {
    if (!record) throw new Error(`No recorded interpreter answer: ${k}`);
    const r = await real.interpret(key, model, world, lines);
    store[k] = r.actions; fs.writeFileSync(file, JSON.stringify(store, null, 1));
  }
  return { actions: store[k], usage: null, ms: 0 };
}
// DUO_AI_TRACE=<file> appends every narrator prompt as one JSON line, so tests can check what each thread's narrator saw.
async function narrate(key, m, messages, onText) { if (process.env.DUO_AI_TRACE) fs.appendFileSync(process.env.DUO_AI_TRACE, JSON.stringify(messages) + '\n'); onText(NARRATOR_MARK); return { text: NARRATOR_MARK, usage: null, ms: 0 }; }
// The colorizer is not replayed: tests check it offline (tools/test_colorize.js), so here it always falls back to the fixed text.
async function colorize() { throw new Error('no colorizer in replay'); }
module.exports = { interpret, narrate, colorize, clean: real.clean };
