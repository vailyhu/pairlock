export type KnockSide = 'a' | 'b';
export interface KnockingTexts { listen: string; heard: string; silence: string; again: string }
export interface KnockingOptions {
  /** Per side, the pairs it hears: [row, col] = row knocks, a pause, col knocks. */
  sequences: { a: [number, number][]; b: [number, number][] };
  /** Time from one knock to the next within a group (default 700). */
  knockMs?: number;
  /** Pause between the two groups of a pair (default 1600). */
  groupPauseMs?: number;
  /** Pause between two pairs (default 3200). */
  pairPauseMs?: number;
  texts: KnockingTexts;
}
export interface KnockingState {
  /** When each side's playback started (ms), or null. */
  play: { a: number | null; b: number | null };
}
export interface KnockingChannel {
  side: KnockSide;
  playing: boolean;
  /** Pairs heard in full so far. */
  heard: [number, number][];
  /** The pair being knocked: knocks so far in its first and second group. */
  current: [number, number] | null;
  /** All knocks so far; a rise means a new knock (the wall trembles). */
  knocks: number;
}
export interface KnockingView {
  texts: KnockingTexts;
  /** The side(s) this player hears: one where they stand; both when alone without places. Empty: not at either place (silence). */
  channels: KnockingChannel[];
  knockMs: number;
}
export type KnockingMove = { listen: true };
