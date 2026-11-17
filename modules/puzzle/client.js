// @ts-check
// Puzzle UI: cuts the image with the outlines from the server and drags pieces. Positions, locking and the win are decided on the server.
/** @typedef {import('./types.ts').PuzzleView} View */
/** @typedef {import('./types.ts').PuzzleMove} Move */
/** @typedef {import('./types.ts').PieceView} Piece */
window.DuoTypes = window.DuoTypes || {};
/** @type {import('../types.ts').ClientModule<View, Move>} */
window.DuoTypes.puzzle = (box, first, ctx) => {
  const frame = /** @type {HTMLElement | null} */ (box.closest('.box')); if (frame) frame.style.maxWidth = 'min(1200px, 96vw)';
  const SEND_MS = 90, board = document.createElement('div'), area = document.createElement('div'), image = new Image();
  board.className = 'mod-board'; area.className = 'mod-area'; board.append(area);
  if (first.note) { const n = document.createElement('p'); n.className = 'mod-info'; n.textContent = first.note; box.append(n); }
  box.append(board);
  let current = first, W = 0, H = 0, ready = false;
  /** @type {Map<number, { canvas: HTMLCanvasElement, dragging: boolean }>} */
  const items = new Map();

  function position(/** @type {Piece} */ p) {
    const it = items.get(p.id); if (!it || it.dragging) return;
    it.canvas.style.left = `${p.x * W}px`; it.canvas.style.top = `${p.y * H}px`; it.canvas.style.zIndex = String(p.placed ? 0 : p.z + 1);
    it.canvas.classList.toggle('placed', p.placed);
  }
  function drawPiece(/** @type {Piece} */ p) {
    let it = items.get(p.id);
    if (!it) { it = { canvas: document.createElement('canvas'), dragging: false }; it.canvas.className = 'mod-piece'; items.set(p.id, it); board.append(it.canvas); attach(p.id, it); }
    const c = it.canvas, g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')), rw = Math.ceil(p.width * W) + 1, rh = Math.ceil(p.height * H) + 1; c.width = rw; c.height = rh;
    g.beginPath(); p.outline.forEach(([x, y], i) => i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)); g.closePath();
    g.save(); g.clip(); g.drawImage(image, -p.corner[0] * W, -p.corner[1] * H, W, H); g.restore(); g.strokeStyle = 'rgba(40,25,10,.7)'; g.stroke();
    position(p);
  }
  function attach(/** @type {number} */ id, /** @type {{ canvas: HTMLCanvasElement, dragging: boolean }} */ it) {
    let startX = 0, startY = 0, x = 0, y = 0, last = 0;
    const c = it.canvas, sent = (/** @type {boolean} */ drop) => ctx.act(drop ? { piece: id, x: x / W, y: y / H, drop } : { piece: id, x: x / W, y: y / H, live: true });
    c.addEventListener('pointerdown', e => { if (c.classList.contains('placed')) return; c.setPointerCapture?.(e.pointerId); it.dragging = true; x = parseFloat(c.style.left); y = parseFloat(c.style.top); startX = e.clientX - x; startY = e.clientY - y; c.style.zIndex = '100000'; });
    c.addEventListener('pointermove', e => { if (!it.dragging) return; x = e.clientX - startX; y = e.clientY - startY; c.style.left = `${x}px`; c.style.top = `${y}px`; const t = performance.now(); if (t - last > SEND_MS) { last = t; sent(false); } });
    const end = () => { if (!it.dragging) return; it.dragging = false; sent(true); };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  }
  function fit() {
    const room = Math.max(280, box.clientWidth), maxH = Math.max(280, window.innerHeight - 240), aspect = image.naturalHeight / image.naturalWidth, total = 1 + 0.02 + current.trayWidth;
    W = Math.min(room / total, maxH / aspect); H = W * aspect;
    board.style.width = `${W * total}px`; board.style.height = `${H}px`; area.style.width = `${W}px`; area.style.height = `${H}px`;
    current.pieces.forEach(drawPiece);
  }
  image.onload = () => { ready = true; fit(); };
  image.src = ctx.img?.(first.image) ?? first.image;
  window.addEventListener('resize', fit);
  return {
    update(v) { current = v; if (ready) v.pieces.forEach(p => { if (items.has(p.id)) position(p); }); },
    destroy() { window.removeEventListener('resize', fit); },
  };
};
