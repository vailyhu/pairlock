export interface GaugeBoardOptions {
  /** One row per gauge: one weight per control, then a constant. */
  matrix: number[][];
  /** Accepted gauge range. */
  band: [number, number];
  controls: string[];
  controlMax: number;
  gaugeMax: number;
  textA: string;
  textB: string;
  confirmLabel: string;
  okText?: string;
}
export interface GaugeBoardState {
  controls: number[];
}
export interface GaugeBoardView {
  canControl: boolean;
  canRead: boolean;
  labels?: string[];
  controls?: number[];
  controlMax?: number;
  textA?: string;
  textB?: string;
  gauges?: number[];
  band?: [number, number];
  gaugeMax?: number;
  confirmLabel?: string;
  ready?: boolean;
}
export type GaugeBoardMove = { control: number; delta: 1 | -1 } | { confirm: true };
