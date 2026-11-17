/** A cell is a bitmask of open sides: north 1, east 2, south 4, west 8. */
export type Cell = number;

export interface PipeEnd {
  row: number;
  col: number;
  /** The open side that connects outside the grid. */
  side: 1 | 2 | 4 | 8;
}
export interface PipeMark {
  row: number;
  col: number;
  label: string;
  color: string;
}
export interface PipesOptions {
  /** Starting rotation of every cell, as the author scrambled it. */
  grid: Cell[][];
  source: PipeEnd;
  exits: PipeEnd[];
  marks?: PipeMark[];
  legend?: string;
  leakText: string;
  /** {reached} and {total} are filled in. */
  progressText: string;
  okText: string;
  sharedNote?: string;
}
export interface PipesState {
  grid: Cell[][];
}
export interface PipesFlow {
  /** Cells the fluid reaches, as "row,col". */
  wet: string[];
  leak: boolean;
  reached: number;
}
export interface PipesView extends PipesFlow {
  grid: Cell[][];
  marks: PipeMark[];
  legend?: string;
  status: string;
  note?: string;
}
export interface PipesMove {
  row: number;
  col: number;
}
