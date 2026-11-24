# pAIr-lock

Two-player escape rooms with a live AI narrator. One Node process serves the home page and both players and calls the model. Spelling in player-facing text: exactly `pAIr-lock` (pair + lock, AI inside); folder and identifiers: `pairlock`. Local setup (paths, addresses, backups, generator, history): `CLAUDE.local.md` (not in git), read it when it exists.

## SPOILERS: the most important rule

The user plays these games too. **Never show** solutions, codes, the truth of a story, or which item is useless or a false lead. Spoilers, never shown during play: `games/*/` (esp. `world.json`, `panels.json`, `GAME.md`), `saves/`, `tools/make_*.py`, output of the game test scripts and of `tools/highlights.js`. Report results only as numbers and general experience. What players have already seen may be mentioned. Reply to the user in Hungarian.

## Language

English code for a Hungarian-language game: file names, identifiers, comments, CLAUDE.md files English. Player-facing text (Hungarian now, other languages later) lives in game data or `locales/<lang>.json` (one JSON per language, user's choice 2026-11-06), never in code (`tools/test_strings.js` checks). Details (`config.json` `lang`, `g.L`, `DuoStr.t`, `data-s*`, `ui.markers` caveat, message markup): `engine/CLAUDE.md` → Strings.

## Rules

- Port 8800 (`config.json`). Start `node server.js`; background `(nohup node server.js >> saves/server.log 2>&1 & echo $! > saves/server.pid)`, stop `kill $(cat saves/server.pid)`. No autostart after reboot. LAN: machine's address (`publicHost` in `config.json` overrides).
- **Before restarting** check `GET /api/runs`: anyone `online` is playing; wait until `busy` is false. Connections recover by themselves; `public/` updates on page refresh. Restart needed after changes to `game.json`, `world.json`, `panels.json`, `GAME.md`, `server.js`, `engine/`, a module's `server.ts`, or `locales/`.
- **Never delete the user's saves** (`saves/<id>.json`, atomic writes; deleted games move to `saves/deleted/`). Delete a test game only by its own id: `DELETE /api/runs/<id>?hard=1`, never the folder.
- 18+ games (`"nsfw": true`) are not in git and load only with `--nsfw`: `games/CLAUDE.md` → 18+ games.
- AI key only in `settings.json` (home page ⚙️ Beállítások, mode 600, never served or sent back, changeable only from this machine; no key file, no env var, 2026-11-17): `engine/CLAUDE.md` → Settings.
- No runtime dependencies; Node runs `.ts` by stripping types. SSE + POST; state lives on the server, the client only displays.
- Home page has no password: home LAN only, never the internet.
- After any code change: `python3 tools/test_playthrough.py` (no model, no cost). Model-calling tests spend the user's DeepSeek credit: only when necessary (`tools/CLAUDE.md`).
- Do not loosen what is served: `/g/<id>/` only `images/`, `icons/`, `theme.css`; `/modules/<type>/` only `client.js`.

## User decisions (do not reopen unless the user asks)

- No time limit that permanently closes a room. The Zrínyi counter is that game's own element; do not generalise it.
- Always a live narrator. No click-only or fixed-replies-only mode (it would take away the experience; without AI it would need 3D-like graphics).
- A game is a module, and so are minigames, duo modes and the UI theme. Extensible frame, no early over-engineering.
- Minigame APIs are alike across modules; each minigame has its own CLAUDE.md.
- No automatic illustrator; images are made in advance.
- Őrség moved here from an older setup; its old narrator-led branch is deleted.
- Home page: new game or continue, a link per player. Names settable for a new game, not when continuing. Copy and delete exist, with confirmation.
- The narrator reacts to things outside the game (a hug, sitting down) without changing state or giving hints.
- Item state and danger live in the engine (lid open/closed, you cannot climb in); an in-world reason beats "you can't do that".
- Joint movement (2026-11-07, replaces "everyone moves only themselves"): "we go" takes the other player along unless they do something else that turn; their own move wins.
- Spicy games (`nsfw: true`): players only investigate; everyone depicted is clearly an adult. Levels per game: `CLAUDE.local.md`.
- Pro subscription: nothing built on it until Anthropic answers clearly (`engine/CLAUDE.md` → Model).

## Structure and topic files

| path | what | read |
|---|---|---|
| `server.js` | HTTP, SSE, runs, queue, rounds, saving, clock, auto-pass | `engine/CLAUDE.md` |
| `engine/` | `world.js` world model; `ai.js` interpreter + narrator; `colorize.js`; `modules.js` minigame frame; `codes.js` answer checks; `highlight.js`; `grammar.js` article rule; `strings.js`; `settings.js`; `nsfw.js` | `engine/CLAUDE.md` (rounds, threads, AI, strings, API, limits), `engine/world.md` (world model), `engine/colorize.md` |
| `modules/<type>/` | minigames: `server.ts`, `client.js`, `types.ts`, `CLAUDE.md` | `modules/CLAUDE.md` (shared contract, `modules/types.ts`) |
| `public/` | home page (`index.html`, `home.js`), player page (`play.html`, `play.js`), `strings.js`, `modules.js`, `tip.js`, `style.css`, `header.jpg` | `public/CLAUDE.md` (interface, home page) |
| `locales/` | player-facing text per language (`hu.json`) | `engine/CLAUDE.md` → Strings |
| `games/<id>/` | game packages | `games/CLAUDE.md` (package files, design rules, covers, 18+, Őrség) |
| `saves/` | runs and saves (spoilers, not in git) | |
| `tools/` | tests, generators, fixtures | `tools/CLAUDE.md` (every test, when to use the model) |
| `docs/banners/` | 720px copies of game covers for `README.md` (18+ too: covers are clean) | `games/CLAUDE.md` → Cover |

Games are designed and their images made in a separate generator project (location in `CLAUDE.local.md`), never edited here by hand.
