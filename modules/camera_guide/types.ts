/** A rectangle in shares of the image size (0..1): `[left, top, right, bottom]`, or `{x, y, w, h}`. */
export type Rect = [number, number, number, number] | { x: number; y: number; w: number; h: number };
export type Dir = 'left' | 'right' | 'up' | 'down';
export interface CameraGuideOptions {
  /** The watcher's picture (side a), e.g. a camera image with the mark already drawn on it. Path in the game folder. */
  imageA: string;
  /** The picture of the place (side b), without a mark; the player taps on it. */
  imageB: string;
  /** Optional: the module draws a ring on imageA (shares: x, y, and r of the width). Leave out when the mark is in the image. */
  marker?: { x: number; y: number; r: number };
  /** Where a tap on imageB counts. Server only. */
  target: Rect;
  okText: string;
  /** Told to side b on a tap that misses. */
  missText: string;
  /** Shown while the other player is not at the other place (two players only). */
  waitText?: string;
  /** Shown under imageA on side a (e.g. signal strength). */
  hintLine?: string;
  /** Captions under the pictures. */
  labelA?: string;
  labelB?: string;
  /** Side bound by place and standing at neither place. */
  awayText?: string;
  /** The last tap shows on imageA at the same shares too (true by default; right when imageA is derived from imageB). */
  showOnA?: boolean;
  /** Optional text for side a after a miss: `line` with `{dir}` (and `{dist}`), direction words, `join` between two, distance words by closeness. */
  dirTexts?: { line: string; left: string; right: string; up: string; down: string; join?: string; near?: string; mid?: string; far?: string };
  /** A miss counts as a wrong attempt (the game may charge for it). Off by default. */
  missIsBad?: boolean;
  /** How long a tap stays visible, ms. Default 2500. */
  flashMs?: number;
}
export interface CameraGuideState {
  /** Counts taps, so clients flash each one once. */
  n: number;
  last?: { x: number; y: number; t: number; hit: boolean; dirs: Dir[]; dist: 'near' | 'mid' | 'far' | null };
}
export interface CameraGuideView {
  side: 'a' | 'b' | 'both' | null;
  /** Only the pictures this side sees. */
  imageA?: string;
  imageB?: string;
  marker?: { x: number; y: number; r: number };
  labelA?: string;
  labelB?: string;
  hintLine?: string;
  /** Side a: where the last tap fell, in words (only with dirTexts). */
  feedback?: string;
  /** The last tap: on imageB, and on imageA when showOnA. `age` in ms at the time of the view. */
  poke?: { n: number; x: number; y: number; hit: boolean; age: number; onA: boolean };
  flashMs: number;
  /** The other player is not at the other place yet. */
  waiting?: string;
  awayText?: string;
  /** Side b (or alone) may tap now. */
  canTap: boolean;
}
export interface CameraGuideMove { x: number; y: number }
