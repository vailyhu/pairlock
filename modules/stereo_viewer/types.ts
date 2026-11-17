export interface StereoViewerOptions {
  /** The two halves (image paths), the same size. */
  left: string; right: string;
  /** Where the right half must be moved to line up, in shares of the image width and height. Server only. */
  target: { dx: number; dy: number };
  /** How close counts, in shares (default 0.01). */
  tolerance?: number;
  /** How far the right half can be moved each way, in shares (default 0.1). */
  range?: number;
  okText: string;
  help?: string; xLabel?: string; yLabel?: string;
}
export interface StereoViewerState { dx: number; dy: number; solved?: boolean }
export interface StereoViewerView { left: string; right: string; dx: number; dy: number; range: number; solved: boolean; help?: string; xLabel?: string; yLabel?: string }
export type StereoViewerMove = { dx: number; dy: number };
