// Parameter console: a world's settings on switches; each change goes to the world as a silent message. See CLAUDE.md in this folder.
import type { ServerModule, ServerCtx } from '../types.ts';
import type { ParamConsoleMove, ParamConsoleOptions, ParamConsoleState, ParamConsoleView } from './types.ts';
import { check } from '../../engine/codes.js';

const initial = (o: ParamConsoleOptions) => Object.fromEntries(o.params.map(p => [p.id, p.initial]));
/** Open when nothing locks it, the world condition holds, or the code was accepted. */
const open = (o: ParamConsoleOptions, st: ParamConsoleState, ctx: ServerCtx) => (o.unlock === undefined && o.unlockCode === undefined) || !!st.unlocked || (o.unlock !== undefined && ctx.test(o.unlock));

const mod: ServerModule<ParamConsoleOptions, ParamConsoleState, ParamConsoleView, ParamConsoleMove> = {
  init: o => ({ values: initial(o) }),
  view(o, st, ctx) {
    const locked = !open(o, st, ctx), values = { ...initial(o), ...st.values };
    return {
      locked, needsCode: locked && o.unlockCode !== undefined, lockedText: locked ? o.lockedText : undefined, texts: o.texts || {},
      params: locked ? [] : o.params.map(p => ({ id: p.id, label: p.label, values: p.values, value: values[p.id] })),
    };
  },
  act(o, st, move, ctx) {
    st.values = { ...initial(o), ...st.values };
    if ('code' in move) {
      if (open(o, st, ctx) || o.unlockCode === undefined) return;
      if (!check({ answer: o.unlockCode }, ctx.id, move.code)) return { text: o.texts?.wrongCode };
      st.unlocked = true; ctx.push(); return { text: o.texts?.unlockedText };
    }
    if (!open(o, st, ctx)) return;
    const p = o.params.find(x => x.id === move.param);
    if (!p || !p.values.some(v => v.id === move.value) || st.values[p.id] === move.value) return;
    st.values[p.id] = move.value;
    ctx.push();
    return { message: (o.message || 'PARAM {param} {value}').replace('{param}', p.id).replace('{value}', move.value), silent: true };
  },
};
export default mod;
