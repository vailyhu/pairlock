/** One lever or switch: id, label, its positions as [value, label], and where it starts. */
export interface LocoControl { id: string; label: string; values: [string, string][]; initial: string }
/** One track segment: the km shown, its kind (matched by faults; never shown), and the right setting (a value, or "any"). Server only. */
export interface LocoSegment { km: string; track: string; right: Record<string, string> }
/** A wrong setting's consequence: every key in "if" must match (a control id against the setting, "track" against the segment). First match wins. */
export interface LocoFault { if: Record<string, string[]>; text: string }
export interface LocomotiveOptions {
  /** Controls per side: a and b. Alone, one player works both. */
  controls: { a: LocoControl[]; b: LocoControl[] };
  segments: LocoSegment[];
  faults: LocoFault[];
  texts: { segmentOk: string[]; bad?: string; ready: string; go: string; retry?: string; segment: string; waiting: string; stopped: string; partner?: string; speed?: string };
  gauges?: { speedStart?: number; speedOk?: number[]; speedBad?: number };
}
export interface LocomotiveState {
  seg: number;
  set: Record<string, string>;
  ready: { a: boolean; b: boolean };
  /** Result of the last run: ok or not, and its text. */
  last?: { ok: boolean; text: string };
  speed: number;
  done?: boolean;
}
export interface LocoControlView { id: string; label: string; values: [string, string][]; value: string; mine: boolean }
export interface LocomotiveView {
  controls: LocoControlView[];
  /** 1-based segment number and its km, or the number after the last when stopped. */
  segment: number; segments: number; km: string; speed: number;
  ready: { a: boolean; b: boolean }; mySide: 'a' | 'b' | 'both';
  last?: { ok: boolean; text: string };
  done: boolean;
  texts: { ready: string; go: string; segment: string; waiting: string; stopped: string; partner?: string; speed?: string };
}
export type LocomotiveMove = { set: { control: string; value: string } } | { ready: boolean } | { go: true };
