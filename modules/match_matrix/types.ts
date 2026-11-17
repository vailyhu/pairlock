export interface MatchRow {
  id: string;
  label: string;
  /** Game file path (images/…), shown small, large on tap. */
  image?: string;
}
export interface MatchCol {
  /** Unique across all groups. */
  id: string;
  label: string;
  image?: string;
  /** Longer text shown in the heading (clamped, whole on tap), e.g. a quote. */
  text?: string;
}
export interface MatchGroup {
  label: string;
  cols: MatchCol[];
}
export interface MatchReward {
  text?: string;
  image?: string;
}
export interface MatchMatrixOptions {
  rows: MatchRow[];
  groups: MatchGroup[];
  /** The right column id per row, in group order. Server only. */
  answer: Record<string, string[]>;
  /** Shown per row once a check finds it right in every group. A plain string is a text. */
  rowReward?: Record<string, string | MatchReward>;
  /** World message per row when a check first finds it right; `{row}` is filled. Default "MATRIX {row} ok". */
  rowMessage?: string;
  checkLabel: string;
  okText: string;
  badText: string;
  /** A wrong check says how many rows are right ({n}) in place of badText. */
  countText?: string;
  /** Shown only when two people share the table. */
  sharedNote?: string;
}
export type Mark = 'y' | 'n';
export interface MatchMatrixState {
  /** Marks per row and column id; a missing key is empty. */
  cells: Record<string, Record<string, Mark>>;
  /** Rows a check has found right (their reward is shown, their message sent once). */
  done: string[];
}
export interface MatchMatrixView {
  rows: MatchRow[];
  groups: MatchGroup[];
  cells: Record<string, Record<string, Mark>>;
  rewards: Record<string, MatchReward>;
  checkLabel: string;
  note?: string;
}
export type MatchMatrixMove = { row: string; col: string } | { check: true };
