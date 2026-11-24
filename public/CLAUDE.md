# Browser side: home page and player page

Server side of the conveniences (look button, highlights, room view, waiting toggle): `../engine/CLAUDE.md`. Strings: `strings.js`, `locales/*.json` `ui` (home page: `ui.home`) (a new string needs a server restart).

## Player page (`play.html`, `play.js`)

- Story and input on the left; on the right a large image, paged gallery, inventory strip and notebook (own and shared). Top: play time and status, each player's name with their current room.
- Several images at once show in a grid; one large image on page load. The large view pages with arrows, wheel, buttons and dragging. Images are requested as `images/<id>.jpg` (since 2026-11-17, `IMG`).
- Tooltip: `tip.js`, not the browser's `title`.
- Panel list works from the engine without a model call and shows every panel found; panels not yet usable are hidden. Solved = green; solved but still changeable = blue (`game.json` `panelRetryUntil`: until which message). Panels `panelAvail` locks now (solved, or elsewhere) stay faded; a click says it cannot be used from here (or that it is done), never "not reached yet".
- "Hová megyek" lists known rooms reachable over open paths (`W.routes`); no model, but counts as a move, so the round still waits for the other player.
- Help comes from engine data listing what has not been looked at.
- "Körülnézek" button beside the input; highlights in the accent colour only (no underline); waiting toggle in the header (not shown alone); partner's new message flashes (+ soft tone with waiting off).
- Layout option: `game.json` `"ui": {"layout": "chat-right"}`.

## UI theme per game (`games/<id>/theme.css`)

Overrides CSS variables `--bg`, `--panel`, `--panel2`, `--ink`, `--muted`, `--line`, `--accent`, `--send`, `--tool`, `--view`, `--serif`, `--ui`, `--radius`, and may add any other style. Modules use the theme variables.

## Home page (`index.html`, `home.js`, end of `style.css`)

- **Header** `header.jpg`: pAIr-lock logo across the full width (3072x256, 12:1, logo centred, A and I bright with a keyhole in the A; FLUX.3 klein, 2026-11-06). Kept centred when the browser crops it. A future designed logo replaces this file.
- **Cards** in a grid: two columns when wide enough (min. 560px each, page max. 1400px), one on narrow screens; banner shrinks with the column, buttons stay at the card bottom. Each card: banner (`game.json` `cover`, 5:1; without it the title as text, see `../games/CLAUDE.md` → Cover), description and goal, then:
  - **Új játék**: dialog asks for player names. Prefill: names last used (server keeps them in `settings.json` `lastPlayers`, saved when a game is started from the home page with `remember: true`, read via `GET /api/players/last`; alone, the saved second name stays), else the game's sample names (`players`: Jancsi, Juliska); placeholders "1. játékos" / "2. játékos" once cleared. Both required unless solo. Beside each name a ♀ / ♂ toggle (one click switches; last used, also in `lastPlayers`, else ♂ Jancsi, ♀ Juliska), shown for every game, saved on the run as `genders: ['f'|'m', …]`. After starting it shows the player links.
  - **Játék folytatása** (only with saves) with the number of saves: dialog lists them newest first, scrollable, each with its links, regenerate, copy and delete.
  - `game.json` `contentWarning` (e.g. bloody horror) shows on the card and at the top of the New game dialog; without it nothing changes.
  - Two-era games: the New game window shows the era by each name with a swap button.
