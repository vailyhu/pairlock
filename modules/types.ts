// Shared minigame contract. Explained in modules/CLAUDE.md.
export type Player = 0 | 1;
export type Side = 'a' | 'b' | 'both' | null;

export interface ServerCtx {
  id: string;
  player: Player;
  solo: boolean;
  side: Side;
  /** Where the other player stands for this panel (same rules as side; alone with `at` sides it still follows player 1's place, so check `solo`). */
  otherSide: Side;
  /** Values shared by the panels of one game and saved with it, e.g. a setting another panel reads. Key names come from options. */
  vars: Record<string, unknown>;
  /** Evaluates a world condition (same format as world.json), e.g. one given in options. */
  test(cond: unknown): boolean;
  /** Sends a fresh view to every connected player. */
  push(): void;
  /** One timer per panel. Not saved, so leave() must close live state. */
  later(ms: number, fn: () => void): void;
  clear(): void;
}

export interface MoveResult {
  /** Finished: the panel is marked done and takes no more moves. */
  solved?: boolean;
  /** Wrong attempt: the game may charge for it (game hook). */
  bad?: boolean;
  /** Shown to the acting player. */
  text?: string;
  /** Game message sent as "(GAME: <message>)" in place of the default solved or wrong one, or on its own. */
  message?: string;
  /** More game messages, each sent silently as "(GAME: <message>)" before the main one (e.g. one per row a check found right). */
  messages?: string[];
  /** Only for a message on its own: the narrator does not answer it right away. */
  silent?: boolean;
  /** Closes the window for the acting player, e.g. after a setting was installed. */
  close?: boolean;
}

export interface ServerModule<Options, State, View, Move> {
  init?(options: Options): State;
  /** What this player sees. Must never contain a solution. */
  view(options: Options, state: State, ctx: ServerCtx): View;
  /** One move. Changes state in place. */
  act(options: Options, state: State, move: Move, ctx: ServerCtx): MoveResult | void;
  /** Optional: true while the panel should stay open after solving to show something more (e.g. a closing animation), without keepAfterSolved. */
  keep?(options: Options, state: State): boolean;
  /** The player left, changed sides, or the server restarted. */
  leave?(options: Options, state: State, ctx: ServerCtx): void;
}

export interface ClientCtx<Move, View> {
  /** Sends a move to the server and resolves with the updated frame view. */
  act(move: Move): Promise<{ view?: View | null; error?: string }>;
  /** Full address of a file in the game folder (images/, icons/). */
  img?(path: string): string;
}

export interface ClientInstance<View> {
  update?(view: View): void;
  destroy?(): void;
}

export type ClientModule<View, Move> = (box: HTMLElement, view: View, ctx: ClientCtx<Move, View>) => ClientInstance<View> | void;

export interface PanelSide { label?: string; at?: string; [key: string]: unknown }

/** One entry in a game's panels.json. The browser never receives it. */
export interface PanelConfig<Options = unknown> {
  type: string;
  title: string;
  intro?: string;
  hints?: string[];
  hintCost?: string;
  /** A label each, or an object: `label` for the picker, `at` (a room id) to choose the side by where the player stands, other keys for the game's own notes. */
  sides?: { a: string | PanelSide; b: string | PanelSide };
  /** Sides follow the player (player 0 is a, player 1 is b), no picking, also alone. */
  sidesByPlayer?: boolean;
  /** The speaking tube keeps working after solving (e.g. a radio between the two eras). */
  talkAfterSolved?: boolean;
  /** The first entry whose world condition holds closes the panel: only its text is shown. */
  closed?: { if: unknown; text: string }[] | unknown;
  /** With `closed` given as one condition (not a list): the text shown while it holds. */
  closedText?: string;
  /** After solving the panel stays open and keeps drawing the module. */
  keepAfterSolved?: boolean;
  options: Options;
}

declare global {
  interface Window {
    DuoTypes: Record<string, ClientModule<any, any>>;
    /** Player-facing text from locales/<lang>.json (public/strings.js). */
    DuoStr?: { t(path: string, vars?: Record<string, unknown>): string };
  }
}
