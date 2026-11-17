export interface DualWordOptions {
  /** 'word' (default): each side types a word. 'press': a two-key lock, each side only turns its key (one button). */
  mode?: 'word' | 'press';
  /** One word per side. Server only. Not used in press mode. */
  answers?: { a: string; b: string };
  /** Press mode: a world condition per side (e.g. {has: 'key_a'}); while it does not hold the side sees noKeyText instead of the button. */
  requires?: { a?: unknown; b?: unknown };
  /** Press mode: a world condition; while it holds two presses in time do not open (blockedText). */
  blockedIf?: unknown;
  /** Press mode texts: button label, no key, blocked, a key sprang back (the other came too late or never). */
  pressLabel?: string;
  noKeyText?: string;
  blockedText?: string;
  missText?: string;
  /** Either side may type either word (the two must still differ). */
  anyOrder?: boolean;
  /** Both words must arrive within this many milliseconds. Default 5000. Alone, one person types both at once. */
  windowMs?: number;
  /** Own word sent, the other has not typed yet. */
  waitText: string;
  /** The other's word came too long ago; this one now waits. Word mode. */
  lateText?: string;
  /** Word mode. */
  wrongText?: string;
  okText: string;
  /** Field placeholder and button. */
  placeholder?: string;
  sendLabel?: string;
  /** Shown to a player who has typed: the partner sees this. */
  otherTypedText?: string;
  /** Side-bound by place and standing at neither place. */
  awayText?: string;
  /** Alone: labels of the two fields. */
  soloLabels?: { a: string; b: string };
}
export interface DualEntry {
  t: number;
  /** Which answers the word matched ('a', 'b'); never the word itself. */
  m: ('a' | 'b')[];
}
export interface DualWordState {
  entry: { a?: DualEntry; b?: DualEntry };
  /** Last shared result line (wrong, late), shown to both. */
  last?: string;
}
export interface DualWordView {
  side: 'a' | 'b' | 'both' | null;
  mode: 'word' | 'press';
  /** Press mode: which of the player's sides may turn a key now (the others show noKeyText). */
  canPress?: { a?: boolean; b?: boolean };
  pressLabel?: string;
  noKeyText?: string;
  mine: boolean;
  otherTyped: boolean;
  status?: string;
  windowMs: number;
  placeholder?: string;
  sendLabel?: string;
  otherTypedText?: string;
  waitText: string;
  awayText?: string;
  soloLabels?: { a: string; b: string };
}
/** Word mode: {word}, alone {words}. Press mode: {press: true}, alone {press: 'a' | 'b'} (one button per key). */
export type DualWordMove = { word: string } | { words: { a: string; b: string } } | { press: true | 'a' | 'b' };
