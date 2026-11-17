// Roulette: a rigged wheel; side a sets the hidden control (sector, fine dial, magnet) without seeing the wheel, side b spins without seeing the control. See CLAUDE.md in this folder.
import type { ServerCtx, ServerModule } from '../types.ts';
import type { RouletteMove, RouletteOptions, RouletteState, RouletteView } from './types.ts';

const HISTORY = 8;
const fineMax = (o: RouletteOptions) => o.fineMax ?? Math.max(1, ...o.sectors.map(s => s.pockets.length));
const sides = (ctx: ServerCtx) => ({ a: ctx.side === 'a' || ctx.side === 'both', b: ctx.side === 'b' || ctx.side === 'both' });
/** Where the magnet pulls the ball: the fine dial's pocket in the chosen sector, or none if the dial points past the sector. */
const held = (o: RouletteOptions, st: RouletteState) => o.sectors[st.sector]?.pockets[st.fine - 1];
const fill = (t: string, vars: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m);

const mod: ServerModule<RouletteOptions, RouletteState, RouletteView, RouletteMove> = {
  init: () => ({ sector: 0, fine: 1, magnet: false, history: [], spins: 0 }),
  view(o, st, ctx) {
    const s = sides(ctx), v: RouletteView = { side: ctx.side, labels: o.labels || {} };
    if (ctx.side === null) v.awayText = o.awayText;
    if (s.a) v.control = { sectors: o.sectors.map(x => x.label), sector: st.sector, fineMax: fineMax(o), fine: st.fine, magnet: st.magnet, background: o.background };
    if (s.b) v.wheel = { pockets: o.pockets, history: st.history.slice(-HISTORY), spins: st.spins, spinMs: o.spinMs ?? 2500, last: st.last, won: !!st.won };
    return v;
  },
  act(o, st, move, ctx) {
    if (!move) return; const s = sides(ctx);
    if ('sector' in move) { const i = Number(move.sector); if (!s.a || !Number.isInteger(i) || i < 0 || i >= o.sectors.length) return; st.sector = i; ctx.push(); return; }
    if ('fine' in move) { const f = Number(move.fine); if (!s.a || !Number.isInteger(f) || f < 1 || f > fineMax(o)) return; st.fine = f; ctx.push(); return; }
    if ('magnet' in move) { if (!s.a) return; st.magnet = !!move.magnet; ctx.push(); return; }
    if (!('spin' in move) || !move.spin || !s.b || !o.pockets.length) return;
    const pull = st.magnet ? held(o, st) : undefined, magnetic = pull !== undefined && o.pockets.some(p => p.n === pull);
    const n = magnetic ? pull as number : o.pockets[Math.floor(Math.random() * o.pockets.length)].n, pocket = o.pockets.find(p => p.n === n);
    st.history = [...st.history, n].slice(-HISTORY); st.spins++;
    const text = fill(o.spinText, { n, color: (pocket && o.colorNames?.[pocket.color]) || pocket?.color || '' });
    if (magnetic && n === o.target) { st.won = true; st.last = `${text} ${o.doneText}`; ctx.push(); return { solved: true, text: o.doneText }; }
    st.last = !magnetic && n === o.target && o.notMagnetText ? `${text} ${o.notMagnetText}` : text;
    ctx.push(); return { text: st.last };
  },
  // the winning spin stays on screen (wheel, history), with no more moves
  keep: (o, st) => !!st.won,
};
export default mod;
