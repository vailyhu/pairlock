// Morse signal: see CLAUDE.md in this folder. The pattern stays on the server; the client only knows whether the lamp is lit and what has flashed so far.
import type { ServerCtx, ServerModule } from '../types.ts';
import type { MorseOptions, MorseState, MorseView, MorseMove } from './types.ts';
import { check } from '../../engine/codes.js';

type Beat = [length: number, lit: boolean];

function beats(pattern: string): Beat[] {
  const out: Beat[] = [];
  for (const letter of pattern.split(' ')) {
    for (const ch of letter) out.push([ch === '-' ? 3 : 1, true], [1, false]);
    out.push([3, false]);
  }
  out.push([10, false]);
  return out;
}

function advance(o: MorseOptions, st: MorseState, ctx: ServerCtx): void {
  const seq = beats(o.pattern), prev = seq[st.step];
  if (prev?.[1]) st.trace += prev[0] === 3 ? '—' : '•';
  else if (prev?.[0] === 3) st.trace += '  ';
  st.step++;
  if (st.step >= seq.length) { st.step = 0; st.trace = ''; }
  const [length, lit] = seq[st.step];
  st.on = lit;
  ctx.push();
  ctx.later(length * o.unit * 1000, () => advance(o, st, ctx));
}

function stop(st: MorseState, ctx: ServerCtx): void {
  ctx.clear();
  st.run = false; st.on = false; st.step = -1;
}

const mod: ServerModule<MorseOptions, MorseState, MorseView, MorseMove> = {
  init: () => ({ run: false, on: false, step: -1, trace: '' }),
  view(o, st, ctx) {
    const canHold = ctx.side === 'a' || ctx.side === 'both', canSee = ctx.side === 'b' || ctx.side === 'both';
    return {
      guessLabel: o.guessLabel, button: o.button, canHold, canSee, run: st.run,
      ...(canHold ? { holdLabel: o.holdLabel, textA: o.textA } : {}),
      ...(canSee ? { textB: o.textB, runText: o.runText, idleText: o.idleText, traceLabel: o.traceLabel, on: st.on, trace: st.trace } : {}),
    };
  },
  act(o, st, move, ctx) {
    if ('hold' in move) {
      if (ctx.side !== 'a' && ctx.side !== 'both') return;
      if (move.hold && !st.run) { st.run = true; st.step = -1; st.trace = ''; advance(o, st, ctx); }
      else if (!move.hold && st.run) { stop(st, ctx); ctx.push(); }
      return;
    }
    if (check(o, ctx.id, move.guess)) { stop(st, ctx); return { solved: true, text: o.okText }; }
    return { bad: true, text: o.badText };
  },
  leave(_o, st, ctx) { if (st.run && ctx.side !== 'b') stop(st, ctx); },
};
export default mod;
