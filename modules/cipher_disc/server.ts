// Cipher disc: two rings, letters outside and signs inside; turned to the key, the secret entry reads. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { CipherDiscMove, CipherDiscOptions, CipherDiscState, CipherDiscView } from './types.ts';

const n = (o: CipherDiscOptions) => o.outer.length;
const read = (o: CipherDiscOptions, rot: number) => o.cipher.map(c => { const i = o.inner.indexOf(c); return i < 0 ? c : o.outer[((i - rot) % n(o) + n(o)) % n(o)]; }).join('');

const mod: ServerModule<CipherDiscOptions, CipherDiscState, CipherDiscView, CipherDiscMove> = {
  init: () => ({ rot: 0 }),
  view(o, st) {
    const v: CipherDiscView = { outer: o.outer, inner: o.inner, rot: st.rot || 0, cipher: o.cipher, reading: read(o, st.rot || 0), texts: o.texts };
    if (st.solved) v.plain = o.plainText;
    return v;
  },
  act(o, st, move, ctx) {
    if (st.solved) return;
    if ('rotate' in move) { st.rot = (((st.rot || 0) + Math.sign(Number(move.rotate) || 0)) % n(o) + n(o)) % n(o); ctx.push(); return; }
    if ('read' in move) {
      if (st.rot === o.key) { st.solved = true; return { solved: true, text: `${o.texts.solved} ${o.plainText}` }; }
      return { text: o.texts.wrong || '' };
    }
  },
};
export default mod;
