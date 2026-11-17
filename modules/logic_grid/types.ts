export interface LogicGridColumn {
  label: string;
  values: string[];
}
export interface LogicGridOptions {
  /** Row heading and the row names (e.g. people). */
  rowLabel: string;
  rows: string[];
  /** The other aspects, one select per row and column (e.g. day, year). */
  columns: LogicGridColumn[];
  /** The right value per row, in column order. Server only. */
  answer: Record<string, string[]>;
  checkLabel: string;
  okText: string;
  badText: string;
  /** Placeholder of an empty select. */
  emptyLabel: string;
  /** Wrong check also says how many rows are fully right ({n}). Off by default: then it only says "not right". */
  countText?: string;
  /** Every row is right as a set: the same values in any column order (e.g. two owners of one world). */
  unordered?: boolean;
  /** Only these rows are unordered. */
  unorderedRows?: string[];
  /** Shown only when two people share the table. */
  sharedNote?: string;
}
export interface LogicGridState {
  /** Chosen value per row and column; "" is empty. */
  cells: Record<string, string[]>;
}
export interface LogicGridView {
  rowLabel: string;
  rows: string[];
  columns: LogicGridColumn[];
  cells: Record<string, string[]>;
  checkLabel: string;
  emptyLabel: string;
  note?: string;
}
export type LogicGridMove = { row: string; col: number; value: string } | { check: true };
