// Report form: see CLAUDE.md in this folder. One signing only; the score goes to the game as a message.
import type { ServerModule } from '../types.ts';
import type { ReportFormOptions, ReportFormState, ReportFormView, ReportFormMove } from './types.ts';
import { check } from '../../engine/codes.js';

const fill = (t: string, vals: Record<string, string>): string => t.replace(/\{(\w+)\}/g, (m, k) => k in vals ? vals[k] : m);

const mod: ServerModule<ReportFormOptions, ReportFormState, ReportFormView, ReportFormMove> = {
  init: o => ({ picks: o.questions.map(() => null) }),
  view(o, st) {
    return { questions: o.questions.map(q => ({ text: q.text, choices: q.choices })), picks: st.picks, choose: o.choose, button: o.button };
  },
  act(o, st, move, ctx) {
    if ('pick' in move) {
      const q = o.questions[move.pick]; if (!q || (move.value !== null && !q.choices.includes(move.value))) return;
      st.picks[move.pick] = move.value; ctx.push(); return;
    }
    if (!move.sign) return;
    if (st.picks.some(p => p === null)) return { text: o.missingText };
    const good = o.questions.filter((q, i) => check(q, `${ctx.id}.${i}`, st.picks[i] as string)).length;
    const vals: Record<string, string> = { good: String(good), total: String(o.questions.length) };
    for (const [k, list] of Object.entries(o.values || {})) vals[k] = list.find(x => !x.if || ctx.test(x.if))?.value ?? '';
    return { solved: true, message: fill(o.message, vals), text: fill(o.okText, vals) };
  },
};
export default mod;
