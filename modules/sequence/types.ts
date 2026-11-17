export interface SequenceItem {
  id: string;
  /** Image path in the game folder. */
  image: string;
  /** Its sketch, shown on the sketch side with the number of its slot. */
  sketch?: string;
  label?: string;
  /** World condition: the item is offered only while it holds (e.g. the picture is in the inventory). */
  if?: unknown;
}
export interface SequenceOptions {
  items: SequenceItem[];
  /** Slot names in order (e.g. hooks 1..5). */
  slots: string[];
  /** Item id per slot. Server only. */
  answer: string[];
  checkLabel: string;
  okText: string;
  badText: string;
  /** Heading of the loose items. */
  trayLabel: string;
  /** Two-sided use (panel "sides"): side a arranges, side b sees the sketches numbered by their place. */
  sketchText?: string;
  /** Shown to side a when the partner has the sketches. */
  arrangeText?: string;
}
export interface SequenceState {
  /** Item id per slot, or null. */
  placed: (string | null)[];
}
export interface SequenceItemView { id: string; image: string; label?: string }
export interface SequenceView {
  canArrange: boolean;
  slots?: string[];
  placed?: (string | null)[];
  tray?: SequenceItemView[];
  items?: SequenceItemView[];
  checkLabel?: string;
  trayLabel?: string;
  arrangeText?: string;
  /** Sketch side: sketches in a mixed order, each with the number of its slot. */
  sketches?: { image: string; number: number }[];
  sketchText?: string;
}
export type SequenceMove = { item: string; slot: number | null } | { check: true };
