# pAIr-lock

*[English below](#english)*

Kétjátékos szabadulószobák élő AI-mesélővel, böngészőben, magyarul.

Ketten játszotok, mindenki a saját gépén, a saját linkjén. Szabad szöveggel írjátok, mit csináltok („benézek az ágy alá”, „kézen fogom, és lemegyünk a pincébe”), a játék pedig mesél, képeket mutat, és ha kell, kattintós feladványokat ad: kódzárat, morzét, csöveket, rádiót. Lehettek egy szobában vagy külön, ilyenkor csak azt látjátok, amit ott, ahol álltok, és meg kell beszélnetek, mit találtatok.

A játék igazsága nem az AI fejében van: a motor dönti el, mi hol van, mi nyílik ki és mi a megoldás. Az AI csak érti, amit írtok, és elmeséli, ami történik. Így nem tud nyomot kitalálni, és nem tudja véletlenül elárulni a megoldást.

## Játékok

<img src="docs/banners/orseg.jpg" alt="Az utolsó őrség" width="720">

**Az utolsó őrség.** Vihar-szirt, 1908. A világítótorony három napja sötét, az őrök eltűntek, és éjfél körül erre tart a Zrínyi gőzhajó.

<img src="docs/banners/expressz.jpg" alt="Az Éjszakai Expressz" width="720">

**Az Éjszakai Expressz.** 1938, a Budapest–Isztambul hálókocsis expressz. A vonat két végén ébredtek: se utas, se kalauz, és a vonat nem lassít.

<img src="docs/banners/szeansz.jpg" alt="A Szeánsz" width="720">

**A Szeánsz.** Budapest, Rózsadomb, 1930. Egy híres médium villája, amelyet hét éve, egy szeánsz közepén történt eltűnése óta senki nem nyitott ki.

<img src="docs/banners/tihany.jpg" alt="A Tihany Üdülő" width="720">

**A Tihany Üdülő.** Vállalati üdülő a Balaton partján, két korban: egyikőtök 1974-ben jár benne, a másik ma. Csak egy öreg rádión át hallják egymást.

<img src="docs/banners/okosotthon.jpg" alt="Az Okosotthon" width="720">

**Az Okosotthon.** Üveg-beton villa a budai erdő szélén. A tulajdonos eltűnt, és a házrendszer udvariasan, de szigorúan bezárt titeket.

<img src="docs/banners/holdbazis.jpg" alt="A Holdbázis" width="720">

**A Holdbázis.** 2090, a Hold déli pólusa. A bázis egyetlen ügyeletese órák óta nem jelentkezik, ti vagytok a legközelebbi mentőkomp legénysége.

<img src="docs/banners/szezonzaras.jpg" alt="Szezonzárás" width="720">

**Szezonzárás.** Porto Lieto, 1965, a kaszinó szezonjának utolsó éjszakája. Elegáns tolvajok vagytok; az őr kint köröz a kertben.

**A `games/` mappa spoilereket tartalmaz** (megoldások, kódok, a történet igazsága): ha játszani akartok, ne nézzetek bele.

## 18+ játékok

Van három felnőtteknek szóló, erotikus játék is. Ezekben is csak nyomoztok: a hangulatot a hely és a nyomok adják, minden ábrázolt szereplő felnőtt. **Nem ebben a repóban vannak**, és a szerver alapból nélkülük indul. A `--nsfw` kapcsolóval (`node server.js --nsfw`) a szerver induláskor letölti a hiányzó fájlokat (a lista: `games/nsfw.json`), ellenőrzi őket, és betölti ezeket a játékokat is. A fájlok a Hugging Face-en vannak: [vaily/pair-lock-nsfw](https://huggingface.co/datasets/vaily/pair-lock-nsfw).

<img src="docs/banners/a_modell.jpg" alt="A Modell" width="720">

**A Modell.** Szentendre, napjainkban. Egy festő háza és egy hétrészes aktsorozat, amelynek hetedik képét soha senki nem látta.

<img src="docs/banners/kek_szalon.jpg" alt="A Kék Szalon" width="720">

**A Kék Szalon.** Budapest, napjaink. Egy Andrássy úti bérház befalazott emelete: a század eleji Pest legelőkelőbb bordélya, 1905 óta érintetlenül.

<img src="docs/banners/szimulacio.jpg" alt="A Szerelmi Szimuláció" width="720">

**A Szerelmi Szimuláció.** Budapest, 2045. Egy luxus VR-szolgáltatás ügyfele bent rekedt a fantáziák között.

## Ami kell hozzá

- [Node.js](https://nodejs.org/) 22.18 vagy újabb. Más függőség nincs, `npm install` sem kell.
- Egy [DeepSeek](https://platform.deepseek.com/) API-kulcs, feltöltött egyenleggel. A játék ezt használja a szövegértéshez és a meséléshez, a te egyenlegedből.

## Indítás

```bash
git clone <ennek a repónak a címe> pairlock
cd pairlock
node server.js
```

Aztán:

1. Nyisd meg a http://localhost:8800/ oldalt **azon a gépen, ahol a szerver fut**.
2. ⚙️ **Beállítások**: add meg a DeepSeek-kulcsot. A kulcs csak ezen a gépen tárolódik (`settings.json`), a böngésző soha nem kapja vissza.
3. Válassz játékot, **Új játék**, írjátok be a neveteket. Kapsz két linket, egyet-egyet a két játékosnak.
4. A másik játékos ugyanazon a hálózaton a saját gépén nyitja meg a linkjét (a főoldal a gép hálózati címével adja meg).

Egyedül is lehet játszani: ilyenkor a második játékos helyett is te döntesz.

A port a `config.json`-ban állítható. A mentések a `saves/` mappába kerülnek, a félbehagyott játék bármikor folytatható.

**Biztonság:** a főoldalnak nincs jelszava, a hálózaton bárki elérheti, aki tudja a címét. Otthoni hálózatra készült, ne tedd ki az internetre.

## Fejlesztőknek

- `CLAUDE.md`: a teljes műszaki leírás (felépítés, világmodell, AI-réteg, modulok, tesztek). Angolul.
- `modules/`: a kattintós feladványok, mindegyik saját leírással.
- Tesztek modellhívás és költség nélkül: `python3 tools/test_playthrough.py` (teljes végigjátszás), `node tools/test_world_v2.js`, és a `tools/test_*.js` modultesztek.
- A kód angol, a játékosnak szóló szöveg a `locales/` és a `games/` mappában van, így más nyelv is hozzáadható.

## AI és képek

- A mesélés és a szövegértés: DeepSeek (a te kulcsoddal, a te költségedre).
- A képek AI-val készültek: főleg FLUX.3 klein, részben FLUX.2 klein 9B (Black Forest Labs) és Qwen-Image 2.1 (Alibaba Qwen), helyben generálva, kézzel válogatva és ellenőrizve.

## Licenc

- **Kód** (minden, ami nem a `games/` mappa és nem kép): [MIT](LICENSE).
- **Játéktartalom** (`games/`: szövegek, rejtvények, képek, valamint a `public/header.jpg` és a favicon): [CC BY-NC 4.0](games/LICENSE.md). Szabadon játszható, továbbadható és átdolgozható, a forrás megjelölésével, nem kereskedelmi célra.

---

<a id="english"></a>

# pAIr-lock (English)

Two-player escape rooms with a live AI narrator, in the browser. **The games are in Hungarian**; the engine and its documentation are in English, and the player-facing text lives in `locales/` and `games/`, so other languages can be added.

Two players, each on their own computer with their own link, type freely what they do ("I look under the bed", "I take her hand and we go down to the cellar"). The game narrates, shows pictures and, when needed, opens click-based puzzles: code locks, Morse, pipes, a radio. Players may stand in the same room or apart; apart, each sees only their own surroundings and they have to tell each other what they found.

The truth of the game does not live in the AI. The engine decides what is where, what opens and what the solution is; the AI only understands what players write and narrates what happens. So it cannot invent clues or give away a solution.

## Games

Seven games: *Az utolsó őrség* (a lighthouse, 1908), *Az Éjszakai Expressz* (a sleeper train, 1938), *A Szeánsz* (a medium's villa, 1930), *A Tihany Üdülő* (a holiday home in two eras, 1974 and today), *Az Okosotthon* (a locked-down smart house), *A Holdbázis* (a silent Moon base, 2090) and *Szezonzárás* (a casino heist, 1965). **The `games/` folder contains spoilers.**

## Requirements

- [Node.js](https://nodejs.org/) 22.18 or newer. No other dependencies, no `npm install`.
- A [DeepSeek](https://platform.deepseek.com/) API key with credit. It is used for understanding and narration, on your credit.

## Running

```bash
git clone <this repo> pairlock
cd pairlock
node server.js
```

1. Open http://localhost:8800/ **on the machine running the server**.
2. ⚙️ **Beállítások** (Settings): enter the DeepSeek key. It is stored only on this machine (`settings.json`) and never sent back to a browser.
3. Pick a game, **Új játék** (New game), enter the names. You get two links, one per player.
4. The other player opens their link on their own computer on the same network.

The port is set in `config.json`; saves go to `saves/` and any game can be continued later. Solo play is possible.

**Security:** the home page has no password; anyone on the network who knows the address can reach it. Made for a home network, not the internet.

## Development

The full technical description (structure, world model, AI layer, modules, tests) is in `CLAUDE.md`. Tests without model calls or cost: `python3 tools/test_playthrough.py`, `node tools/test_world_v2.js` and the `tools/test_*.js` module tests.

## AI and images

Narration and understanding: DeepSeek (your key, your cost). Images are AI-generated, mostly with FLUX.3 klein, partly with FLUX.2 klein 9B (Black Forest Labs) and Qwen-Image 2.1 (Alibaba Qwen), generated locally, picked and checked by hand.

## License

- **Code** (everything except `games/` and images): [MIT](LICENSE).
- **Game content** (`games/`: texts, puzzles, images; also `public/header.jpg` and the favicon): [CC BY-NC 4.0](games/LICENSE.md).
