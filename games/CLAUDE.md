# Game packages: `games/<id>/`

**Everything under `games/<id>/` is a spoiler** (root `CLAUDE.md`). Games are built by the generator project (`CLAUDE.local.md`): edit the builder there, never the files here, then restart the server. The server finds packages at start; only games with a `world.json` load (and only if `validate`/`reachable` pass, `../engine/world.md`).

| File | Content | Served? |
|---|---|---|
| `game.json` | title, description, goal, sample player names (`players`: "Jancsi", "Juliska"; replaced by the run's names in `GAME.md` and the opening, bare form only, never suffixed), opening (`first`), buttons, image names, fixed texts, `panelDone`, `panelRetryUntil`, `autoPass`, `model`, `endPattern`, `cover`, `contentWarning`, `scripted`, `colorize`, `highlight`, `lang`, `eras`, `ui`, `nsfw` | partly: the client gets only what it needs |
| `world.json` | rooms, items, rules, inventory, status line (`../engine/world.md`) | no |
| `panels.json` | minigame settings and solutions (`../modules/CLAUDE.md`) | **no** |
| `server.js` | the game's own server rule, e.g. `decorate(msg, history)`; penalties for wrong panel moves | **no** |
| `GAME.md` | narrator style and rules (system prompt, not a Claude note) | **no** |
| `images/`, `icons/` | images (`images/<id>.jpg`) and inventory icons (`icons/<id>.png`) | yes |
| `theme.css` | UI theme, optional (`../public/CLAUDE.md`) | yes |

## Design rules

- An image shows what the text says (counts, places). If the image is roughly right the text adapts to it; only puzzle-bound facts are fixed.
- Everything important has an image. Being visible in the room image is good, not required.
- Include useless items and very few false leads.
- A clear goal stated in advance; reaching it ends the game.
- Reveal nothing beyond what players have reached (e.g. a valve or gauge behind a closed door): `panelAvail` and `when`.
- Solving a puzzle must visibly lead somewhere; earlier failed attempts must stay consistent with what is found later.
- Spicy games: players only investigate; the place and clues provide the spice; no characters to meet, no undressing; images 18+ only where a puzzle justifies it.
- Images: FLUX.3 klein; list items in the prompt with count and place; compare every image with the item list.

## Cover (home page banner)

`game.json` `cover` (e.g. `images/cover.jpg`), shown at 5:1 across the card top. What worked: 2240x448, FLUX.3 klein (Draw Things gateway, queues behind running jobs), title spelled out letter by letter, motif on the far right, title on one line on the left, period style matching the game (Őrség: Austro-Hungarian maritime poster of 1908; the user picked `orseg_banner_5x1s_poster_s23`, 2026-11-06). Taller banners looked too high; 2560x512 broke the accents more often. Make several seeds. The generator's banner tool holds the prompt and steps and uses only what players see before starting. Check every try for spelling and for details the story contradicts (the Őrség lamp must be dark). After a new cover of a game listed in `README.md`, refresh its small copy: `magick games/<id>/images/cover.jpg -resize 720x -strip -quality 82 docs/banners/<id>.jpg`.

## 18+ games (`"nsfw": true`)

- Not in git (`.gitignore`). Default start loads none: not on the home page, not startable, images not served, saves not listed (files untouched).
- `node server.js --nsfw` (or `PAIRLOCK_NSFW=1`, or `config.json` `"nsfw": true`) first brings them up to `games/nsfw.json` (`../engine/nsfw.js`: downloads missing files from the Hugging Face dataset at the listed revision, checks sha256, follows redirects; replaces a file only if it is still exactly what it downloaded before, so a local rebuild is never overwritten; `games/.nsfw-state.json` remembers what it wrote), then loads them. A game with files still missing is not loaded.
- Publishing: the generator does it after each valid build (its `tools/publish_game.py`: Hugging Face for 18+, commit and push for all). By hand: `python3 tools/publish_nsfw.py <owner/dataset> [game]` (needs `huggingface_hub` and a write token), then commit `games/nsfw.json`. Dataset is public, tagged not-for-all-audiences, not gated.
- Test: `node tools/test_nsfw.js`.

## Őrség (`orseg`)

Built by the generator like every game (world, game, GAME.md, panels, theme, server.js, images, icons). Save ids still contain the old name `orseg_v2` and the server redirects one old route; harmless.
