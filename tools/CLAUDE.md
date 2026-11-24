# Tests and tools

**Spoilers:** `make_*.py`, `highlights.js` output, `pipes_solver` full result, `-v` playthrough output. Report only numbers and general experience. Model calls spend the user's DeepSeek credit: avoid them unless needed, and say when one was used. Always test on your own test game and delete it afterwards by its id (`DELETE /api/runs/<id>?hard=1`). A browser test needs two tabs with the player links.

## Default

- `python3 tools/test_playthrough.py`: **the default after any code change.** Full 47-step playthrough, no model, no cost, own server (port 8802) and temp save folder. Interpreter answers replayed from `tools/fixtures/orseg_interpreter.json` (`engine/ai_replay.js`); narrator is a fixed marker. `-v` prints every step (spoilers).
- `--ai`: same with the real model. **Rare:** only when interpreter, narrator or prompt changed, or before switching versions (replay cannot notice a changed prompt). Usually fails one step ("kabát zsebei" read as the coat rack): known interpreter weakness.
- `--record`: real interpreter only for sentences missing from the fixture; use after adding a step.
- `DUO_ALLOW_DIRECT=1` lets the playthrough report solutions directly; the test sets it for its own server. **Never in real play.**

## Own-server tests (no model unless noted)

- `python3 tools/test_threads.py` (port 8805): together and apart: waiting together, private replies apart, notices, each thread's narrator prompt only grows (cache) and never contains the other thread. `--record` calls the real interpreter once for a missing sentence.
- `python3 tools/test_settings.py` (port 8806, temp settings file): key never sent back, file private and never served. One free DeepSeek call with a made-up key.
- `python3 tools/test_eras_server.py` (port 8808): fixture game `tools/fixtures/games/eras` (`DUO_GAMES` points the server at another games folder): two threads from the start also alone, switch link, per-player things in a shared scene.
- `python3 tools/test_resume.py` (port 8804, temp saves): restart, kept notes, interrupted reply.
- `python3 tools/test_ui_round.py` (port 8809): waiting toggle, look-around button, highlight click, room picture on re-entering.
- `node tools/test_modules.js`: module framework and code lock over HTTP against a running server on 8800 (started without `DUO_ALLOW_DIRECT`), no model, prints no codes.

## Offline unit tests (no server; run as `node tools/<file>`)

- Engine: `test_world_v2.js` (parts, containers, hidden, `{contents}`, props, doors, room texts, events, timers, player conditions, knowledge, joint moves, interpreter view, start-up checks, old saves), `test_movement.js [--model]` (movement and joint movement, made-up world + Őrség room names; `--model` calls the real interpreter), `test_players.js` (single-person room, avatar texts, gender markup), `test_eras.js` (two eras, world level), `test_highlight.js` (highlights, hand marks, endings, article rule, room picture marker, mark validation), `test_colorize.js`, `test_strings.js` (every key in every locale, no Hungarian left in code), `test_nsfw.js` (download vs local stand-in: missing files, nothing twice, local changes kept, updates, bad checksum, redirects; no network).
- Modules (made-up data): `test_morse.js`, `test_gauge_board.js`, `test_puzzle.js`, `test_pipes.js`, `test_logic_grid.js`, `test_uv_lamp.js`, `test_spot_difference.js`, `test_sequence.js`, `test_scratch_reveal.js`, `test_typewriter_ribbon.js`, `test_locomotive.js`, `test_stereo_viewer.js`, `test_darkroom.js`, `test_cipher_disc.js`, `test_planchette.js`, `test_knocking.js` (also place-bound sides, `closed` + `closedText`), `test_chain.js` (gears, shutter_lamp, report_form), `test_time_capsule.js` (also `sidesByPlayer`, `talkAfterSolved`), `test_match_matrix.js`, `test_param_console.js`, `test_dual_word.js`, `test_camera_guide.js`, `test_guard_round.js` (caught message, pause on leave), `test_roulette.js` (hidden control and wheel, magnet, alone by place), `test_airlock.js`, `test_power_router.js`.
- Type check (development only): `npx -y -p typescript tsc --noEmit -p .`.

## Real model (user's credit)

- `node tools/test_interpreter.js [repeats]`: open vs force sentences, each repeated (default 5); prints only item ids and verbs. Run when the interpreter prompt or `forInterpreter` changed.
- `node tools/colorize_trial.js <game> [runs]`: small cost, writes `saves/colorize-trial/<game>.md` (`../engine/colorize.md`).

## Checkers (spoiler output)

- `node tools/highlights.js <game> [--all]`: per text what would be marked and where it points.
- `node -e "console.log(!!require('./tools/pipes_solver')(<options>))"`: whether a pipes grid is solvable; print only the boolean.
