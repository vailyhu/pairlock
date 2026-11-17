export interface PuzzleOptions {
  /** Image path in the game folder, e.g. images/x.png. */
  image: string;
  cols: number;
  rows: number;
  /** How far inner corners wander, as a share of a piece size. 0 gives a straight grid. */
  jitter: number;
  /** How close a dropped piece must be to its place, as a share of the image size. */
  snap: number;
  /** Width of the loose-piece area, as a share of the image width. */
  trayWidth: number;
  okText: string;
  /** Shown only when two people share the board. */
  sharedNote?: string;
}
export interface PieceState {
  id: number;
  x: number;
  y: number;
  placed: boolean;
  z: number;
}
export interface PuzzleState {
  seed: number;
  top: number;
  pieces: PieceState[];
}
export interface PieceView extends PieceState {
  /** Outline relative to the piece's own corner, in shares of the image size. */
  outline: [number, number][];
  /** The piece's corner in the image. */
  corner: [number, number];
  width: number;
  height: number;
}
export interface PuzzleView {
  image: string;
  trayWidth: number;
  note?: string;
  pieces: PieceView[];
}
export interface PuzzleMove {
  piece: number;
  x: number;
  y: number;
  /** True when the piece is released; only then can it lock into place. */
  drop?: boolean;
  /** Mid-drag update: shared with the partner but not written to disk. */
  live?: boolean;
}
