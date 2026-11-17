/** A rectangle in shares of the image size (0..1). */
export interface Area { x: number; y: number; w: number; h: number }
export interface SpotDifferenceOptions {
  /** Two images of the same view, paths in the game folder (images/x.png). */
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
  /** The differences. Server only. */
  areas: Area[];
  okText: string;
  /** Said on a click that hits nothing. */
  missText: string;
  /** Said when one of several differences is found. */
  foundText?: string;
  /** A miss counts as a wrong attempt (the game may charge for it). Off by default. */
  missIsBad?: boolean;
}
export interface SpotDifferenceState { found: number[] }
export interface SpotDifferenceView {
  left: string;
  right: string;
  leftLabel?: string;
  rightLabel?: string;
  /** Only the areas already found, to mark them. */
  found: Area[];
  total: number;
}
export interface SpotDifferenceMove { x: number; y: number }
