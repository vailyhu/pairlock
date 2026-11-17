export interface MorseOptions {
  pattern: string;
  unit: number;
  answer?: string;
  hash?: string;
  textA: string;
  textB: string;
  holdLabel: string;
  guessLabel: string;
  button: string;
  runText: string;
  idleText: string;
  traceLabel: string;
  okText?: string;
  badText: string;
}
export interface MorseState {
  run: boolean;
  on: boolean;
  step: number;
  trace: string;
}
export interface MorseView {
  guessLabel: string;
  button: string;
  canHold: boolean;
  canSee: boolean;
  run: boolean;
  holdLabel?: string;
  textA?: string;
  textB?: string;
  runText?: string;
  idleText?: string;
  traceLabel?: string;
  on?: boolean;
  trace?: string;
}
export type MorseMove = { hold: boolean } | { guess: string };
