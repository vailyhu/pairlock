// Code lock: see CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { CodeLockOptions, CodeLockView, CodeLockMove } from './types.ts';
import { check } from '../../engine/codes.js';

const mod: ServerModule<CodeLockOptions, Record<string, never>, CodeLockView, CodeLockMove> = {
  view: o => ({ kind: o.kind, n: o.n, placeholder: o.placeholder, button: o.button }),
  act: (o, _state, move, ctx) => check(o, ctx.id, move.guess) ? { solved: true, text: o.okText } : { bad: true, text: o.badText },
};
export default mod;
