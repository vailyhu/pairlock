// Shared answer check for modules: accents, case and punctuation are ignored. The answer is given as plain text (answer) or as a hash (hash).
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const fnv = s => { let h = 0x811c9dc5; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
const check = (cfg, id, guess) => { const v = norm(guess); return cfg.answer !== undefined ? v === norm(cfg.answer) : fnv(`${id}:${v}`) === cfg.hash; };
module.exports = { norm, fnv, check };
