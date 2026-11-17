export interface GuardStation {
  id: string;
  label: string;
  /** Place on the watcher's background, as a share of its width and height (0..1). */
  x?: number;
  y?: number;
  /** Working while the guard stands here gets the worker caught. Shown only to the watcher (side a). */
  danger?: boolean;
}
export interface GuardRoundOptions {
  /** The guard's round, in order; it starts again from the first. */
  stations: GuardStation[];
  /** Real seconds the guard stands at one station. Default 6. */
  stepSeconds?: number;
  /** The worker's clock: game minutes since midnight at the start, and minutes per station, so it matches a schedule found in the game. */
  clock?: { startMinute: number; minutesPerStation: number };
  /** Labels of the work steps, done in order by side b. */
  steps: string[];
  /** Shown after step i is done (same order as steps). */
  stepTexts?: string[];
  /** Shown to both when the worker is caught; all progress is lost. */
  caughtText: string;
  /** Game message sent when caught, "(GAME: <caughtMessage>)", e.g. for a world counter. Default "GUARD CAUGHT". */
  caughtMessage?: string;
  doneText: string;
  /** Line above side a (watcher) and side b (worker). */
  watchText?: string;
  workText?: string;
  /** Side a's picture (e.g. images/garden.png); stations are drawn on it by x, y. */
  background?: string;
  /** Side-bound by place and standing at neither place. */
  awayText?: string;
}
export interface GuardRoundState {
  /** When the round was (re)started, ms; null while paused. */
  t0: number | null;
  /** Stations passed before the last pause, so the guard and the clock go on where they stopped. */
  k0: number;
  /** Steps done. */
  done: number;
  caught: number;
  /** Last shared line (step text, caught). */
  last?: string;
}
export interface GuardRoundView {
  side: 'a' | 'b' | 'both' | null;
  running: boolean;
  awayText?: string;
  last?: string;
  /** Watcher (a, or both): the round and where the guard is now. */
  watch?: { text?: string; background?: string; stations: { label: string; x?: number; y?: number; danger: boolean }[]; at: number };
  /** Worker (b, or both): the clock and the steps; no station, no danger. */
  work?: { text?: string; minute: number | null; clock: string | null; steps: string[]; done: number };
}
/** {watch: true}: the panel is open, keep the guard walking. {step: n}: side b does step n (0-based, in order). */
export type GuardRoundMove = { watch: true } | { step: number };
