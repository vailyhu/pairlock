export interface PlanchetteCell {
  /** What the cell shows on the board: one letter or digit, or a word (YES, NO, GOODBYE). */
  label: string;
  /** Centre in shares of the board's width and height. */
  x: number; y: number;
  /** Radius in shares of the board's width. */
  r: number;
}
export interface PlanchetteTexts {
  ready: string; waiting: string; written: string;
  left: string; right: string; up: string; down: string; clear: string;
}
export interface PlanchetteOptions {
  /** Board picture (game folder path). */
  board: string;
  /** Board width / height, so the radius works in both directions (default 1). */
  aspect?: number;
  cells: PlanchetteCell[];
  /** The words to write, in order. Server only; spaces and punctuation are ignored, accents are not told apart. */
  words: string[];
  /** Spelled by the pointer by itself after the last word, one cell per msPerLetter; view only. A string (one word) or a list of words. */
  afterWords?: string | string[];
  msPerLetter?: number;
  /** One arrow press moves the pointer by this share (default 0.02). */
  step?: number;
  /** A letter that does not continue the word: the word so far is cleared (no penalty). */
  wrongText: string;
  /** A word completed: one text for all, or one per word. */
  wordOkText?: string | string[];
  texts: PlanchetteTexts;
}
export interface PlanchetteState {
  x: number; y: number;
  ready: { a: boolean; b: boolean };
  /** Index of the word being written. */
  word: number;
  /** Cell labels written so far in the current word. */
  cur: string[];
  /** Words already completed (as the players wrote them). */
  done: string[];
  /** Time the closing spelling started (ms), once every word is written. */
  after?: number;
}
export interface PlanchetteAfterToken { ch: string; x?: number; y?: number }
export interface PlanchetteView {
  board: string;
  x: number; y: number;
  /** Which axis this player moves: x, y, or both (alone). */
  axis: 'x' | 'y' | 'both';
  step: number;
  ready: { a: boolean; b: boolean };
  /** The ready flag this player sets: a, b, or both (alone). */
  me: 'a' | 'b' | 'both';
  done: string[];
  cur: string;
  texts: PlanchetteTexts;
  /** Only after the last word: the closing spelling and how far it has got. */
  after?: { tokens: PlanchetteAfterToken[]; elapsed: number; msPerLetter: number };
}
export type PlanchetteMove = { dx: number } | { dy: number } | { ready: true } | { clear: true };
