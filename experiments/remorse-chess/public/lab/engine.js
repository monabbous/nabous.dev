/**
 * Remorse Chess — a small, immutable, dependency-free rules engine.
 *
 * Board indexes run from a8 (0) to h1 (63). Public moves use algebraic squares.
 * A capture gives the capturing piece remorse. Such a piece can move but cannot
 * capture or attack. Only a move made by a bishop absolves adjacent friendly
 * pieces, after that move; the bishop does not absolve itself. A remorseful
 * bishop may still absolve others. Promotion retains remorse and does not
 * trigger absolution. Kings may not be captured or stand next to one another.
 *
 * These last edge-case rulings are this implementation's documented conventions,
 * not a claim that the creator's short video specifies every chess edge case.
 */

const FILES = 'abcdefgh';
const TYPES = 'pnbrqk';
const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const NEIGHBORS = [...DIAGONAL, ...STRAIGHT];
const PROMOTIONS = ['q', 'r', 'b', 'n'];
const VALUE = { p: 100, n: 320, b: 380, r: 500, q: 900, k: 0 };

export const opposite = (color) => color === 'w' ? 'b' : 'w';

export function toIndex(square) {
  if (typeof square !== 'string' || !/^[a-h][1-8]$/.test(square)) return -1;
  return (8 - Number(square[1])) * 8 + FILES.indexOf(square[0]);
}

export function toSquare(index) {
  if (!Number.isInteger(index) || index < 0 || index > 63) return null;
  return FILES[index % 8] + (8 - Math.floor(index / 8));
}

const inside = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;
const cloneBoard = (board) => board.map((piece) => piece ? { ...piece } : null);
const neighbors = (a, b) => Math.max(Math.abs(Math.floor(a / 8) - Math.floor(b / 8)), Math.abs(a % 8 - b % 8)) === 1;

/** Create a test/tutorial position. Omitted castling rights default to none. */
export function createState({ board, position, turn = 'w', castling = '', enPassant = null, halfmove = 0, fullmove = 1 } = {}) {
  const cells = board ? cloneBoard(board) : Array(64).fill(null);
  if (cells.length !== 64) throw new Error('A board must contain 64 squares.');
  if (position) {
    for (const [square, piece] of Object.entries(position)) {
      const index = toIndex(square);
      if (index < 0) throw new Error(`Invalid square: ${square}`);
      cells[index] = piece ? { ...piece } : null;
    }
  }
  for (let index = 0; index < 64; index += 1) {
    const piece = cells[index];
    if (!piece) continue;
    if (!TYPES.includes(piece.type) || piece.type.length !== 1 || !['w', 'b'].includes(piece.color)) {
      throw new Error(`Invalid piece on ${toSquare(index)}.`);
    }
    piece.remorse = Boolean(piece.remorse);
  }
  if (!['w', 'b'].includes(turn)) throw new Error('Invalid side to move.');
  if (!/^(K?Q?k?q?)$/.test(castling)) throw new Error('Invalid castling rights.');
  if (enPassant !== null && (toIndex(enPassant) < 0 || !/[36]$/.test(enPassant))) throw new Error('Invalid en passant square.');
  if (!Number.isInteger(halfmove) || halfmove < 0 || !Number.isInteger(fullmove) || fullmove < 1) throw new Error('Invalid move counters.');
  for (const color of ['w', 'b']) {
    if (cells.filter((piece) => piece?.type === 'k' && piece.color === color).length !== 1) {
      throw new Error('Each side must have exactly one king.');
    }
  }
  const state = { board: cells, turn, castling, enPassant, halfmove, fullmove, history: [], lastMove: null };
  state.history = [positionKey(state)];
  return state;
}

export function initialState() {
  const board = Array(64).fill(null);
  const back = 'rnbqkbnr';
  for (let file = 0; file < 8; file += 1) {
    board[file] = { type: back[file], color: 'b', remorse: false };
    board[8 + file] = { type: 'p', color: 'b', remorse: false };
    board[48 + file] = { type: 'p', color: 'w', remorse: false };
    board[56 + file] = { type: back[file], color: 'w', remorse: false };
  }
  return createState({ board, castling: 'KQkq' });
}

/** Geometric attacks include pinned pieces, as in ordinary king-safety rules. */
export function isAttacked(state, square, byColor) {
  const target = typeof square === 'string' ? toIndex(square) : square;
  if (target < 0 || target > 63) return false;
  const row = Math.floor(target / 8);
  const col = target % 8;
  for (let from = 0; from < 64; from += 1) {
    const piece = state.board[from];
    if (!piece || piece.color !== byColor) continue;
    const fromRow = Math.floor(from / 8);
    const fromCol = from % 8;
    const dr = row - fromRow;
    const dc = col - fromCol;
    // Keep the ordinary prohibition on adjacent kings, including guilty kings.
    if (piece.type === 'k' && Math.max(Math.abs(dr), Math.abs(dc)) === 1) return true;
    if (piece.remorse) continue;
    if (piece.type === 'p') {
      if (dr === (piece.color === 'w' ? -1 : 1) && Math.abs(dc) === 1) return true;
    } else if (piece.type === 'n') {
      if (Math.abs(dr) * Math.abs(dc) === 2) return true;
    } else if (piece.type !== 'k') {
      const diagonal = Math.abs(dr) === Math.abs(dc) && dr !== 0;
      const straight = (dr === 0) !== (dc === 0);
      if (!((diagonal && 'bq'.includes(piece.type)) || (straight && 'rq'.includes(piece.type)))) continue;
      const stepRow = Math.sign(dr);
      const stepCol = Math.sign(dc);
      let clear = true;
      for (let r = fromRow + stepRow, c = fromCol + stepCol; r !== row || c !== col; r += stepRow, c += stepCol) {
        if (state.board[r * 8 + c]) { clear = false; break; }
      }
      if (clear) return true;
    }
  }
  return false;
}

export function inCheck(state, color = state.turn) {
  const king = state.board.findIndex((piece) => piece?.type === 'k' && piece.color === color);
  return king < 0 || isAttacked(state, king, opposite(color));
}

function pseudoMoves(state, onlyFrom) {
  const moves = [];
  const fromFilter = onlyFrom === undefined ? null : (typeof onlyFrom === 'number' ? onlyFrom : toIndex(onlyFrom));
  const add = (from, to, extra = {}) => {
    const piece = state.board[from];
    const captured = extra.enPassant ? state.board[to + (piece.color === 'w' ? 8 : -8)] : state.board[to];
    if (captured?.color === piece.color || captured?.type === 'k' || (captured && piece.remorse)) return;
    const move = { from: toSquare(from), to: toSquare(to), piece: piece.type, color: piece.color, captured: captured ? { ...captured } : null, ...extra };
    if (piece.type === 'p' && (to < 8 || to >= 56)) {
      for (const promotion of PROMOTIONS) moves.push({ ...move, promotion });
    } else moves.push(move);
  };
  for (let from = 0; from < 64; from += 1) {
    if (fromFilter !== null && fromFilter !== from) continue;
    const piece = state.board[from];
    if (!piece || piece.color !== state.turn) continue;
    const row = Math.floor(from / 8);
    const col = from % 8;
    if (piece.type === 'p') {
      const step = piece.color === 'w' ? -1 : 1;
      const start = piece.color === 'w' ? 6 : 1;
      const next = (row + step) * 8 + col;
      if (inside(row + step, col) && !state.board[next]) {
        add(from, next);
        if (row === start && !state.board[(row + step * 2) * 8 + col]) add(from, (row + step * 2) * 8 + col, { doublePawn: true });
      }
      if (!piece.remorse) {
        for (const dc of [-1, 1]) {
          if (!inside(row + step, col + dc)) continue;
          const to = (row + step) * 8 + col + dc;
          if (state.board[to] && state.board[to].color !== piece.color) add(from, to);
          else if (state.enPassant === toSquare(to) && !state.board[to]) {
            const victim = state.board[row * 8 + col + dc];
            if (victim?.type === 'p' && victim.color !== piece.color) add(from, to, { enPassant: true });
          }
        }
      }
    } else if (piece.type === 'n' || piece.type === 'k') {
      for (const [dr, dc] of piece.type === 'n' ? KNIGHT : NEIGHBORS) {
        if (inside(row + dr, col + dc)) add(from, (row + dr) * 8 + col + dc);
      }
      if (piece.type === 'k') addCastling(state, from, moves);
    } else {
      const directions = piece.type === 'b' ? DIAGONAL : piece.type === 'r' ? STRAIGHT : NEIGHBORS;
      for (const [dr, dc] of directions) {
        for (let r = row + dr, c = col + dc; inside(r, c); r += dr, c += dc) {
          const to = r * 8 + c;
          add(from, to);
          if (state.board[to]) break;
        }
      }
    }
  }
  return moves;
}

function addCastling(state, from, moves) {
  const piece = state.board[from];
  const rank = piece.color === 'w' ? '1' : '8';
  if (from !== toIndex(`e${rank}`) || inCheck(state, piece.color)) return;
  const rights = piece.color === 'w' ? ['K', 'Q'] : ['k', 'q'];
  for (const [side, right] of [['k', rights[0]], ['q', rights[1]]]) {
    if (!state.castling.includes(right)) continue;
    const rookSquare = `${side === 'k' ? 'h' : 'a'}${rank}`;
    const rook = state.board[toIndex(rookSquare)];
    if (rook?.type !== 'r' || rook.color !== piece.color) continue;
    const emptyFiles = side === 'k' ? ['f', 'g'] : ['b', 'c', 'd'];
    if (emptyFiles.some((file) => state.board[toIndex(`${file}${rank}`)])) continue;
    // Evaluate the transit square with the king moved off e1/e8; the vacated
    // square may otherwise hide a sliding attack.
    const transit = { ...state, board: cloneBoard(state.board) };
    const middle = toIndex(`${side === 'k' ? 'f' : 'd'}${rank}`);
    transit.board[from] = null;
    transit.board[middle] = { ...piece };
    if (inCheck(transit, piece.color)) continue;
    moves.push({ from: toSquare(from), to: `${side === 'k' ? 'g' : 'c'}${rank}`, piece: 'k', color: piece.color, captured: null, castle: side });
  }
}

function executeMove(state, move) {
  const board = cloneBoard(state.board);
  const from = toIndex(move.from);
  const to = toIndex(move.to);
  const piece = board[from];
  const originalType = piece.type;
  const captureSquare = move.enPassant ? to + (piece.color === 'w' ? 8 : -8) : to;
  const captured = board[captureSquare];
  board[from] = null;
  if (move.enPassant) board[captureSquare] = null;
  if (captured) piece.remorse = true;
  if (move.promotion) piece.type = move.promotion;
  board[to] = piece;
  if (move.castle) {
    const rank = piece.color === 'w' ? '1' : '8';
    const rookFrom = toIndex(`${move.castle === 'k' ? 'h' : 'a'}${rank}`);
    const rookTo = toIndex(`${move.castle === 'k' ? 'f' : 'd'}${rank}`);
    board[rookTo] = board[rookFrom];
    board[rookFrom] = null;
  }
  const absolved = [];
  if (originalType === 'b') {
    for (let index = 0; index < 64; index += 1) {
      const other = board[index];
      if (other?.color === piece.color && other.remorse && neighbors(to, index)) {
        other.remorse = false;
        absolved.push(toSquare(index));
      }
    }
  }
  let castling = state.castling;
  if (originalType === 'k') castling = castling.replace(piece.color === 'w' ? /[KQ]/g : /[kq]/g, '');
  const rookRights = { a1: 'Q', h1: 'K', a8: 'q', h8: 'k' };
  if (originalType === 'r' && rookRights[move.from]) castling = castling.replace(rookRights[move.from], '');
  if (captured?.type === 'r' && rookRights[toSquare(captureSquare)]) castling = castling.replace(rookRights[toSquare(captureSquare)], '');
  return {
    board,
    turn: opposite(state.turn),
    castling,
    enPassant: move.doublePawn ? toSquare((from + to) / 2) : null,
    halfmove: originalType === 'p' || captured ? 0 : state.halfmove + 1,
    fullmove: state.fullmove + (state.turn === 'b' ? 1 : 0),
    history: state.history,
    lastMove: { ...move, captured: captured ? { ...captured } : null, capture: Boolean(captured), absolved, becameRemorseful: Boolean(captured), notation: '' },
  };
}

export function legalMoves(state, fromSquare) {
  return pseudoMoves(state, fromSquare).filter((move) => !inCheck(executeMove(state, move), state.turn));
}

/** Repetition includes guilt, turn, castling and a genuinely usable ep square. */
export function positionKey(state) {
  const board = state.board.map((piece) => piece ? `${piece.color}${piece.type}${piece.remorse ? '!' : '.'}` : '-').join('');
  let enPassant = '-';
  if (state.enPassant && pseudoMoves(state).some((move) => move.enPassant && !inCheck(executeMove(state, move), state.turn))) enPassant = state.enPassant;
  return `${board} ${state.turn} ${state.castling || '-'} ${enPassant}`;
}

function notationFor(state, move, next, allMoves) {
  let notation;
  if (move.castle) notation = move.castle === 'k' ? 'O-O' : 'O-O-O';
  else {
    let prefix = move.piece === 'p' ? (move.captured ? move.from[0] : '') : move.piece.toUpperCase();
    if (move.piece !== 'p') {
      const others = allMoves.filter((candidate) => candidate.from !== move.from && candidate.piece === move.piece && candidate.to === move.to);
      if (others.length) {
        if (others.every((candidate) => candidate.from[0] !== move.from[0])) prefix += move.from[0];
        else if (others.every((candidate) => candidate.from[1] !== move.from[1])) prefix += move.from[1];
        else prefix += move.from;
      }
    }
    notation = `${prefix}${move.captured ? 'x' : ''}${move.to}${move.promotion ? '=' + move.promotion.toUpperCase() : ''}`;
  }
  if (inCheck(next)) notation += legalMoves(next).length ? '+' : '#';
  return notation;
}

/** Validate and apply one move. Original state and previous snapshots stay intact. */
export function applyMove(state, requested) {
  if (!requested || typeof requested !== 'object') throw new Error('A move needs from and to squares.');
  const allMoves = legalMoves(state);
  const status = statusWithMoves(state, allMoves);
  if (status.over) throw new Error(`Game over: ${status.reason}.`);
  const move = allMoves.find((candidate) => candidate.from === requested.from && candidate.to === requested.to && (!candidate.promotion || candidate.promotion === (requested.promotion || 'q')));
  if (!move) throw new Error(`Illegal move: ${requested.from ?? '?'}–${requested.to ?? '?'}.`);
  const next = executeMove(state, move);
  next.lastMove.notation = notationFor(state, move, next, allMoves);
  next.history = [...(state.history || [positionKey(state)]), positionKey(next)];
  return next;
}

export function gameStatus(state) {
  return statusWithMoves(state, legalMoves(state));
}

function statusWithMoves(state, moves) {
  const check = inCheck(state);
  const common = { turn: state.turn, check, winner: null };
  if (!moves.length) return check
    ? { ...common, over: true, type: 'checkmate', winner: opposite(state.turn), reason: 'Checkmate' }
    : { ...common, over: true, type: 'stalemate', reason: 'Stalemate — no legal moves' };
  if (state.board.filter(Boolean).every((piece) => piece.type === 'k')) return { ...common, over: true, type: 'draw', reason: 'Bare kings' };
  if (state.halfmove >= 100) return { ...common, over: true, type: 'draw', reason: 'Fifty-move rule' };
  const key = positionKey(state);
  if ((state.history || []).filter((previous) => previous === key).length >= 3) return { ...common, over: true, type: 'draw', reason: 'Threefold repetition' };
  return { ...common, over: false, type: check ? 'check' : 'playing', reason: check ? 'Check' : 'Game in progress' };
}

function evaluate(state) {
  let score = 0;
  for (let index = 0; index < 64; index += 1) {
    const piece = state.board[index];
    if (!piece) continue;
    const row = Math.floor(index / 8);
    const col = index % 8;
    const center = (3.5 - Math.abs(col - 3.5)) + (3.5 - Math.abs(row - 3.5));
    const advancement = piece.color === 'w' ? 6 - row : row - 1;
    let value = VALUE[piece.type] * (piece.remorse ? 0.56 : 1);
    if (piece.type === 'p') value += Math.max(0, advancement) * 9;
    if (piece.type === 'n' || piece.type === 'b') value += center * 6;
    if (piece.type === 'b') {
      // Bishops have value as healers even while remorseful.
      value += 45;
      for (let other = 0; other < 64; other += 1) {
        if (state.board[other]?.color === piece.color && state.board[other].remorse && other !== index) {
          const distance = Math.max(Math.abs(row - Math.floor(other / 8)), Math.abs(col - other % 8));
          value += Math.max(0, 6 - distance) * 3;
        }
      }
    }
    score += piece.color === state.turn ? value : -value;
  }
  return score;
}

function orderMoves(moves) {
  return moves.map((move, index) => ({ move, index, priority: (move.captured ? VALUE[move.captured.type] * 10 - VALUE[move.piece] : 0) + (move.promotion ? VALUE[move.promotion] : 0) + (move.castle ? 30 : 0) }))
    .sort((a, b) => b.priority - a.priority || a.index - b.index).map(({ move }) => move);
}

/** Small deterministic opponent, not Stockfish. Run in a Worker for smooth UI. */
export function chooseMove(state, depth = 2) {
  const options = depth !== null && typeof depth === 'object' ? depth : {};
  const requestedDepth = Object.keys(options).length ? options.depth ?? 2 : depth;
  const maxDepth = Math.max(1, Math.min(3, Number.isFinite(requestedDepth) ? Math.floor(requestedDepth) : 2));
  const requestedNodes = options.maxNodes ?? 18000;
  const maxNodes = Math.max(1, Math.min(50000, Number.isFinite(requestedNodes) ? Math.floor(requestedNodes) : 18000));
  const rootMoves = legalMoves(state);
  if (statusWithMoves(state, rootMoves).over) return null;
  const ordered = orderMoves(rootMoves);
  const exhausted = Symbol('Search budget exhausted');
  let nodes = 0;
  const search = (position, remaining, alpha, beta, ply) => {
    if (nodes >= maxNodes) throw exhausted;
    nodes += 1;
    const moves = legalMoves(position);
    if (!moves.length) return inCheck(position) ? -100000 + ply : 0;
    if (position.halfmove >= 100 || position.board.filter(Boolean).every((piece) => piece.type === 'k')) return 0;
    if (remaining <= 0) return evaluate(position);
    let best = -Infinity;
    for (const move of orderMoves(moves)) {
      const next = executeMove(position, move);
      const score = -search(next, remaining - 1, -beta, -alpha, ply + 1);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  };
  // Complete shallower searches first. If the budget runs out halfway through
  // an iteration, retain the previous complete result instead of comparing
  // unevenly searched moves. A tiny budget still returns a legal fallback.
  let chosen = ordered[0];
  for (let iteration = 1; iteration <= maxDepth; iteration += 1) {
    let best = -Infinity;
    let candidate = chosen;
    try {
      for (const move of ordered) {
        const next = executeMove(state, move);
        let score = -search(next, iteration - 1, -Infinity, Infinity, 1);
        const key = positionKey(next);
        if ((state.history || []).includes(key)) score -= 18;
        if (score > best) { best = score; candidate = move; }
      }
    } catch (error) {
      if (error !== exhausted) throw error;
      break;
    }
    chosen = candidate;
  }
  return chosen;
}
