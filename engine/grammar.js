// Language rules the engine needs when it writes a name into a sentence itself. The data comes from locales/<lang>.json engine.grammar.
// article: {vowel, consonant, vowels, numbers}: the definite article before a vowel or a consonant sound; "numbers": "hu" reads a leading
// number the Hungarian way (5, 50, 500 start with a vowel sound, and so do 1 and 1000 when read as words).
function article(word, G) {
  const A = G?.article; if (!A) return '';
  const w = String(word || '').trim(), num = w.match(/^\d+/);
  let vowel;
  if (num && A.numbers === 'hu') { const d = +num[0][0], k = num[0].length % 3; vowel = d === 5 || (k === 1 && d === 1); }
  else vowel = (A.vowels || '').includes(w.charAt(0).toLowerCase());
  return vowel ? A.vowel : A.consonant;
}
/** The word with its article in front, unless it already starts with one. */
function withArticle(word, G) {
  const A = G?.article, w = String(word || '').trim(); if (!A) return w;
  const low = w.toLowerCase(); if ([A.vowel, A.consonant].some(a => low.startsWith(a.toLowerCase() + ' '))) return w;
  return `${article(w, G)} ${w}`;
}
module.exports = { article, withArticle };
