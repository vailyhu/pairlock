export interface ScratchRevealOptions {
  /** The layer to scrape off and the picture under it: same size, paths in the game folder. */
  top: string;
  bottom: string;
  /** Brush radius in shares of the image width (default 0.04). */
  brush?: number;
  /** Share of the picture that must be uncovered to solve (default 0.7). */
  need?: number;
  /** Resolution of the saved scrape mask (default 64 × 48). */
  cols?: number;
  rows?: number;
  okText: string;
  help?: string;
}
export interface ScratchRevealState {
  /** One character per mask cell, "1" uncovered. */
  mask: string;
}
export interface ScratchRevealView {
  top: string;
  bottom: string;
  brush: number;
  cols: number;
  rows: number;
  mask: string;
  /** Uncovered share, 0..1. */
  done: number;
  help?: string;
}
export interface ScratchRevealMove {
  /** Pointer positions since the last move, shares of the image size. */
  points: [number, number][];
  /** Mid-stroke: shared with the partner but not written to disk. */
  live?: boolean;
}
