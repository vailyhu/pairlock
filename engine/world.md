# World model (`world.js`)

Code and JSON keys English, player-facing text Hungarian. `world.js` holds state, inventory, actions, conditions, validation, reachability, routes; field summary in its header. Tests: `node tools/test_world_v2.js`, `node tools/test_players.js`, `node tools/test_eras.js`.

## Principles (decided 2026-11-07)

- Everything is an entity (room, thing, part, door, carried thing) with an `id`; all state is saved under that id; conditions and actions may name any `id.prop`.
- Visibility: a thing shows only if its parent shows, an `in` parent is open (or has no `open` prop), it is not `hidden`, its `visibleIf` holds, and in a dark room (`lit: false`) only `glows` things show. The interpreter gets only what shows and only public props (`open`, `lit`, or `public: true`), never `hidden`, vars or solution props.
- Text follows events: whatever can move away is a `mention` in the parent's `{contents}`, or the parent's text is conditional; what is gone is never described. `validate` warns about a movable thing named in fixed parent text.
- Knowledge shared by default but stored per player (`seen: [0,1]`), so a game can switch to `knowledge: "perPlayer"`.
- Not in the model, on purpose: automatic sentence building from children (clumsy in Hungarian; only hand-written `mention` halves), physics or weight (a number prop + condition is enough), characters/NPCs, any state change by the AI (interpreter gives intent, engine decides).
- **Limit:** conditions and actions stay simple. Anything beyond becomes the game's own module; the JSON must not turn into a programming language.

## Base model

```ts
interface Item {
  id: string; name: string; aliases?: string[]; location: string;
  text: string | Record<State, string>;
  images?: string[];
  state?: { initial: State; values: State[] };   // absent = no state
  pickable?: { id: string; name: string };
  panel?: { id: string; label: string; if?: Condition };
  when?: { if: Condition; text?: string; images?: string[]; panel?: Panel | null; do?: Action }[];   // first match wins
  onLook?: Action;
  visibleIf?: Condition;
  actions?: Record<string, Action>;   // key: verb, or "use:<inventory id>". No such action = the narrator describes the attempt
}
interface Action {
  requires?: Condition; otherwise?: string; forbidden?: string;
  setState?: State; setItem?: { item: string; state: State };
  give?: { id: string; name: string }[]; remove?: string[];
  say?: string; images?: string[]; panel?: Panel; effect?: string; emit?: string; setVar?: Record<string, string>;
}
type Condition = { item, state } | { has } | { solved } | { seen } | { visited } | { var, is } | { all: [] } | { any: [] } | { not };
```

Other `world.json` fields: `start` (one room, or one per player `["hall74", "hall"]`, player 0 first), `rooms` (`name`, `aliases`, `text`, `firstText`, `image`, `exits`: `requires`, `otherwise`, `panel`, `aliases`), `rules` (`on`: `solved:<title>` or a custom event, `if`, `do`), `inventory`, `vars`, `status` (template), `onMessage`, `panelTitles`, `panelIds`, `panelAvail` (when a panel is usable), `mustReach`, `texts`. Rooms may have `into` / `inside` phrases ("a konyhába", "a konyhában") for joint-move sentences.

## Model v2 (2026-11-07)

All optional; older worlds run unchanged. Old saves get new fields on load (`W.upgrade`).
- Parents: `location` may be an item id; `rel`: in/on/under/behind/part. A closed parent (`props.open === false`) hides what is in it.
- `props` (several properties per entity, rooms too); `state` is the property "state".
- `hidden` + the `reveal` action.
- Doors: `kind: "door"`, `between`, `closedText`; an exit's `door`.
- Room and item `text` as a list of `{if, text}`.
- `{contents}` / `{contents:prefix}` / `{contents@other:prefix}`: the `mention` of what is directly in/on it (or in/on another entity) now; taken things are no longer listed; a `mention` may itself be a `{if, text}` list.
- Old-style `pickable` leaves its place when taken. `carry`: the entity itself goes to the inventory under its own id.
- `glows` with a dark room (`lit: false`).
- Actions: `set`, `inc`, `reveal`, `moveTo`, `take`.
- Room `image` as a list of `{if, image}` (first that holds wins); shown on first visit and again whenever the room's picture changed since last shown there (`s.roomImg`, `W.roomImage`; 2026-11-14).
- `after: {turns, do}`.
- `notify: {at, text, images?}` (heard or seen in another room, 2026-11-13): a player of the same thread standing there gets it in the reply; one in the other thread gets a notice without a model call.
- Conditions: `{is: "id.prop", eq|ne|gt|lt}`, `{where, at}`, `{player: 0|1|"any"|"both"|"self"|"other", at}`, `{together}`, `{knows, who}` (`world.knowledge`: `"shared"` default or `"perPlayer"`). `self`/`other` are relative to the acting or walking player: a room only one may enter is an exit with `requires: {not: {player: "other", at: room}}`; a joint move into it takes only the speaker (2026-11-15).
- Rule events: `set:id.prop`, `enter:room`, `leave:room`, `take:id`, `look:id`, `turn`; `once`.

## Player genders (2026-11-15)

The run's `genders` (home page toggle; old saves have none: player 0 female, 1 male) reach the world through `W.setPlayers` before each turn. Room `avatarText: {f, m}` is written on entering, one line "<name>: <text>" per player then in the room (once per reply; also under the opening for the start room). Fixed texts may hold `[g:self|female text|male text]` (`self` = acting player, `other`, `0`, `1`). The narrator's system prompt ends with a line naming each player's gender (fixed per run, so the cache holds). Nothing in a game's progress may depend on gender.

## Two eras (e.g. Tihany)

`game.json` `eras: ["1974", "Ma"]`: the builder writes every room and item twice, exits stay within their era, `start` is per player. `world.inventoryPerPlayer: true`: a thing belongs to the player who got it (or to the `give` entry's `p`); inventory, status line and the interpreter's list are filtered per player, `{has}` stays shared. `game.json` `first` may be a list, one opening per player, each in its own thread (Tihany: each era sees its own house and lobby); a single string = one shared opening. Such a game always runs on two threads, even alone; alone the page links to the other era's view (`switchTo`), and the New game window shows the era by each name with a swap button. A shared scripted scene shows each player their own things. Eras meet only through panels (`sidesByPlayer`, `talkAfterSolved`: `../modules/CLAUDE.md`).

## Start-up checks

The server runs `validate` and `reachable`: a bad reference or dead end keeps the game from loading, error to the log. Reachability finds dead ends; it cannot judge whether a puzzle is understandable.
