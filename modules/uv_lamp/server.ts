// UV lamp: marks drawn on pictures that show only inside the lamp's light. See CLAUDE.md in this folder.
import type { ServerModule } from '../types.ts';
import type { UvLampMove, UvLampOptions, UvLampState, UvLampView } from './types.ts';

const mod: ServerModule<UvLampOptions, UvLampState, UvLampView, UvLampMove> = {
  init() { return { seen: [] }; },
  view(o, st) {
    return { images: o.images, radius: o.radius ?? 0.12, dim: o.dim ?? 0.35, help: o.help, seen: st.seen, allSeen: st.seen.length >= o.images.reduce((n, im) => n + im.marks.length, 0) };
  },
  act(o, st, move) {
    const [i, m] = Array.isArray(move.seen) ? move.seen : [-1, -1];
    if (!Number.isInteger(i) || !Number.isInteger(m) || !o.images[i]?.marks[m]) return;
    const key = `${i}:${m}`;
    if (!st.seen.includes(key)) st.seen.push(key);
    const all = o.images.reduce((n, im) => n + im.marks.length, 0);
    if (o.solveWhenAllSeen && st.seen.length >= all) return { solved: true, text: o.okText };
  },
};
export default mod;
