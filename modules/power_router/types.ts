export interface PowerConsumer {
  id: string;
  label: string;
  /** The room this consumer feeds; it cannot be switched off while a player stands there. */
  room?: string;
  /** Always powered, cannot be switched (life support, the control room itself). */
  fixed?: boolean;
  /** Powered at the start. Must match the world's starting `power_<id>` variable. */
  start?: boolean;
}
export interface PowerRouterOptions {
  consumers: PowerConsumer[];
  /** How many switchable consumers may be on at once. */
  capacity: number;
  /** World condition: full power, no limit, everything on and nothing can be switched off (e.g. after the solar repair). */
  fullIf?: unknown;
  /** Message to the world on each switch; `{id}` and `{state}` (on/off) are filled. Default "POWER {id} {state}". */
  message?: string;
  text: string;
  /** Shown when the capacity is used up; `{capacity}` is filled. */
  fullText: string;
  /** Shown when the consumer's room is occupied; `{label}` is filled. */
  occupiedText: string;
  /** Shown under the list once full power is back. */
  fullPowerText: string;
  onLabel: string;
  offLabel: string;
  fixedLabel: string;
  /** Status line; `{used}` and `{capacity}` are filled. */
  usageText: string;
}
export interface PowerRouterState {
  on: Record<string, boolean>;
}
export interface PowerRouterView {
  text: string;
  consumers: { id: string; label: string; on: boolean; fixed: boolean }[];
  full: boolean;
  status: string;
  onLabel: string;
  offLabel: string;
  fixedLabel: string;
}
export type PowerRouterMove = { toggle: string };
