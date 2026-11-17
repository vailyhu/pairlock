export interface AirlockControl {
  id: string;
  /** Which side handles it: 'a' or 'b'. Alone, one player handles both. */
  side: 'a' | 'b';
  label: string;
  /** The positions, in display order. */
  values: { id: string; label: string }[];
  /** Starting position (value id). */
  start: string;
}
export interface AirlockGauge {
  id: string;
  /** Which side sees it. */
  side: 'a' | 'b';
  label: string;
  unit?: string;
  /** Upper end of the dial, for drawing only. */
  max: number;
  start: number;
}
export interface AirlockStep {
  /** The move that completes this step. */
  control: string;
  value: string;
  /** World condition that must hold for the step to take (e.g. the outer door is shut); otherwise `blockedText`. */
  if?: unknown;
  blockedText?: string;
  /** Gauge values once the step is done (only the listed ones change). */
  gauges?: Record<string, number>;
  /** Shown to both sides when the step is done. */
  text?: string;
}
export interface AirlockFault {
  /** A wrong move this rule matches: control and optionally value, optionally only before step `before` (index). First match wins. */
  control: string;
  value?: string;
  before?: number;
  text: string;
  /** Go back to this step index (0 = start); controls and gauges return to their values at that step. Default: stay, the move is undone. */
  back?: number;
}
export interface AirlockOptions {
  controls: AirlockControl[];
  gauges: AirlockGauge[];
  /** The correct order. Never sent to the browser. */
  steps: AirlockStep[];
  faults?: AirlockFault[];
  textA: string;
  textB: string;
  /** A move that is neither the next step nor a listed fault: the move is undone with this text. */
  wrongText: string;
  okText?: string;
  resetLabel: string;
}
export interface AirlockState {
  step: number;
  controls: Record<string, string>;
  gauges: Record<string, number>;
  /** Last shared line (step done, fault, blocked), shown to both sides. */
  note?: string;
}
export interface AirlockView {
  text: string;
  controls: { id: string; label: string; values: { id: string; label: string }[]; value: string }[];
  gauges: { id: string; label: string; unit?: string; max: number; value: number }[];
  note?: string;
  resetLabel: string;
  done: boolean;
}
export type AirlockMove = { set: { control: string; value: string } } | { reset: true };
