# Minigame modules: shared contract

Each minigame is one folder: `server.ts`, `client.js`, `types.ts`, `CLAUDE.md`. **The API is the same for every module.** If a new module needs something else, extend this contract and the framework first; do not work around it inside the module. These files are generic: the solution of a concrete game never goes here, it belongs in that game's `panels.json`.

## Types

The contract is `modules/types.ts`; read it first. Each module has its own `types.ts` with its `Options`, `State`, `View` and `Move`. Module-specific needs go in `options`; the API itself stays shared. Check with `npx -y -p typescript tsc --noEmit -p .` (development only, no runtime dependency).

## Server: `server.ts`

```ts
const mod: ServerModule<Options, State, View, Move> = {
  init(options),                     // initial saved state. Optional.
  view(options, state, ctx),         // what this player sees. REQUIRED. Must never contain a solution.
  act(options, state, move, ctx),    // one move, changes state in place. REQUIRED. Returns { solved?, bad?, text? }, or nothing.
  leave(options, state, ctx),        // the player left, changed sides, or the server restarted: close live state. Live modules only.
  keep(options, state),              // optional: true while the panel should stay open after solving to show more (e.g. a closing animation). Otherwise solving closes it unless keepAfterSolved.
};
export default mod;
```

- Node runs `.ts` directly by stripping types, so only erasable syntax is allowed: no `enum`, no parameter properties.
- `options`: the `options` object of the panel's entry in `panels.json`. Never sent to the browser.
- `state`: the module's saved state, plain JSON. The framework keeps its own data (sides, tube) apart from it.
- `ctx`: `id`, `player` (0 or 1), `solo`, `side` (`a`, `b`, `both`, or `null` before choosing, or when a place-bound player stands at neither place), `otherSide` (the other player's side by the same rules; check `solo` too), `push()` (send fresh views to everyone), `later(ms, fn)` and `clear()` (one timer per panel, not saved), `vars` (values shared by every panel of the game and saved, e.g. a setting another panel reads; key names come from `options`), `test(condition)` (a world condition, same format as `world.json`).
- `{solved: true}`: the framework sends `(GAME: SOLVED, title)`. `{bad: true}`: it sends `(GAME: WRONG, title)`. Any penalty comes from the game's own `server.js`.
- `{message}`: a game message `(GAME: <message>)` the world or narrator reads, in place of the default solved or wrong one, or on its own (then `silent` is allowed). `{messages: [...]}`: more game messages, each sent silently before the main one (e.g. one per row a check found right). `{close: true}` closes the acting player's window, e.g. after installing a setting that can still change. The `text` of a solving move stays as the panel's text when it is opened again.
- Check answers with `check` from `engine/codes.js`.

## Client: `client.js`

Browsers cannot run TypeScript, so clients stay JavaScript, checked through `// @ts-check` and JSDoc (see `gauge_board/client.js`). `code_lock` and `morse` still have `// @ts-nocheck`.

```js
window.DuoTypes.<type> = (box, view, ctx) => ({ update(view), destroy() });
```

- Draws into `box` and moves with `ctx.act(move)`. Evaluation happens on the server. `update` and `destroy` are for live modules only.
- Colors come from the game's theme (`var(--ink)` and so on). It must work on a phone.
- No hard-coded player text and no solutions: text comes from `panels.json` through the `view`, so it can be translated later.
- The folder name is the type name. File names, identifiers and comments are in English.

## What the framework provides (`engine/modules.js`, `public/modules.js`)

Window, title, intro, message line, hints (`hints`, `hintCost`; only hints already requested reach the browser), side picker and speaking tube (`sides: {a, b}`), marking as solved, locking through `panelAvail`, closing through `closed`. Do not rewrite these in a module. The frame's own player text is in `locales/<lang>.json` under `ui.frame`; a module's text comes from its `options`.

## `panels.json`

```json
{ "<panel id>": { "type": "<module>", "title": "Title of the solution", "intro": "…", "hints": ["…"], "hintCost": "…", "sides": {"a": "…", "b": "…"}, "closed": [{"if": <condition>, "text": "…"}], "options": { } } }
```

The panel id, used in saves and in `[panel:<id>|…]` links, follows the module name: `<module>` for a single panel in a game, `<module>_<role>` for several (`code_lock_stairs`). Framework fields sit at the top level, everything module-specific in `options`. `title` links to `solved:<title>` rules. `closed`: the first entry whose world condition holds shuts the panel; only its text is shown and moves are refused. It may also be one condition with the text in `closedText` (`"closed": {"solved": "…"}, "closedText": "…"`). `sides`: each side is a label, or an object `{label?, at?, …}` (other keys are the game's own notes, e.g. planchette's `axis`); without a label the picker shows the frame's generic `ui.frame.sideA`/`sideB`. `at` (a room id): the side follows where the player stands (`world.loc`), also alone; no picker, no side switching; a player at neither place gets `side: null` and the module's view must handle it (the frame shows no picker). The speaking tube works as for any two-sided panel. `sidesByPlayer: true`: the side follows the player (0 is `a`, 1 is `b`), no picker, also alone (two-era games). `talkAfterSolved: true`: the speaking tube keeps working after solving (the radio between the eras). `keepAfterSolved: true`: after solving the panel stays open and keeps drawing the module (the module must accept no further moves on its own or ignore them), e.g. the UV marks stay readable. The server never serves this file.

## Tests

`tools/test_modules.js`, plus a test per module where needed (`tools/test_morse.js`, `tools/test_gauge_board.js`). Every new module needs cases for a correct move, a wrong move, and a view that contains no solution.
