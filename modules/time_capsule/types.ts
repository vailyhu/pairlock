export interface Choice { id: string; label: string }
export interface TimeCapsuleOptions {
  /** What the evidence is packed in, and where it is hidden. */
  containers: Choice[];
  places: Choice[];
  /** Shown to the deciding side (a, or both alone). */
  textA: string;
  /** Shown to the other side, who cannot choose. */
  textB?: string;
  containerLabel?: string;
  placeLabel?: string;
  button: string;
  /** Text kept on the panel after the choice. {container} and {place} become the chosen labels. */
  doneText?: string;
  /** Game message template; {container} and {place} become the chosen ids. Default: CAPSULE {container} {place}. */
  message?: string;
}
export type TimeCapsuleState = Record<string, never>;
export interface TimeCapsuleView {
  canChoose: boolean;
  text: string;
  containers?: Choice[];
  places?: Choice[];
  containerLabel?: string;
  placeLabel?: string;
  button?: string;
}
export interface TimeCapsuleMove { container: string; place: string }
