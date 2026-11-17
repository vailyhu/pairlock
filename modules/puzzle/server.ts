// Jigsaw puzzle: see CLAUDE.md in this folder. The cut comes from cols, rows, jitter and a per-game seed; loose pieces are well shuffled when the game starts.
import { randomInt } from 'node:crypto';
import type { ServerModule } from '../types.ts';
import type { PieceState, PieceView, PuzzleOptions, PuzzleState, PuzzleView, PuzzleMove } from './types.ts';

type Point = [number, number];

/** Where the loose-piece area starts, in shares of the image width. The client's board has the same layout. */
const TRAY_START = 1.02;

/** Small seeded generator (mulberry32), so the same seed always gives the same cut. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Grid corners. Border corners stay on the border and neighbours share corners, so the pieces always fit. */
function corners(o: PuzzleOptions, seed: number): Point[][] {
  const rnd = generator(seed), out: Point[][] = [];
  for (let y = 0; y <= o.rows; y++) {
    const row: Point[] = [];
    for (let x = 0; x <= o.cols; x++) {
      const dx = x === 0 || x === o.cols ? 0 : (rnd() - .5) * o.jitter / o.cols, dy = y === 0 || y === o.rows ? 0 : (rnd() - .5) * o.jitter / o.rows;
      row.push([x / o.cols + dx, y / o.rows + dy]);
    }
    out.push(row);
  }
  return out;
}

/** Inner edges get a slight bend from the shared corners, so both neighbours compute the same line. */
function edge(a: Point, b: Point, flat: boolean): Point[] {
  if (flat) return [a];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return [a, [a[0] + dx * .33 + dy * .05, a[1] + dy * .33 - dx * .05], [a[0] + dx * .66 - dy * .05, a[1] + dy * .66 + dx * .05]];
}

function cut(o: PuzzleOptions, seed: number): Omit<PieceView, keyof PieceState>[] {
  const c = corners(o, seed), out: Omit<PieceView, keyof PieceState>[] = [];
  for (let y = 0; y < o.rows; y++) for (let x = 0; x < o.cols; x++) {
    const a = c[y][x], b = c[y][x + 1], d = c[y + 1][x + 1], e = c[y + 1][x];
    // Each edge is walked in one fixed direction, top to bottom or left to right, so neighbours trace the same curve.
    const top = edge(a, b, y === 0), right = edge(b, d, x === o.cols - 1), bottom = [...edge(e, d, y === o.rows - 1), d].reverse().slice(0, -1), left = [...edge(a, e, x === 0), e].reverse().slice(0, -1);
    const poly = [...top, ...right, ...bottom, ...left], xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), lx = Math.min(...xs), ly = Math.min(...ys);
    out.push({ outline: poly.map(p => [p[0] - lx, p[1] - ly] as Point), corner: [lx, ly], width: Math.max(...xs) - lx, height: Math.max(...ys) - ly });
  }
  return out;
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** How many pairs lie next to each other in the tray the same way they belong together in the image. Lower is better mixed. */
export function neighbourPairs(order: number[], cols: number, slotCols: number): number {
  let n = 0;
  order.forEach((piece, slot) => {
    const right = (slot + 1) % slotCols ? order[slot + 1] : undefined, below = order[slot + slotCols];
    if (right === piece + 1 && (piece + 1) % cols) n++;
    if (below === piece + cols) n++;
  });
  return n;
}

/** A random order, keeping the best of several tries so no recognisable run of pieces stays together. */
export function mixedOrder(count: number, cols: number, slotCols: number): number[] {
  const ids = Array.from({ length: count }, (_, i) => i);
  let best = shuffled(ids), score = neighbourPairs(best, cols, slotCols);
  for (let i = 0; i < 200 && score > 0; i++) { const o = shuffled(ids), s = neighbourPairs(o, cols, slotCols); if (s < score) { best = o; score = s; } }
  return best;
}

function layout(o: PuzzleOptions, st: PuzzleState): void {
  const n = o.cols * o.rows, slotCols = Math.max(1, Math.ceil(n / o.rows)), slotRows = Math.ceil(n / slotCols), parts = cut(o, st.seed), order = mixedOrder(n, o.cols, slotCols), zs = shuffled(order.map((_, i) => i)), slotW = o.trayWidth / slotCols, slotH = 1 / slotRows;
  st.pieces = order.map((id, slot) => {
    const p = parts[id], freeX = Math.max(0, slotW - p.width), freeY = Math.max(0, slotH - p.height);
    return { id, x: Math.min(TRAY_START + o.trayWidth - p.width, TRAY_START + (slot % slotCols) * slotW + Math.random() * freeX), y: Math.min(1 - p.height, Math.floor(slot / slotCols) * slotH + Math.random() * freeY), placed: false, z: zs[slot] };
  });
  st.top = n;
}

const mod: ServerModule<PuzzleOptions, PuzzleState, PuzzleView, PuzzleMove> = {
  init(o) {
    const st: PuzzleState = { seed: randomInt(2 ** 31), top: 0, pieces: [] };
    layout(o, st);
    return st;
  },
  view(o, st, ctx) {
    const parts = cut(o, st.seed);
    return { image: o.image, trayWidth: o.trayWidth, ...(ctx.solo ? {} : { note: o.sharedNote }), pieces: st.pieces.map(p => ({ ...p, ...parts[p.id] })) };
  },
  act(o, st, move, ctx) {
    const piece = st.pieces.find(p => p.id === move.piece);
    if (!piece || piece.placed || !Number.isFinite(move.x) || !Number.isFinite(move.y)) return;
    const part = cut(o, st.seed)[piece.id];
    piece.x = Math.max(0, Math.min(TRAY_START + o.trayWidth - part.width, move.x)); piece.y = Math.max(0, Math.min(1 - part.height, move.y));
    if (piece.z !== st.top) piece.z = ++st.top;
    if (move.drop && Math.abs(piece.x - part.corner[0]) < o.snap && Math.abs(piece.y - part.corner[1]) < o.snap) {
      piece.x = part.corner[0]; piece.y = part.corner[1]; piece.placed = true;
    }
    if (st.pieces.every(p => p.placed)) return { solved: true, text: o.okText };
    ctx.push();
  },
};
export default mod;
