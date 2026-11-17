export interface ShutterLampOptions {
  /** Shutters around the drum at the start, true = open. */
  start: boolean[];
  /** The flash group seen from outside and the period that count as right. */
  goal: { runs: number[]; period: number };
  /** Shared variable (ctx.vars) with the drum's period in seconds, e.g. written by a gears panel. */
  periodVar: string;
  /** Period while that variable is unset. */
  startPeriod: number;
  textA: string;
  holdLabel: string;
  textB: string;
  centerLabel: string;
  /** How the light looks from outside. Placeholders: {open}, {n}, {runs}. */
  patterns: { none: string; steady: string; single: string; uneven: string };
  /** Placeholders: {pattern}, {period}. */
  lookText: string;
  readyText: string;
  waitText: string;
  button: string;
  /** Game message on ignition. Placeholders: {code}, {shutters}, {pattern}, {period}. */
  message: string;
  /** {code} for a right setting, a first wrong one (one more try) and a later wrong one (final). */
  codes: { good: string; firstBad: string; bad: string };
}
export interface ShutterLampState {
  shutters: boolean[];
  crank: boolean;
  tries: number;
}
export interface ShutterLampView {
  canHold: boolean;
  canSet: boolean;
  crank: boolean;
  textA?: string;
  holdLabel?: string;
  textB?: string;
  centerLabel?: string;
  shutters?: boolean[];
  period?: number;
  look?: string;
  ready?: boolean;
  gate?: string;
  button?: string;
}
export type ShutterLampMove = { hold: boolean } | { toggle: number } | { fire: true };
