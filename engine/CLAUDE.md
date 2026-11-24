# Engine and server

`server.js` + `engine/`. World model: `world.md`. Colorizer: `colorize.md`. Minigame frame: `../modules/CLAUDE.md`. UI side: `../public/CLAUDE.md`.

## One round

**Threads.** Same room (or alone): players share one thread and a round waits for both. Different rooms: each player has their own thread, a message is answered at once, nobody waits, pass and auto-pass do nothing. The narrator writes one reply at a time; the other's message waits in the queue (`writing` in the round state tells the client whose reply is being written).
- Every message has `to` (who sees it; none = both); player messages get `done` once a turn handled them. Replies list their messages in `of`. `to` never changes, so each audience's history (joint = seen by both, or one player's) only grows at the end: prompt cache works per thread; the fixed system prompt is shared by all.
- A thread's narrator gets only messages everyone in it has seen, so it cannot pass on the other's secrets.
- Panels with `sides` and scripted events go to both; other panel and button messages to the actor's thread. Scripted events: `game.json` `scripted: [{re, text, if?}]`; `if` is a world condition tested after the engine message ran; first entry whose `re` matches and `if` holds wins (2026-11-17).
- A player arriving or leaving while the other is outside the thread: the other gets an engine notice (`engine.arrived`, `engine.left`), no model call.
- Saves from before threads are marked on load (`v: 2`, `markHandled`).
- **Waiting toggle** (2026-11-21): header "Várunk egymásra: be/ki" (hidden alone), part of the run (`r.wait`, default on; `waitBy` = who changed it last; `POST /api/p/<t>/wait {on}`). Off: the shared thread answers every message at once (`noWait`), no pass or auto-pass, replies stay in the shared thread, queue order. Switching off while one player already moved answers that message at once. Joint moves, panels, scripted events unchanged. Partner's new message flashes; with waiting off also a soft tone.

Steps:
1. A message or panel event arrives. Shared mode: the round starts when both moved or passed. The auto-pass timer restarts on typing and pauses while a panel is open.
2. `worldTurn`: the interpreter turns text into actions. `(GAME: …)` messages, the room picker's `Megyek ide: …` and messages with `direct` go straight to the engine.
3. The engine executes them and adds fixed text, images, panels.
4. The narrator is called **only** for a free fact: `attempt`, `effect`, `question`, `moment`. Fixed text gets no narrator call, so it cannot be rewritten.
5. The engine writes the status line and inventory line. The client draws from the marked-up text: `[img:id]`, `[panel:id|Label]`, `[i:id|Name]`, code block.

Play time counts only while someone is connected and stops at the end (`game.json` `endPattern`).

## Player conveniences (server side, 2026-11-21, every game)

- **Room picture on entering:** entering a visited room whose picture is not repeated in the text adds `[view:<player>:<image>]` (`enterRoom` `{view}`); that player's image pane turns to it, the text shows nothing.
- **"Körülnézek" button:** `POST /api/p/<t>/look {}`; a random sentence from `engine.lookAround` goes into the thread in the player's name with `direct: {type: 'look_around'}`, so `worldTurn` skips the interpreter. Together it counts as a typed move.
- **Highlights** (`highlight.js`): in fixed room and look texts, names and aliases of things the player sees now (`visibleItems`) or carries become `[[word|id]]`, shown in accent colour only (no underline, user's choice 2026-11-21); hidden or unrevealed things never. One per thing per text, longest name first, not the thing being looked at. Matching uses the colorizer's `forms` with at most six letters of endings, which must fit `engine.grammar.endings` (so a longer compound starting with the name is no hit); names under four letters never match. A colorized text is marked only for things its original named (`keep` words). Hand marks in any world text: `[[word|id]]` (highlight only while id is visible; then not auto-matched in that text) or `[[word|-]]` (never). `validate` refuses a mark naming no item. Item `noHighlight: true` keeps it out; `game.json` `"highlight": false` turns it off per game. The narrator never gets marks back (`AI.clean`); the colorizer gets plain text. Check before playing: `node tools/highlights.js <game> [--all]` (spoiler output).
- **Click on a highlight:** `POST /api/p/<t>/look {id}` (refused unless visible or carried now); a sentence from `engine.lookAt` ("Megvizsgálom: {name}.") or, if the item has `acc` (accusative without article), also from `engine.lookAtAcc` with the article the engine adds (`grammar.js`, words in `locales` `engine.grammar`: "az" before a vowel sound, "a" before a consonant, a leading number by how it is read: az 5-ös, az 1-es, a 10-es). Message carries `direct: {type: 'look', target}`; together it counts as a typed move.

## AI layer (`ai.js`: interpreter as JSON call, narrator as stream, DeepSeek)

- **Interpreter:** text → `{actions:[{player,type,target,verb,with,text}]}`. Types: `look_around`, `look`, `go`, `act`, `inventory`, `code`, `clue`, `question`, `moment`. Gets only the room's visible items, the inventory and the exits (plus known reachable distant rooms), no secrets. Items inside or part of another carry the parent's name (`in`) and public props (`open`, `lit`, or `public: true`). Temperature 0, thinking off.
  - `go` is for the speaker only. `together: true` ("lemegyünk", "kézen fogom és átmegyünk"): the engine also moves the other player if in the same room and they only pass, talk or go the same way; going elsewhere or doing something else keeps them there, with a fixed sentence (`texts.moveTogether`, `moveSplit`, `moveStays`, plain variants without `into`). `stay` ("én itt maradok") keeps the other where they are.
- **Narrator:** writes only from the fact list, `GAME.md` and the history; does not know the item list. The engine cleans codes out of its reply.
- **Cache:** prompt start is constant, history only grows and never changes backwards, per-round data goes at the very end. Measured hit rate ≈80% on narrated rounds. Never put timestamps or changing data at the start.
- **Model:** default DeepSeek flash (`deepseek-flash`); `game.json` `model.name` overrides, else the settings. Measured 2026-11-04 (25 steps, old narrator-led method): DeepSeek ≈1.7 s, Haiku 3–7 s, Sonnet 8.4 s and most accurate.
  - Claude Pro subscription: seems fine for a solo trial, grey area for two players; nothing built on it until Anthropic answers clearly. Cloud Claude needs an API key.
  - Local model: not measured. Maybe enough for interpreting; doubtful for live Hungarian narration.
- Tests replay interpreter answers from fixtures (`ai_replay.js`); see `../tools/CLAUDE.md`.

## Settings (`settings.js`)

Home page ⚙️ Beállítások: DeepSeek key, model, balance. Stored in `settings.json` (mode 600, in `.gitignore`, never served, never sent back: the browser only learns whether a key is set and its last 4 chars). Only requests from this machine may change or check them. A new key is saved only if DeepSeek accepts it (listing models and balance costs nothing). Only place the key lives: no outside key file, no env var (2026-11-17). Play uses the user's DeepSeek credit. Also holds `lastPlayers` (see `../public/CLAUDE.md`).

## Strings

Language: `config.json` `lang` (default `hu`); a game may set `game.json` `lang`. Server reads `g.L.engine…` / `g.L.ui…` (`strings.js`; `fmt` fills `{placeholders}`). The browser gets the `ui` section (`public/strings.js`: `DuoStr.t('section.key', vars)`; HTML uses `data-s`, `data-s-tip`, `data-s-aria`, `data-s-placeholder`). `ui.markers` (inventory line label, status place label, pass message) are written into history: changing them breaks parsing of old saves in that language. Engine default world texts (`engine.world`) are merged under the game's `world.json` `texts`. A new string needs a server restart.

Engine messages: `(GAME: SOLVED, title)`, `(GAME: WRONG, title)`, `(GAME: HINT, title)` or a game's own `(GAME: …)`. Markup: `[img:id]`, `[panel:id|Label]`, `[i:id|Name]`. Game content ids (rooms, items, images) are game data and may stay Hungarian.

## API

`GET /api/games`, `GET /api/runs`, `POST /api/runs {game, solo, names, genders, remember?}`, `GET /api/players/last`, `POST /api/runs/<id>/branch`, `POST /api/runs/<id>/regen`, `DELETE /api/runs/<id>[?hard=1]`, `POST /api/reload` (load a new save without restarting). Player: `/p/<token>`, `/api/p/<token>/{state,events,say,go,look,wait,mod,message,typing,panel,notes}`.

## Known limits and next steps

1. Threads exist only by place (together/apart). A game cannot force a split or a meeting; no summary on meeting again (players tell each other). A narrated reply of the joint thread does not know what either did alone, only the engine's facts.
2. Shared note: last save wins, no merging.
3. Free replies may slip in small invented details. None has given a clue so far; cannot be fully excluded.
4. Looking at an item gives fixed text, no narrator wrapping. May change on user feedback.
5. The interpreter may misread unusual sentences; examples added to the tests improve this.
6. Not built from the v2 design: help from what was `touched`/searched ("ezt még nem kutattátok át"), `reachIf` (visible but out of reach, e.g. a glass case), `together`/`apart` events, `{actor}`/`{other}` name placeholders.
