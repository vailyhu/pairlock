export interface GearsOptions {
  /** Tooth counts of the gears on hand; any of them can go on either axle. */
  teeth: number[];
  /** The two gears mesh only when their tooth counts add up to this (fixed axle distance). */
  sum: number;
  /** Gears fitted at the start: [drive axle, driven axle]. */
  start: [number, number];
  /** Seconds the drive axle takes for one turn. The driven axle turns in base × driven / drive seconds. */
  base: number;
  /** Shared variable (ctx.vars) that receives the driven axle's period on install. */
  var: string;
  labelA: string;
  labelB: string;
  meshText: string;
  tooBigText: string;
  tooSmallText: string;
  button: string;
  /** Game message on install. Placeholders: {a}, {b}, {period}. */
  message: string;
  okText?: string;
}
export interface GearsState {
  a: number;
  b: number;
}
export interface GearsView {
  teeth: number[];
  a: number;
  b: number;
  sum: number;
  labelA: string;
  labelB: string;
  button: string;
  mesh: boolean;
  status: string;
}
export type GearsMove = { axle: 'a' | 'b'; teeth: number } | { install: true };
