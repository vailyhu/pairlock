export interface ParamValue {
  id: string;
  label: string;
}
export interface Param {
  id: string;
  label: string;
  values: ParamValue[];
  /** Starting value id. Must match the world's starting variable for this parameter. */
  initial: string;
}
export interface ParamConsoleTexts {
  /** Above the controls, optional. */
  text?: string;
  /** Code field label and button, when the console opens with a code. */
  codeLabel?: string;
  codeButton?: string;
  /** Wrong code. */
  wrongCode?: string;
  /** Shown once the code was accepted. */
  unlockedText?: string;
}
export interface ParamConsoleOptions {
  params: Param[];
  /** World condition that opens the console (ctx.test), e.g. a solved panel or a variable set by a game message. */
  unlock?: unknown;
  /** Or a typed code opens it (plain text, checked like every answer; server only). */
  unlockCode?: string;
  /** Shown while locked. */
  lockedText?: string;
  /** Message to the world on each change; `{param}` and `{value}` are filled. Default "PARAM {param} {value}". */
  message?: string;
  texts?: ParamConsoleTexts;
}
export interface ParamConsoleState {
  values: Record<string, string>;
  /** The code was accepted. */
  unlocked?: boolean;
}
export interface ParamConsoleView {
  locked: boolean;
  /** Locked and a code can open it. */
  needsCode: boolean;
  lockedText?: string;
  params: { id: string; label: string; values: ParamValue[]; value: string }[];
  texts: ParamConsoleTexts;
}
export type ParamConsoleMove = { param: string; value: string } | { code: string };
