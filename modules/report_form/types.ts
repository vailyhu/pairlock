export interface ReportQuestion {
  text: string;
  choices: string[];
  /** The right choice, plain or as a hash salted with "<panel id>.<question index>" (engine/codes.js). */
  answer?: string;
  hash?: string;
}
export interface ReportFormOptions {
  questions: ReportQuestion[];
  choose: string;
  missingText: string;
  button: string;
  /** Game message on signing. Placeholders: {good}, {total} and every key of values. */
  message: string;
  /** Shown after signing, also when the panel is opened again. Same placeholders. */
  okText: string;
  /** Extra placeholders from the game's state: the first entry whose world condition holds (no "if" = always). */
  values?: Record<string, { if?: unknown; value: string }[]>;
}
export interface ReportFormState {
  picks: (string | null)[];
}
export interface ReportFormView {
  questions: { text: string; choices: string[] }[];
  picks: (string | null)[];
  choose: string;
  button: string;
}
export type ReportFormMove = { pick: number; value: string | null } | { sign: true };
