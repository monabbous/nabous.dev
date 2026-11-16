import { initialState, createState, legalMoves, applyMove, gameStatus, chooseMove, toIndex, toSquare } from './engine.js';
import { pieceSvg, PIECE_NAMES } from './pieces.js';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'nabous.remorse-chess.v1';
const COLOR = { w: 'White', b: 'Black' };
let states = [initialState()];
let mode = 'computer';
let humanColor = 'w';
let level = 2;
let flipped = false;
let sound = false;
let selected = null;
let focusSquare = 'e2';
let thinking = false;
let worker = null;
let workerTimer = null;
let requestId = 0;
let storageAvailable = true;
let audioContext = null;
let pendingPromotion = null;
let demo = null;
let latestHealed = [];
let animationTimer = null;

const current = () => states[states.length - 1];
const history = () => states.slice(1).map((state) => state.lastMove);
const isComputerTurn = () => !demo && mode === 'computer' && current().turn !== humanColor;

function announce(message) { $('rc-announcement').textContent = message; }

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.moves) || data.moves.length > 1000) return;
    const restored = [initialState()];
    for (const move of data.moves) {
      if (gameStatus(restored.at(-1)).over) throw new Error('Saved game contains moves after its end.');
      restored.push(applyMove(restored.at(-1), move));
    }
    states = restored;
    mode = data.mode === 'local' ? 'local' : 'computer';
    humanColor = data.humanColor === 'b' ? 'b' : 'w';
    level = [1, 2, 3].includes(data.level) ? data.level : 2;
    flipped = Boolean(data.flipped);
    sound = Boolean(data.sound);
    if (states.length > 1) announce('Your saved game has been restored.');
  } catch {
    // Corrupt or unavailable storage must never prevent a fresh game.
    states = [initialState()];
  }
}

function save() {
  if (demo) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1, mode, humanColor, level, flipped, sound,
      moves: history().map(({ from, to, promotion }) => ({ from, to, ...(promotion ? { promotion } : {}) })),
    }));
    storageAvailable = true;
  } catch { storageAvailable = false; }
  $('rc-saved').textContent = storageAvailable ? 'SAVED ON THIS DEVICE' : 'THIS TAB ONLY';
}

function playSound(kind) {
  if (!sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const notes = kind === 'heal' ? [523.25, 659.25, 783.99] : kind === 'capture' ? [155, 115] : [330];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * .045;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.045, start + .008);
      gain.gain.exponentialRampToValueAtTime(.001, start + .14);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + .16);
    });
  } catch { /* Sound is optional, including in restricted browser contexts. */ }
}

function cancelComputer() {
  requestId += 1;
  worker?.terminate();
  worker = null;
  clearTimeout(workerTimer);
  workerTimer = null;
  thinking = false;
}

function computerMove() {
  if (!isComputerTurn() || gameStatus(current()).over || thinking) return;
  thinking = true;
  const id = ++requestId;
  renderStatus();
  const complete = (move) => {
    if (id !== requestId || !isComputerTurn()) return;
    cancelComputer();
    if (move) makeMove(move);
    else render();
  };
  const fallback = () => {
    if (id !== requestId || !isComputerTurn()) return;
    worker?.terminate();
    worker = null;
    complete(chooseMove(current(), 1));
  };
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('message', ({ data }) => {
      if (data.id !== id || id !== requestId) return;
      if (data.error) fallback();
      else complete(data.move);
    });
    worker.addEventListener('error', fallback, { once: true });
    worker.postMessage({ id, state: current(), level });
    workerTimer = setTimeout(fallback, 12000);
  } catch { workerTimer = setTimeout(fallback, 0); }
}

function makeMove(move) {
  let next;
  try { next = applyMove(current(), move); }
  catch {
    selected = null;
    render();
    announce('That move is no longer available. Choose another square.');
    return;
  }
  states.push(next);
  selected = null;
  focusSquare = next.lastMove.to;
  latestHealed = next.lastMove.absolved;
  clearTimeout(animationTimer);
  save();
  render();
  const log = next.lastMove;
  playSound(log.absolved.length ? 'heal' : log.capture ? 'capture' : 'move');
  let message = `${COLOR[log.color]} ${PIECE_NAMES[log.piece]} ${log.from} to ${log.to}.`;
  if (log.capture) message += ' Capture. This piece now feels remorse.';
  if (log.absolved.length) message += ` Absolved ${log.absolved.join(', ')}.`;
  const status = gameStatus(next);
  if (status.over) message += ` ${status.reason}.${status.winner ? ` ${COLOR[status.winner]} wins.` : ''}`;
  else if (status.check) message += ` ${COLOR[next.turn]} is in check.`;
  announce(message);
  $('rc-journal-scroll').scrollTop = $('rc-journal-scroll').scrollHeight;
  if (latestHealed.length) animationTimer = setTimeout(() => { latestHealed = []; }, 1300);
  computerMove();
}

function activateSquare(square) {
  if (demo) { announce('Use the guided example buttons to advance, or return to your game.'); return; }
  if (isComputerTurn() || gameStatus(current()).over) return;
  const state = current();
  const piece = state.board[toIndex(square)];
  if (selected) {
    const options = legalMoves(state, selected).filter((move) => move.to === square);
    if (options.length) {
      if (options.some((move) => move.promotion)) {
        pendingPromotion = { from: selected, to: square };
        $('rc-promotions').innerHTML = ['q', 'r', 'b', 'n'].map((type) => `<button type="button" class="rc-promote" data-promotion="${type}" aria-label="Promote to ${PIECE_NAMES[type]}">${pieceSvg({ type, color: state.turn })}<span>${PIECE_NAMES[type]}</span></button>`).join('');
        $('rc-promotion-dialog').showModal();
      } else makeMove(options[0]);
      return;
    }
  }
  if (piece?.color === state.turn) {
    selected = selected === square ? null : square;
    focusSquare = square;
    renderBoard();
    updateBoardHint();
    if (selected) announce(`${COLOR[piece.color]} ${PIECE_NAMES[piece.type]} on ${square}${piece.remorse ? ', remorseful' : ''}. ${legalMoves(state, selected).length} legal moves.`);
  } else {
    const selectedPiece = selected ? state.board[toIndex(selected)] : null;
    if (selectedPiece?.remorse && piece && piece.color !== state.turn) {
      $('rc-board-hint').textContent = 'This piece feels remorse. A friendly bishop must absolve it before it can capture.';
      announce($('rc-board-hint').textContent);
    } else {
      selected = null;
      renderBoard();
      updateBoardHint();
    }
  }
}

function undoTarget() {
  if (demo || states.length < 2) return -1;
  if (mode === 'local') return states.length - 2;
  for (let index = states.length - 2; index >= 0; index -= 1) {
    if (states[index].turn === humanColor) return index;
  }
  return -1;
}

function undo() {
  const target = undoTarget();
  if (target < 0) return;
  cancelComputer();
  states = states.slice(0, target + 1);
  selected = null;
  latestHealed = [];
  save();
  render();
  announce(mode === 'computer' ? 'Your last turn has been taken back.' : 'The last move has been taken back.');
}

function playerMarkup(color) {
  const state = current();
  const guilt = state.board.filter((piece) => piece?.color === color && piece.remorse).length;
  const name = demo ? COLOR[color] : mode === 'computer' ? (color === humanColor ? 'You' : 'The computer') : `${COLOR[color]} player`;
  const detail = !demo && mode === 'computer' && color !== humanColor ? `${COLOR[color]} · ${['', 'Gentle', 'Thoughtful', 'Challenging'][level]}` : `${COLOR[color]} pieces`;
  return `<div class="rc-player-main"><div class="rc-avatar${state.turn === color ? ' rc-active' : ''}" data-color="${color}" aria-hidden="true">${pieceSvg({ type: 'k', color })}</div><div><div class="rc-player-name">${name}</div><div class="rc-player-sub">${detail}</div></div></div><span class="rc-player-guilt" data-count="${guilt}"><i class="rc-guilt-dot" aria-hidden="true"></i>${guilt} remorseful</span>`;
}

function renderBoard() {
  const state = current();
  const activeSquare = document.activeElement?.dataset?.square;
  const legal = selected && !demo ? legalMoves(state, selected) : [];
  const targets = new Set(legal.map((move) => move.to));
  const check = gameStatus(state).check;
  const indices = Array.from({ length: 64 }, (_, index) => flipped ? 63 - index : index);
  const rows = [];
  for (let row = 0; row < 8; row += 1) {
    let html = `<div class="rc-board-row" role="row" aria-rowindex="${row + 1}">`;
    for (let column = 0; column < 8; column += 1) {
      const index = indices[row * 8 + column];
      const square = toSquare(index);
      const piece = state.board[index];
      const dark = (Math.floor(index / 8) + index % 8) % 2 === 1;
      const classes = ['rc-square', dark && 'rc-dark', piece && 'rc-occupied', selected === square && 'rc-selected', targets.has(square) && 'rc-target', piece?.remorse && 'rc-remorse', state.lastMove && [state.lastMove.from, state.lastMove.to].includes(square) && 'rc-last', check && piece?.type === 'k' && piece.color === state.turn && 'rc-checked', latestHealed.includes(square) && 'rc-healed'].filter(Boolean).join(' ');
      const label = `${square}${piece ? `, ${COLOR[piece.color]} ${PIECE_NAMES[piece.type]}${piece.remorse ? ', remorseful: cannot capture' : ''}` : ', empty'}${targets.has(square) ? ', legal destination' : ''}`;
      html += `<button type="button" role="gridcell" aria-colindex="${column + 1}" aria-selected="${selected === square}" class="${classes}" id="rc-square-${square}" data-square="${square}" aria-label="${label}" tabindex="${focusSquare === square ? 0 : -1}"${demo ? ' aria-disabled="true"' : ''}>${piece ? pieceSvg(piece) : ''}${piece?.remorse ? '<span class="rc-remorse-ring" aria-hidden="true"></span><span class="rc-remorse-badge" aria-hidden="true">!</span>' : ''}${column === 0 ? `<span class="rc-coordinate rc-rank" aria-hidden="true">${square[1]}</span>` : ''}${row === 7 ? `<span class="rc-coordinate rc-file" aria-hidden="true">${square[0]}</span>` : ''}</button>`;
    }
    rows.push(html + '</div>');
  }
  $('rc-board').innerHTML = rows.join('');
  if (activeSquare) $(`rc-square-${focusSquare}`)?.focus({ preventScroll: true });
  $('rc-player-top').innerHTML = playerMarkup(flipped ? 'w' : 'b');
  $('rc-player-bottom').innerHTML = playerMarkup(flipped ? 'b' : 'w');
}

function renderStatus() {
  const state = current();
  const status = gameStatus(state);
  const yours = mode === 'computer' && state.turn === humanColor;
  $('rc-mode-label').textContent = demo ? 'GUIDED EXAMPLE' : mode === 'computer' ? 'YOU VS COMPUTER' : 'TWO PLAYERS · ONE BOARD';
  $('rc-move-count').textContent = `MOVE ${String(state.fullmove).padStart(2, '0')}`;
  $('rc-saved').textContent = demo ? 'YOUR GAME IS SAFE' : storageAvailable ? 'SAVED ON THIS DEVICE' : 'THIS TAB ONLY';
  $('rc-turn-title').closest('.rc-status-card').dataset.thinking = String(thinking);
  let title;
  let detail;
  if (demo) {
    title = ['A clean conscience.', 'A moment of remorse.', 'Forgiven. For now.'][demo.step];
    detail = ['Watch the rook capture a pawn.', 'The orange ring means no more captures.', 'The bishop restores its ally’s ability to capture.'][demo.step];
  } else if (status.over) {
    title = status.winner ? (mode === 'computer' ? status.winner === humanColor ? 'You won.' : 'The computer won.' : `${COLOR[status.winner]} wins.`) : 'A peaceful ending.';
    detail = `${status.reason}. Start a new game or undo to explore another path.`;
  } else if (thinking) {
    title = 'Thinking it over…';
    detail = 'The computer is weighing its next move.';
  } else if (status.check) {
    title = yours ? 'Your king is in check.' : `${COLOR[state.turn]} is in check.`;
    detail = 'Find a legal way to protect your king.';
  } else {
    title = yours ? 'Your move.' : `${COLOR[state.turn]} to move.`;
    const last = state.lastMove;
    if (last?.absolved.length) detail = `Absolution. ${last.absolved.length === 1 ? 'A piece can' : `${last.absolved.length} pieces can`} capture again.`;
    else if (last?.capture) detail = 'A capture, a little remorse. Look for the orange ring.';
    else if (states.length === 1) detail = mode === 'computer' ? `You play ${COLOR[humanColor].toLowerCase()}. ${yours ? 'Make the first move.' : 'The computer opens.'}` : 'White makes the first move. Share the board with a friend.';
    else detail = ['Every piece has a conscience. Even the queen.', 'Your bishops are more valuable than they look.', 'A quiet move can change everything.', 'Keep a bishop close. Forgiveness takes a move.'][Math.floor(history().length / 2) % 4];
  }
  $('rc-turn-title').textContent = title;
  $('rc-turn-detail').textContent = detail;
  $('rc-undo').disabled = undoTarget() < 0;
  $('rc-new').disabled = Boolean(demo);
  $('rc-demo').disabled = Boolean(demo);
  updateBoardHint();
}

function updateBoardHint() {
  const piece = selected ? current().board[toIndex(selected)] : null;
  let message = 'Select a piece to see its legal moves.';
  if (demo) message = 'Follow the example below. Your game is safely paused.';
  else if (thinking) message = 'The computer is thinking. You can still undo or flip the board.';
  else if (gameStatus(current()).over) message = 'Game over. Start fresh, or undo to explore another move.';
  else if (piece?.remorse) message = 'Remorseful: this piece may move to empty squares, but cannot capture.';
  else if (piece?.type === 'b') message = 'A bishop move forgives remorseful allies on all eight neighbouring squares.';
  else if (selected) message = `${COLOR[piece.color]} ${PIECE_NAMES[piece.type]} selected. Choose a highlighted square.`;
  $('rc-board-hint').textContent = message;
}

function renderHistory() {
  const moves = history();
  $('rc-ply-count').textContent = `${moves.length} ${moves.length === 1 ? 'MOVE' : 'MOVES'}`;
  $('rc-empty-log').hidden = moves.length > 0;
  const rows = [];
  for (let index = 0; index < moves.length; index += 2) {
    const ply = (move, offset) => move ? `<span class="rc-log-ply${index + offset === moves.length - 1 ? ' rc-log-last' : ''}"><span>${move.notation}</span>${move.capture ? '<span class="rc-log-mark" title="Capture: remorse" aria-label="caused remorse">◉</span>' : ''}${move.absolved.length ? `<span class="rc-log-heal" title="Absolved ${move.absolved.join(', ')}" aria-label="granted absolution">✧</span>` : ''}</span>` : '<span></span>';
    rows.push(`<li><span class="rc-move-number">${Math.floor(index / 2) + 1}.</span>${ply(moves[index], 0)}${ply(moves[index + 1], 1)}</li>`);
  }
  $('rc-moves').innerHTML = rows.join('');
}

function render() {
  renderBoard();
  renderStatus();
  renderHistory();
  $('rc-sound').setAttribute('aria-pressed', String(sound));
  $('rc-sound').title = `Turn sound ${sound ? 'off' : 'on'}`;
  $('rc-sound').querySelector('span').textContent = `Sound ${sound ? 'on' : 'off'}`;
}

function openNewGame() {
  const form = $('rc-new-form');
  form.elements.mode.value = mode;
  form.elements.color.value = humanColor;
  form.elements.level.value = String(level);
  $('rc-replace-note').hidden = states.length === 1;
  updateNewGameForm();
  $('rc-new-dialog').showModal();
}

function updateNewGameForm() {
  const computer = $('rc-new-form').elements.mode.value === 'computer';
  $('rc-side-field').hidden = !computer;
  $('rc-level-field').hidden = !computer;
}

function startDemo() {
  cancelComputer();
  demo = { states, flipped, step: 0 };
  states = [createState({ position: {
    g1: { type: 'k', color: 'w' }, b3: { type: 'b', color: 'w' }, d4: { type: 'r', color: 'w' }, h2: { type: 'p', color: 'w' },
    g8: { type: 'k', color: 'b' }, d5: { type: 'p', color: 'b' }, e5: { type: 'p', color: 'b' }, h7: { type: 'p', color: 'b' },
  } })];
  flipped = false;
  selected = null;
  latestHealed = [];
  $('rc-demo-banner').hidden = false;
  updateDemo();
  render();
  $('rc-demo-banner').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  $('rc-demo-next').focus({ preventScroll: true });
}

function updateDemo() {
  const step = demo.step;
  $('rc-demo-step').textContent = `GUIDED EXAMPLE · ${step + 1} OF 3`;
  $('rc-demo-title').textContent = ['Every capture leaves a mark.', 'The rook cannot capture again.', 'A little forgiveness changes everything.'][step];
  $('rc-demo-copy').textContent = [
    'The white rook on d4 can take the black pawn on d5. Watch what happens to the rook after it captures.',
    'The rook has an orange remorse ring. It could move to an empty square, but it cannot take the pawn on e5. Next, Black plays h6 and White moves the bishop from b3 to c4, beside the rook.',
    'The bishop moved beside the remorseful rook and absolved it. The ring is gone. After Black’s next move, the rook can capture again. That is the heart of Remorse Chess.',
  ][step];
  $('rc-demo-next').textContent = ['Capture the pawn', 'Move the bishop', 'Return to my game'][step];
}

function advanceDemo() {
  if (!demo) return;
  if (demo.step === 0) {
    makeMove({ from: 'd4', to: 'd5' });
    demo.step = 1;
  } else if (demo.step === 1) {
    makeMove({ from: 'h7', to: 'h6' });
    makeMove({ from: 'b3', to: 'c4' });
    demo.step = 2;
  } else { exitDemo(); return; }
  updateDemo();
  render();
  announce($('rc-demo-copy').textContent);
}

function exitDemo() {
  if (!demo) return;
  states = demo.states;
  flipped = demo.flipped;
  demo = null;
  selected = null;
  latestHealed = [];
  $('rc-demo-banner').hidden = true;
  render();
  announce('Back to your game, exactly where you left it.');
  $('rc-board').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $(`rc-square-${focusSquare}`)?.focus({ preventScroll: true });
  computerMove();
}

$('rc-board').addEventListener('click', (event) => {
  const square = event.target.closest('[data-square]')?.dataset.square;
  if (square) activateSquare(square);
});
$('rc-board').addEventListener('keydown', (event) => {
  const square = event.target.closest('[data-square]')?.dataset.square;
  if (!square) return;
  if (event.key === 'Escape') {
    selected = null;
    renderBoard();
    updateBoardHint();
    return;
  }
  const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (!directions[event.key]) return;
  event.preventDefault();
  const visualIndex = flipped ? 63 - toIndex(square) : toIndex(square);
  const [dr, dc] = directions[event.key];
  const row = Math.max(0, Math.min(7, Math.floor(visualIndex / 8) + dr));
  const col = Math.max(0, Math.min(7, visualIndex % 8 + dc));
  const nextIndex = row * 8 + col;
  focusSquare = toSquare(flipped ? 63 - nextIndex : nextIndex);
  $('rc-board').querySelectorAll('[tabindex="0"]').forEach((element) => { element.tabIndex = -1; });
  const button = $(`rc-square-${focusSquare}`);
  button.tabIndex = 0;
  button.focus();
});
$('rc-promotions').addEventListener('click', (event) => {
  const promotion = event.target.closest('[data-promotion]')?.dataset.promotion;
  if (!promotion || !pendingPromotion) return;
  const move = { ...pendingPromotion, promotion };
  pendingPromotion = null;
  $('rc-promotion-dialog').close();
  makeMove(move);
});
$('rc-promotion-dialog').addEventListener('close', () => { pendingPromotion = null; });
$('rc-new').addEventListener('click', openNewGame);
$('rc-new-form').addEventListener('change', updateNewGameForm);
$('rc-new-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  cancelComputer();
  mode = data.get('mode') === 'local' ? 'local' : 'computer';
  humanColor = data.get('color') === 'b' ? 'b' : 'w';
  level = [1, 2, 3].includes(Number(data.get('level'))) ? Number(data.get('level')) : 2;
  states = [initialState()];
  flipped = mode === 'computer' && humanColor === 'b';
  selected = null;
  focusSquare = flipped ? 'e7' : 'e2';
  latestHealed = [];
  $('rc-new-dialog').close();
  save();
  render();
  announce(`New game. ${mode === 'computer' ? `You play ${COLOR[humanColor].toLowerCase()} against the computer.` : 'Two players, one board.'}`);
  computerMove();
});
$('rc-undo').addEventListener('click', undo);
$('rc-flip').addEventListener('click', () => { flipped = !flipped; save(); renderBoard(); announce(`Board flipped. ${flipped ? 'Black' : 'White'} is at the bottom.`); });
$('rc-sound').addEventListener('click', () => { sound = !sound; save(); render(); if (sound) playSound('move'); });
$('rc-rules').addEventListener('click', () => $('rc-rules-dialog').showModal());
$('rc-demo').addEventListener('click', startDemo);
$('rc-demo-next').addEventListener('click', advanceDemo);
$('rc-demo-exit').addEventListener('click', exitDemo);
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => $(button.dataset.close).close()));
document.querySelectorAll('.rc-dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));

restore();
save();
render();
computerMove();
