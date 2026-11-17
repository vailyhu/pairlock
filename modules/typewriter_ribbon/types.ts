export interface TypewriterRibbonOptions {
  /** The text typed last (server only; the view gets single struck letters, never the text). */
  text: string;
  /** Strikes shown in one window of the ribbon (default 22). */
  lineLength?: number;
  /** Share of extra, fainter old strikes mixed in, 0..1 (default 0.3). */
  noise?: number;
  /** What must be typed in (checked with engine/codes.js norm: accents, case, punctuation ignored); a guess containing it counts. */
  answer: string;
  /** Background picture of the ribbon (optional). */
  image?: string;
  answerLabel: string;
  answerButton?: string;
  mirrorLabel?: string;
  backLabel?: string;
  nextLabel?: string;
  help?: string;
  okText: string;
  badText: string;
}
export interface TypewriterRibbonState { pos: number; mirror: boolean; solved?: boolean }
/** One strike: a letter, where it sits in the window (shares), its tilt in degrees, its strength 0..1. Faint old strikes are mixed in. */
export interface RibbonGlyph { c: string; x: number; y: number; r: number; a: number }
export interface TypewriterRibbonView {
  glyphs: RibbonGlyph[];
  mirror: boolean;
  /** Window number and how many there are. */
  page: number; pages: number;
  image?: string;
  answerLabel: string; answerButton?: string; mirrorLabel?: string; backLabel?: string; nextLabel?: string; help?: string;
  /** After solving: the text in plain letters. */
  plain?: string;
}
export type TypewriterRibbonMove = { scroll: number } | { mirror: boolean } | { answer: string };
