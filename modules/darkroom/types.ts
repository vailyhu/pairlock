export interface DarkroomTray { id: string; name: string }
/** One step of the recipe: which tray, how many in-game minutes, and how far off still counts. Server only. */
export interface DarkroomStep { tray: string; minutes: number; tolerance: number }
export interface DarkroomOptions {
  trays: DarkroomTray[];
  steps: DarkroomStep[];
  /** The light the plate needs ("red"); white light during the work fogs it. */
  light: 'red' | 'off';
  /** Real seconds per in-game minute (e.g. 2). */
  secondsPerMinute: number;
  /** The developed picture, shown fading in while the plate lies in the first tray. */
  result: string;
  /** Real seconds the picture takes to fade in (default 6); not tied to the recipe, so it gives nothing away. */
  fadeSeconds?: number;
  texts: { white: string; red: string; off: string; dip: string; lift: string; reset: string; minutes: string; fogged: string; stepOk: string; done: string; wrongTray: string; whiteFog: string; tooShort: string; tooLong: string };
}
export interface DarkroomState { light: 'white' | 'red' | 'off'; step: number; inTray: string | null; since: number; fogged: boolean; solved?: boolean }
export interface DarkroomView {
  trays: DarkroomTray[]; light: 'white' | 'red' | 'off'; inTray: string | null;
  /** Real milliseconds the plate has been in the current tray. */
  elapsed: number; secondsPerMinute: number;
  /** Steps done; the picture shows from the first tray on. */
  done: number; fogged: boolean; solved: boolean;
  /** The picture, only once it has started to develop. */
  result?: string;
  /** Real seconds the picture takes to fade in. */
  fade?: number;
  texts: DarkroomOptions['texts'];
}
export type DarkroomMove = { light: 'white' | 'red' | 'off' } | { dip: string } | { lift: true } | { reset: true };
