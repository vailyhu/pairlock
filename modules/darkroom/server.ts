// Darkroom: develop a glass plate by the recipe: the right light, the trays in order, each for its time. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { DarkroomMove, DarkroomOptions, DarkroomState, DarkroomView } from './types.ts';

const fresh = (st: DarkroomState) => { st.step = 0; st.inTray = null; st.since = 0; st.fogged = false; };
const started = (st: DarkroomState) => st.step > 0 || !!st.inTray;

const mod: ServerModule<DarkroomOptions, DarkroomState, DarkroomView, DarkroomMove> = {
  init: () => ({ light: 'white', step: 0, inTray: null, since: 0, fogged: false }),
  view(o, st) {
    const v: DarkroomView = { trays: o.trays, light: st.light, inTray: st.inTray, elapsed: st.inTray ? Date.now() - st.since : 0, secondsPerMinute: o.secondsPerMinute,
      done: st.step, fogged: st.fogged, solved: !!st.solved, texts: o.texts };
    if (!st.fogged && (st.step > 0 || st.inTray === o.steps[0].tray)) { v.result = o.result; v.fade = o.fadeSeconds ?? 6; }
    return v;
  },
  act(o, st, move, ctx) {
    if (st.solved) return;
    const fog = (text: string) => { st.fogged = true; st.inTray = null; ctx.push(); return { text: `${text} ${o.texts.fogged}` }; };
    if ('light' in move) {
      if (!['white', 'red', 'off'].includes(move.light)) return;
      st.light = move.light; if (move.light === 'white' && started(st) && !st.fogged) return fog(o.texts.whiteFog);
      ctx.push(); return;
    }
    if ('reset' in move) { fresh(st); ctx.push(); return; }
    if (st.fogged) return { text: o.texts.fogged };
    if ('dip' in move) {
      if (st.inTray || !o.trays.some(t => t.id === move.dip)) return;
      if (st.light === 'white') return fog(o.texts.whiteFog);
      if (move.dip !== o.steps[st.step]?.tray) return fog(o.texts.wrongTray);
      st.inTray = move.dip; st.since = Date.now(); ctx.push(); return;
    }
    if ('lift' in move) {
      if (!st.inTray) return;
      const s = o.steps[st.step], minutes = (Date.now() - st.since) / 1000 / o.secondsPerMinute;
      if (minutes < s.minutes - s.tolerance) return fog(o.texts.tooShort);
      if (minutes > s.minutes + s.tolerance) return fog(o.texts.tooLong);
      st.step++; st.inTray = null;
      if (st.step >= o.steps.length) { st.solved = true; return { solved: true, text: o.texts.done }; }
      ctx.push(); return { text: o.texts.stepOk };
    }
  },
};
export default mod;
