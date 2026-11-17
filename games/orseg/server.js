// Game-specific rule, never served to the browser: a wrong attempt or a hint costs one mile.
module.exports = {
  decorate(msg, history) {
    const t = history.join('\n'); if (/\(GAME: GYÚJTÁS K-(20|32)/.test(t) || /^\(GAME: (GYÚJTÁS|jegyzőkönyv)/.test(msg.text)) return msg;
    const past = t.match(/\(GAME: (WRONG|HINT),/g)?.length || 0, cost = /^\(GAME: (WRONG|HINT),/.test(msg.text) ? 1 : 0, left = Math.max(0, 12 - past - cost);
    return { text: `${msg.text} (Zrínyi: ${left} mérföld)`, silent: msg.silent && left > 0 };
  },
};
