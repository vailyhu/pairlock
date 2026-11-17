export type PocketColor = 'green' | 'red' | 'black';
export interface RoulettePocket { n: number; color: PocketColor }
export interface RouletteSector {
  label: string;
  /** Pocket numbers this sector setting covers; the fine dial picks one of them (1 = first). */
  pockets: number[];
}
export interface RouletteOptions {
  /** The wheel, in order around it. */
  pockets: RoulettePocket[];
  /** The SECTOR switch positions. */
  sectors: RouletteSector[];
  /** Pocket number that solves: a spin with the magnet on that lands here. Server only. */
  target: number;
  /** Highest value of the FINE dial. Default: the longest sector. */
  fineMax?: number;
  /** Shown to side b after a spin; {n} is the pocket number, {color} its colour name from colorNames. */
  spinText: string;
  doneText: string;
  /** Shown after a spin without the magnet that happened to land on the target (it does not count). */
  notMagnetText?: string;
  /** Control and button labels. */
  labels?: { sector?: string; fine?: string; magnet?: string; spin?: string };
  /** Colour names for {color}. */
  colorNames?: Partial<Record<PocketColor, string>>;
  /** Side a's picture (the control panel), optional. */
  background?: string;
  /** Side-bound by place and standing at neither place. */
  awayText?: string;
  /** Length of the wheel animation, ms. Default 2500. */
  spinMs?: number;
}
export interface RouletteState {
  sector: number;
  fine: number;
  magnet: boolean;
  /** Pocket numbers of past spins, newest last. */
  history: number[];
  spins: number;
  last?: string;
  /** Solved: the panel stays open on the winning spin. */
  won?: boolean;
}
export interface RouletteView {
  side: 'a' | 'b' | 'both' | null;
  awayText?: string;
  labels: { sector?: string; fine?: string; magnet?: string; spin?: string };
  /** Controls (a, or both): never the wheel's results. */
  control?: { sectors: string[]; sector: number; fineMax: number; fine: number; magnet: boolean; background?: string };
  /** Wheel (b, or both): never the controls. */
  wheel?: { pockets: RoulettePocket[]; history: number[]; spins: number; spinMs: number; last?: string; won: boolean };
}
/** Side a: {sector: index}, {fine: 1..fineMax}, {magnet: bool}. Side b: {spin: true}. */
export type RouletteMove = { sector: number } | { fine: number } | { magnet: boolean } | { spin: true };
