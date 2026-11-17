# pAIr-lock

A custom program for two-player escape rooms with a live AI narrator. One Node process serves the main page and both players and calls the model.

**Local setup** (paths, addresses, backups, the game generator, history) is in `CLAUDE.local.md`, which is not in git. Read it when it exists.

Default port 8800 (`config.json`). The name is written pAIr-lock (pair + lock, with AI inside); folder and identifiers use `pairlock`. Use exactly this spelling in player-facing text.

## SPOILERS: the most important rule

The user plays these games too. **Never show them** solutions, codes, the truth of a story, or which item is useless or a false lead. Spoilers, not to be shown during play: `games/*/` (especially `world.json`, `panels.json`, `GAME.md`), `saves/`, `tools/make_*.py`, output of the game test scripts. Report results only as numbers and general experience. Anything the players have already seen may be mentioned. Reply to the user in Hungarian.

## Language

Write it as English code for a Hungarian-language game: file names, identifiers, comments and CLAUDE.md files are in English. Player-facing text is Hungarian for now, but other languages may come later, so it belongs in game data or in `locales/<lang>.json`, never in code. Language: `config.json` `lang` (default `hu`), a game may set its own in `game.json` `lang`. Server code reads `g.L.engine…`/`g.L.ui…` (`engine/strings.js`, `fmt` fills `{placeholders}`); the browser gets the `ui` section (`public/strings.js`: `DuoStr.t('section.key', vars)`, HTML uses `data-s`, `data-s-tip`, `data-s-aria`, `data-s-placeholder`). `ui.markers` (inventory line label, status place label, pass message) are also written into history, so changing them breaks parsing of old saves in that language. The engine's default world texts (`engine.world`) are merged under the game's `world.json` `texts`. Engine messages use the form `(GAME: SOLVED, title)`, `(GAME: WRONG, title)`, `(GAME: HINT, title)` or a game's own `(GAME: …)` text; markup is `[img:id]`, `[panel:id|Label]`, `[i:id|Name]`. Game content ids (rooms, items, images) are game data and may stay Hungarian.

## Running

- Start: `node server.js` in this folder. Main page: http://localhost:8800/ , on the network with the machine's LAN address (`publicHost` in `config.json` overrides it). The server does not start on its own after a reboot.
- **18+ games** (`"nsfw": true` in `game.json`) are not in git. Default start loads none of them: not on the home page, not startable, their images not served, their saves not listed (the files stay untouched). `node server.js --nsfw` (or `PAIRLOCK_NSFW=1`, or `config.json` `"nsfw": true`) first brings them up to `games/nsfw.json` (`engine/nsfw.js`: downloads missing files from the Hugging Face dataset at the listed revision, checks sha256, follows redirects; replaces a file only if it is still exactly what it downloaded before, so a local rebuild is never overwritten; `games/.nsfw-state.json` remembers what it wrote), then loads them; a game with files still missing is not loaded. Publish after building or changing one: `python3 tools/publish_nsfw.py <owner/dataset> [game]` (needs `huggingface_hub` and a write token), then commit `games/nsfw.json`. The dataset is public, tagged not-for-all-audiences, not gated.
- In the background: `(nohup node server.js >> saves/server.log 2>&1 & echo $! > saves/server.pid)`, stop: `kill $(cat saves/server.pid)`.
- **Before restarting, check** `GET /api/runs`: if someone is `online`, they are playing. Wait until `busy` is false. Connections recover by themselves, and client files (`public/`) update with a page refresh. Changes to `game.json`, `world.json`, `panels.json`, `GAME.md`, `server.js`, `motor/` or a module's `server.ts` need a restart.
- AI settings: the home page's ⚙️ Beállítások (DeepSeek key, model, balance). Stored in `settings.json` (mode 600, never served, never sent back: the browser only learns whether a key is set and its last 4 characters). Only requests from this machine may change or check them. A new key is saved only if DeepSeek accepts it (listing models and the balance cost nothing). This is the only place the key lives: no outside key file, no environment variable (2026-11-17). `settings.json` is in `.gitignore`. Model: `game.json` `model.name` if a game sets it, else the settings, else `deepseek-flash`. Play uses the user's DeepSeek credit. Code: `engine/settings.js`.
- Saves: `saves/<id>.json`, written atomically. Deleted games move to `saves/deleted/`. **Never delete the user's saves.** Delete a test game only by its own id: `DELETE /api/runs/<id>?hard=1`, never the whole folder.
- Manual backups: see `CLAUDE.local.md`.

## Structure

```
server.js        HTTP, SSE, runs, queue, rounds, saving, clock, auto-pass
engine/world.js  world model: state, inventory, actions, conditions, validation, reachability, routes
engine/ai.js     interpreter (JSON) and narrator (stream), DeepSeek
engine/modules.js minigame framework; engine/codes.js answer checks
engine/nsfw.js   --nsfw: fetches the 18+ games listed in games/nsfw.json
modules/<type>/  minigames: server.ts, client.js, types.ts, CLAUDE.md. Shared contract: modules/CLAUDE.md, modules/types.ts
public/          main page (index.html, home.js), player page (play.html, play.js), strings.js, modules.js, tip.js, style.css
locales/         player-facing text per language (hu.json)
games/<id>/      game packages
saves/           running and saved games
tools/           generators, tests
docs/banners/    small copies (720px wide) of the games' covers for README.md (the 18+ games too: their covers are clean)
```

No runtime dependencies; Node runs `.ts` by stripping types. Connection: SSE + POST. State lives on the server; the client only displays.

### Game package: `games/<id>/`

The main page finds it when the server starts. Only games with a `world.json` load.

| File | Content | Served? |
|---|---|---|
| `game.json` | title, description, goal, sample player names (`players`: "Jancsi", "Juliska"; replaced by the run's names in `GAME.md` and the opening, bare form only, never suffixed), opening text, buttons, image names, fixed texts, `panelDone`, `panelRetryUntil`, `autoPass`, model, `endPattern` | partly, the client gets only what it needs |
| `world.json` | rooms, items, rules, inventory, status line | no |
| `panels.json` | minigame settings and solutions | **no** |
| `server.js` | the game's own server rule, e.g. `decorate(msg, history)` | **no** |
| `GAME.md` | narrator style and rules | **no** |
| `images/`, `icons/` | images (`images/<id>.jpg`: the player page asks for `.jpg` since 2026-11-17, `public/play.js` `IMG`) and inventory icons (`icons/<id>.png`) | yes |
| `theme.css` | UI theme (optional) | yes |

`/g/<id>/` serves only `images/`, `icons/` and `theme.css`. `/modules/<type>/` serves only `client.js`. Do not loosen this.

### Home page header

`public/header.jpg`: the pAIr-lock logo across the full width of the home page (3072x256, 12:1, logo centered, the A and I bright with a keyhole in the A; FLUX.3 klein, 2026-11-06). Kept centered when the browser crops it. A future designed logo replaces this file.

### Home page game cards

Cards sit in a grid: two columns when the page is wide enough (min. 560px each, page max. 1400px), one on narrow screens; the banner shrinks with the column and the buttons stay at the bottom of the card (`public/style.css`, end). Each card shows the banner, description and goal, then **Új játék** (a dialog asks for the player names, the names last used (kept by the server in `settings.json` `lastPlayers`, saved when a game is started from the home page with `remember: true`, read through `GET /api/players/last`; alone, the saved second name stays), else the game's sample names (`players`: Jancsi, Juliska) prefilled, with "1. játékos" / "2. játékos" placeholders once cleared; both required unless solo; beside each name a ♀ / ♂ toggle (one click switches; last used, also in `lastPlayers`, else ♂ for Jancsi and ♀ for Juliska), shown for every game and saved on the run as `genders: ['f'|'m', …]`; after starting it shows the player links) and, if the game has saves, **Játék folytatása** with the number of saves (a dialog lists them newest first, scrollable, each with its links, regenerate, copy and delete). Code: `public/home.js`, strings `locales/*.json` `ui.home` (a new string needs a server restart).

### Home page banner per game

`game.json` `cover` (e.g. `images/cover.jpg`) is shown across the top of the game's card on the home page, at 5:1; without it the card shows the title as text. Size and prompt that worked: 2240x448, FLUX.3 klein, title spelled out letter by letter, motif on the far right, title on one line on the left. The generator's banner tool holds the prompt and the steps (it only uses what the players see before starting). Check every try for spelling and for details the story contradicts (the Őrség lamp must be dark). After a new cover of a game listed in `README.md`, refresh its small copy: `magick games/<id>/images/cover.jpg -resize 720x -strip -quality 82 docs/banners/<id>.jpg`.

### UI theme per game

`theme.css` overrides CSS variables (`--bg`, `--panel`, `--panel2`, `--ink`, `--muted`, `--line`, `--accent`, `--send`, `--tool`, `--view`, `--serif`, `--ui`, `--radius`) and may add any other style. `game.json`: `"ui": {"layout": "chat-right"}`. Modules use the theme variables.

### One round

**Threads.** In the same room (or playing alone) the players share one thread and a round waits for both, as below. In different rooms each player has their own thread: a message gets its reply at once, nobody waits, and pass and auto-pass do nothing. The narrator writes one reply at a time; the other's message waits in the queue (`writing` in the round state tells the client whose reply is being written).
- Every message has `to` (who sees it; none = both) and, for player messages, `done` once a turn has handled it. Replies record their messages in `of`. `to` never changes, so each audience's history (joint = seen by both, or one player's) only grows at the end: the prompt cache works per thread, and the fixed system prompt is shared by all.
- The narrator of a thread gets only messages everyone in it has seen, so it cannot pass on the other's secrets.
- Panels with `sides` and scripted events (`game.json` `scripted`: `{re, text, if?}`; `if` is a world condition tested after the engine message has run, first entry whose `re` matches and `if` holds wins, 2026-11-17) go to both; other panel and button messages to the actor's thread.
- When one player arrives or leaves while the other is outside the thread, the other gets an engine notice (`engine.arrived`, `engine.left`) without a model call.
- Saves from before threads are marked on load (`v: 2`, `markHandled`).

1. A message or panel event arrives. Shared mode: the round starts when both have moved or passed. The auto-pass timer restarts on typing and pauses while a panel is open.
2. `worldTurn`: the interpreter turns the text into actions. `(GAME: …)` messages and the room picker's `Megyek ide: …` go straight to the engine.
3. The engine executes them and adds fixed text, images and panels itself.
4. The narrator is called **only** if there is a free fact: `attempt`, `effect`, `question`, `moment`. Fixed text gets no narrator call, so it cannot be rewritten.
5. The engine writes the status line and the inventory line. The client draws from this marked-up text: `[img:id]`, `[panel:id|Label]`, `[i:id|Name]`, code block.

## World model

Code and JSON keys are English, player-facing text is Hungarian. **Model v2** (2026-11-07) adds, all optional, so older worlds run unchanged: parents (`location` may be an item id, `rel`: in/on/under/behind/part; a closed parent, `props.open === false`, hides what is in it), several properties per entity (`props`, rooms too; `state` is the property "state"), `hidden` + the `reveal` action, doors (`kind: "door"`, `between`, `closedText`; an exit's `door`), room and item `text` as a list of `{if, text}`, `{contents}` / `{contents:prefix}` / `{contents@other:prefix}` (the `mention` of what is directly in or on it, or in or on another entity, now; what was taken is no longer listed; a `mention` may itself be a `{if, text}` list), an old-style `pickable` leaves its place when taken, `carry` (the entity itself goes to the inventory under its own id), `glows` with a dark room (`lit: false`), the actions `set`, `inc`, `reveal`, `moveTo`, `take`, room `image` as a list of `{if, image}` (first that holds wins; shown on the first visit and again whenever the room's picture changed since it was last shown there, `s.roomImg`, `W.roomImage`; 2026-11-14), `after: {turns, do}`, `notify: {at, text, images?}` (something heard or seen in another room, 2026-11-13: a player of the same thread standing there gets it in the reply, one in the other thread as a notice without a model call), the conditions `{is: "id.prop", eq|ne|gt|lt}`, `{where, at}`, `{player: 0|1|"any"|"both"|"self"|"other", at}` (`self`/`other` relative to the acting or walking player, so a room only one may enter is an exit with `requires: {not: {player: "other", at: room}}`; a joint move into it takes only the speaker, 2026-11-15), `{together}`, `{knows, who}` (`world.knowledge`: `"shared"` default, or `"perPlayer"`), rule events `set:id.prop`, `enter:room`, `leave:room`, `take:id`, `look:id`, `turn`, and `once`. **Player genders** (2026-11-15): the run's `genders` (home page toggle; old saves have none, then player 0 counts as female, 1 as male) reach the world through `W.setPlayers` before each turn. A room's `avatarText: {f, m}` is written on entering, one line "<name>: <text>" for every player then in the room (once per reply; also under the opening for the start room). Fixed texts may hold `[g:self|female text|male text]` (`self` = acting player, `other`, `0`, `1`). The narrator's system prompt ends with a line naming each player's gender (fixed per run, so the cache holds). Nothing in a game's progress may depend on it. Test: `node tools/test_players.js`. Rooms may have `into` / `inside` phrases ("a konyhába", "a konyhában") for the joint-move sentences. Old saves get the new fields on load (`W.upgrade`). Test: `node tools/test_world_v2.js`.

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

Other `world.json` fields: `start` (one room, or one per player: `["hall74", "hall"]`, player 0 in the first), `rooms` (`name`, `aliases`, `text`, `firstText`, `image`, `exits`: `requires`, `otherwise`, `panel`, `aliases`), `rules` (`on`: `solved:<title>` or a custom event, `if`, `do`), `inventory`, `vars`, `status` (template), `onMessage`, `panelTitles`, `panelIds`, `panelAvail` (when a panel is usable), `mustReach`, `texts`.

**Two eras** (`game.json` `eras: ["1974", "Ma"]`, e.g. Tihany): the builder writes every room and item twice, exits stay within their era, and `start` is per player. `world.inventoryPerPlayer: true`: a given thing belongs to the player who got it (or to the `give` entry's `p`); inventory, status line and the interpreter's list are filtered per player, `{has}` stays shared. `game.json` `first` may be a list, one opening per player, each in its own thread (Tihany: each era sees its own house and lobby); a single string is one shared opening. Such a game always runs on two threads, even alone; alone the page links to the other era's view (`switchTo`), and the New game window shows the era by each name with a swap button. A shared scripted scene shows each player their own things. The eras meet only through panels (`sidesByPlayer`, `talkAfterSolved`, see `modules/CLAUDE.md`).

At startup the server checks the world (`validate`, `reachable`): with a bad reference or dead end the game does not load and the error goes to the log. Reachability finds dead ends; it cannot judge whether a puzzle is understandable.

**Model principles** (decided 2026-11-07):
- Everything is an entity (room, thing, part, door, carried thing) with an `id`; all state is saved under that id, and conditions and actions may name any `id.prop`.
- Visibility: a thing shows only if its parent shows, an `in` parent is open (or has no `open` prop), it is not `hidden`, its `visibleIf` holds, and in a dark room (`lit: false`) only `glows` things show. The interpreter gets only what shows, and only public props (`open`, `lit`, or `public: true`), never `hidden`, vars or solution props.
- Text follows events: whatever can move away is either a `mention` in the parent's `{contents}` or the parent's text is conditional; what is gone is never described. `validate` warns about a movable thing named in fixed parent text.
- Knowledge is shared by default but stored per player (`seen: [0,1]`), so a game can switch to `knowledge: "perPlayer"` later.
- Not in the model, on purpose: automatic sentence building from children (clumsy in Hungarian; only hand-written `mention` halves), physics or weight (a number prop and a condition are enough), characters/NPCs, and any state change by the AI (the interpreter gives intent, the engine decides).

**Limit:** conditions and actions stay simple. Anything beyond them becomes the game's own module; the JSON must not turn into a programming language.

## AI layer

- **Interpreter** (`engine/ai.js`): text → `{actions:[{player,type,target,verb,with,text}]}`. Types: `look_around`, `look`, `go`, `act`, `inventory`, `code`, `clue`, `question`, `moment`. It receives only the room's visible items, the inventory and the exits (plus known, reachable distant rooms), no secrets. Temperature 0, thinking off. A `go` is written for the speaker only; with `together: true` ("lemegyünk", "kézen fogom és átmegyünk") the engine also moves the other player if they are in the same room and only pass, talk or go the same way; if they go elsewhere or do something else they stay, and a fixed sentence says so (`texts.moveTogether`, `moveSplit`, `moveStays`, plain variants without `into`). `stay` ("én itt maradok") keeps the other player where they are. Items inside or part of another carry the parent's name (`in`) and their public props (`open`, `lit`, or `public: true`).
- **Narrator:** writes only from the list of facts, using `GAME.md` and the history. It does not know the item list. The engine cleans codes out of its reply.
- **Colorizer** (`engine/colorize.js`, built 2026-11-07): rewords the engine's fixed room, look and move texts each turn with one history-free JSON call (`AI.colorize`), beside the narrator. Off unless `game.json` `colorize: {on, kinds, timeoutMs, style}`; every game has it, off. Input: blocks with `keep` (names of things the text mentions), `details` (mood facts of the room or thing), `nth`, the player's words, `usedBefore`. Checks in code (any failure, error or timeout keeps the fixed text): every `keep` word (Hungarian endings allowed, `hasTerm`), „…” quotes letter for letter, no new or lost digits or number words, no names of things not here (unless also named here or in the details), no `sensitiveWords`, no emphasis words (`locales` `engine.colorize`), length 0.5–1.8×, own thread in second person, moves keep names, rooms and outcome. Not colorized: entities with `literal: true` (documents, clue texts), texts with an author's emphasis word, actions. The save keeps per message `color: [{kind, fixed, out, fail}]`; the log line shows ok/fixed. World fields: `details` (list of strings on items and rooms; `validate` refuses hidden names and sensitive words in them), `literal`, `sensitiveWords`, `emphasisWords`. Tests: `node tools/test_colorize.js` (offline), `node tools/colorize_trial.js <game> [runs]` (real model, small cost, writes `saves/colorize-trial/<game>.md`). Trial 2026-11-07: about 1.2 s per call; fixed text kept in 10% (A Modell), 13% (Őrség), 4% (Tihany). Decisions: only room, look and move texts are colorized; actions (`say`, `otherwise`, `forbidden`), documents and codes, "not here" type replies, status and inventory lines stay word for word, and the narrator is never colorized. `keep` holds only names the fixed text itself mentions (all room items would fail every look). The colorizer gets no secrets (hidden things, solution, vars, other rooms), uses at most two `details` and avoids `usedBefore`, gets shorter by the third look (`nth`), may react to how the player said it, never adds things, names or numbers, never makes anything seem important, and never tells players what to do. Audience decides the voice: a shared thread is third person with names, an own thread second person. Moves: the engine decides who goes where; the text may never reverse the outcome (no "together" on a split, no "alone" on together) or put words in the other player's mouth. `details` hold mood only, never anything that could read as a clue; only the author's fixed text may point. Not switched on in any game yet: the user decides after reading a trial run.
- **Cache:** the start of the prompt is constant, the history only grows and never changes backwards, and anything that changes per round goes at the very end. Measured hit rate: about 80% on narrated rounds. Do not put timestamps or changing data at the start of the prompt.
- **Model:** DeepSeek flash (`deepseek-flash`). Measured 2026-11-04 (25 steps, with the old narrator-led method): DeepSeek about 1.7 s, Haiku 3-7 s, Sonnet 8.4 s and the most accurate.
- **Pro subscription:** seems fine for a solo trial, a grey area for two players, so nothing is built on it until Anthropic gives a clear answer. Cloud Claude needs an API key.
- **Local model:** not measured yet. May be enough for interpreting; doubtful for live Hungarian narration.

## User decisions

Do not reopen these unless the user asks:

- No time limit that permanently closes a room. The Zrínyi counter is that game's own element; do not generalise it.
- There is always a live narrator. No click-only or fixed-replies-only mode, it would take away the experience (without AI it would need 3D-like graphics).
- A game is a module, and so are minigames, duo modes and the UI theme. An extensible frame without early over-engineering.
- Minigame APIs are alike across modules, and each minigame has its own CLAUDE.md.
- No automatic illustrator; images are made in advance.
- Őrség was moved here from an older setup; its old narrator-led branch is deleted.
- From the main page you can start a new game or continue, with a link for each. Player names can be set for a new game, not when continuing. Copy and delete exist, with confirmation.
- The narrator also reacts to things outside the game (a hug, sitting down), without changing game state or giving hints.
- Item state and danger live in the engine (lid open or closed, you cannot climb in); an in-world reason is better than "you can't do that".
- Joint movement (2026-11-07, replaces "everyone moves only themselves"): "we go" takes the other player along unless they do something else in the same turn; their own move wins.
- Spicy games (`nsfw: true`): players still only investigate, and everyone depicted is clearly an adult. Levels per game: `CLAUDE.local.md`.

## Game design rules

- An image shows what the text says (counts, places). If the image is roughly right the text adapts to it; only puzzle-bound facts are fixed.
- Everything important has an image. Being visible in the room image is good but not required.
- Include useless items and very few false leads.
- A clear goal stated in advance; reaching it ends the game.
- Reveal nothing beyond what players have reached (such as a valve or gauge behind a closed door). `panelAvail` and `when` are for this.
- Solving a puzzle must visibly lead somewhere, and earlier failed attempts must stay consistent with what is found later.
- In spicy games players only investigate: the place and the clues provide the spice, with no characters to meet and no undressing, and images are 18+ only where a puzzle justifies it.
- Games are designed and their images made in a separate generator project (not in this repo; location in `CLAUDE.local.md`). Images: FLUX.3 klein; list items in the prompt with count and place, and compare every image with the item list.

## Interface

Story and input on the left; on the right a large image, paged gallery, inventory strip and notebook (own and shared). At the top, play time and status, plus each player's name with their current room. Several images at once appear in a grid, one large image on page load. The large view pages with arrows, wheel, buttons and dragging. Tooltip: `public/tip.js` instead of the browser's `title`. The panel list works from the engine without a model call and hides panels not yet usable: solved is green, solved but still changeable is blue (`game.json` `panelRetryUntil`: until which message). "Hová megyek" lists known rooms reachable over open paths (`W.routes`); it needs no model but counts as a move, so the round still waits for the other player. Help comes from engine data listing what has not been looked at.

Play time counts only while someone is connected, and stops at the end of the game (`endPattern`).

## API

`GET /api/games`, `GET /api/runs`, `POST /api/runs {game, solo, names, genders, remember?}`, `GET /api/players/last`, `POST /api/runs/<id>/branch`, `POST /api/runs/<id>/regen`, `DELETE /api/runs/<id>[?hard=1]`, `POST /api/reload` (load a new save without restarting). Player: `/p/<token>`, `/api/p/<token>/{state,events,say,go,mod,message,typing,panel,notes}`.

The main page has no password: anyone on the network who knows the address can reach it. For home use, not the internet.

## Őrség (`games/orseg`)

- Built by the generator (`games/orseg/`): world, game, GAME.md, panels, theme, server.js, images and icons. Edit the builder there, never the files here, then restart the server.
- Save ids still contain the old name `orseg_v2`, and the server redirects one old route; harmless.

## Testing

- `node tools/test_modules.js`: module framework and code lock over HTTP against a running server on port 8800, no model call, without printing codes. Start the server without `DUO_ALLOW_DIRECT`.
- `node tools/test_morse.js`, `node tools/test_gauge_board.js`, `node tools/test_puzzle.js`, `node tools/test_pipes.js`, `node tools/test_logic_grid.js`, `node tools/test_uv_lamp.js`, `node tools/test_spot_difference.js`, `node tools/test_sequence.js`, `node tools/test_scratch_reveal.js`, `node tools/test_typewriter_ribbon.js`, `node tools/test_locomotive.js`, `node tools/test_stereo_viewer.js`, `node tools/test_darkroom.js`, `node tools/test_cipher_disc.js`, `node tools/test_planchette.js`, `node tools/test_knocking.js` (also place-bound sides and `closed` + `closedText`), `node tools/test_chain.js` (gears, shutter_lamp, report_form), `node tools/test_time_capsule.js` (also `sidesByPlayer`, `talkAfterSolved`), `node tools/test_eras.js` (two eras at the world level), `node tools/test_strings.js` (every string key exists in every locale, no Hungarian left in code), `node tools/test_colorize.js` (colorizer checks, offline), `node tools/test_match_matrix.js`, `node tools/test_param_console.js`, `node tools/test_dual_word.js`, `node tools/test_camera_guide.js` (guide a tap by a picture only the other side sees), `node tools/test_players.js` (single-person room, avatar texts, gender markup), `node tools/test_guard_round.js` (work while a guard walks a round, caught message, pause on leave), `node tools/test_roulette.js` (hidden control and wheel, magnet, alone by place): modules on made-up data, no server needed.
- `node -e "console.log(!!require('./tools/pipes_solver')(<options>))"`: checks that a pipes grid can be solved. Its full result is a spoiler.
- `npx -y -p typescript tsc --noEmit -p .`: type check of the modules (development only).
- `node tools/test_movement.js [--model]`: movement and joint movement, on a made-up world plus Őrség room names. `--model` also calls the real interpreter.
- `node tools/test_world_v2.js`: the v2 world model on a made-up world (parts, containers, hidden things, `{contents}`, props, doors, room texts, events, timers, player conditions, knowledge, joint moves, the interpreter's view, start-up checks, old saves).
- `python3 tools/test_playthrough.py`: **the default after any code change.** Full 47-step playthrough with no model call and no cost, on its own server, port (8802) and temporary save folder. Interpreter answers are replayed from `tools/fixtures/orseg_interpreter.json` (`engine/ai_replay.js`), the narrator is a fixed marker. `-v` prints every step (spoilers).
- `python3 tools/test_playthrough.py --ai`: the same with the real model, using the user's credit. **Rare, only when necessary:** the interpreter, narrator or prompt changed, or before switching versions. `--record` calls the real interpreter only for sentences missing from the file, so use it after adding a step. Replay cannot notice a changed prompt.
- `node tools/test_interpreter.js [repeats]`: the real interpreter on open versus force sentences, each repeated (default 5); prints only item ids and verbs. Uses the user's credit: run it when the interpreter prompt or `forInterpreter` changed. The `--ai` playthrough usually fails one step ("kabát zsebei" read as the coat rack); that one is a known interpreter weakness.
- `DUO_ALLOW_DIRECT=1` lets the playthrough report solutions directly. The test sets it for its own server; **never use it in real play.**
- `python3 tools/test_threads.py`: two players together and apart on its own server (port 8805), no model call: waiting together, private replies apart, notices, and that each thread's narrator prompt only grows (cache) and never contains the other thread. `--record` calls the real interpreter once for a missing sentence.
- `python3 tools/test_settings.py`: AI settings on its own server (port 8806) with a temporary settings file: the key is never sent back, the file is private and never served. One free call to DeepSeek with a made-up key.
- `python3 tools/test_eras_server.py`: two eras on its own server (port 8808) with the fixture game `tools/fixtures/games/eras` (`DUO_GAMES` points the server at another games folder), no model call: two threads from the start also alone, the switch link, per-player things in a shared scene.
- `node tools/test_nsfw.js`: the `--nsfw` download against a local stand-in for the dataset (missing files, nothing twice, local changes kept, updates, bad checksum, redirects); no network.
- `python3 tools/test_resume.py`: restart, kept notes and an interrupted reply, on its own server (port 8804) and temporary save folder, no model call.
- Avoid model calls in tests unless needed: they use the user's credit. A browser test needs two tabs with the player links. Always test on your own test game and delete it afterwards.

## Known limits and next steps

1. Threads exist only by place (together or apart). A game cannot yet force a split or a meeting, and there is no summary on meeting again: players tell each other. A narrated reply of the joint thread does not know what either did alone, only the engine's facts.
2. The shared note uses last-save-wins, with no merging.
3. Free replies may slip in small invented details. None has given a clue so far, but it cannot be fully excluded.
4. Looking at an item gives fixed text with no narrator wrapping. Can change based on user feedback.
5. The interpreter may misread unusual sentences. Examples added to the tests improve this.
6. Not built from the v2 design: help based on what was `touched` or searched ("ezt még nem kutattátok át"), `reachIf` (visible but out of reach, e.g. a glass case), `together`/`apart` events, `{actor}`/`{other}` name placeholders in texts.
