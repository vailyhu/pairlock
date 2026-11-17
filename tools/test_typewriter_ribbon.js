// Typewriter ribbon module without the server, on made-up values. No game data.
const Mod = require('../engine/modules');
const cfg = { type: 'typewriter_ribbon', title: 'R', keepAfterSolved: true, options: { text: 'A KULCS A VÁZA ALATT VAN', lineLength: 10, noise: .4, answer: 'VÁZA', answerLabel: 'Hol?', okText: 'ok', badText: 'no' } };
let bad = 0; const check = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}: ${JSON.stringify(got)}`); };
const r = { solo: true, messages: [], world: { solved: {} } }; Mod.setPush(() => {});
const A = m => Mod.act(cfg, 'r', r, 0, m), V = () => Mod.view(cfg, 'r', r, 0).view;
const v0 = V();
check('pages', [v0.page, v0.pages], [1, 3]);
check('view holds no text, answer or option', ['KULCS', 'VÁZA', '"answer"', '"text"'].some(s => JSON.stringify(v0).includes(s)), false);
const letters = v => v.glyphs.filter(g => g.a >= .75).sort((a, b) => a.x - b.x).map(g => g.c).join('');
check('unmirrored strikes run backwards', letters(v0), 'ASCLUKA');
check('old faint strikes mixed in', v0.glyphs.some(g => g.a < .4), true);
A({ mirror: true }); check('mirrored reads forward', letters(V()), 'AKULCSA');
A({ scroll: 1 }); A({ scroll: 1 }); A({ scroll: 1 }); check('scroll stops at the end', V().page, 3);
check('same window looks the same', JSON.stringify(V()) === JSON.stringify(V()), true);
let w = A({ answer: 'a padló alatt' }); check('wrong answer', [w.view.wrong, w.view.text], [true, 'no']);
w = A({ answer: 'A váza alatt!' }); check('right answer in a sentence solves', [w.view.justSolved, w.msgs[0].text], [true, '(GAME: SOLVED, R)']);
check('plain text after solving', Mod.view(cfg, 'r', r, 0).view.plain, 'A KULCS A VÁZA ALATT VAN');
console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
