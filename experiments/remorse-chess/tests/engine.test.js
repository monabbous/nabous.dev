import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState, createState, legalMoves, applyMove, gameStatus,
  inCheck, isAttacked, positionKey, chooseMove, toIndex, toSquare,
} from '../public/lab/engine.js';

const piece = (type, color = 'w', remorse = false) => ({ type, color, remorse });
const at = (state, square) => state.board[toIndex(square)];
const setup = (position, options = {}) => createState({ position: { a1: piece('k'), h8: piece('k', 'b'), ...position }, ...options });
const has = (state, from, to, promotion) => legalMoves(state, from).some((move) => move.to === to && (!promotion || move.promotion === promotion));
const play = (state, from, to, promotion) => applyMove(state, { from, to, ...(promotion ? { promotion } : {}) });

test('square conversion covers all 64 cells and rejects invalid coordinates', () => {
  assert.equal(toIndex('a8'), 0);
  assert.equal(toIndex('h1'), 63);
  for (let index = 0; index < 64; index += 1) assert.equal(toIndex(toSquare(index)), index);
  assert.equal(toIndex('a0'), -1);
  assert.equal(toIndex('i4'), -1);
  assert.equal(toSquare(64), null);
});

test('opening has 20 legal moves and 400 two-ply positions', () => {
  const initial = initialState();
  assert.equal(initial.board.filter(Boolean).length, 32);
  assert.equal(legalMoves(initial).length, 20);
  let count = 0;
  for (const move of legalMoves(initial)) count += legalMoves(applyMove(initial, move)).length;
  assert.equal(count, 400);
});

test('a move preserves prior snapshots and records a two-square pawn advance', () => {
  const initial = initialState();
  const encoded = JSON.stringify(initial);
  const next = play(initial, 'e2', 'e4');
  assert.equal(JSON.stringify(initial), encoded);
  assert.equal(at(next, 'e2'), null);
  assert.equal(at(next, 'e4').type, 'p');
  assert.equal(next.enPassant, 'e3');
  assert.equal(next.turn, 'b');
  assert.equal(next.lastMove.notation, 'e4');
  assert.equal(next.history.length, 2);
  assert.equal(next.fullmove, 1);
});

test('illegal moves and moving the opponent are rejected', () => {
  const state = initialState();
  assert.throws(() => play(state, 'e2', 'e5'), /Illegal move/);
  assert.throws(() => play(state, 'a7', 'a6'), /Illegal move/);
  assert.throws(() => play(state, 'b1', 'b3'), /Illegal move/);
});

test('capture gives remorse and removes the victim without mutating it', () => {
  const state = setup({ d4: piece('r'), d6: piece('n', 'b') });
  const next = play(state, 'd4', 'd6');
  assert.equal(at(next, 'd6').remorse, true);
  assert.equal(next.lastMove.captured.type, 'n');
  assert.equal(next.lastMove.becameRemorseful, true);
  assert.equal(next.lastMove.notation, 'Rxd6');
  assert.equal(at(state, 'd6').type, 'n');
  assert.equal(at(state, 'd4').remorse, false);
});

test('a remorseful sliding piece can move and block but cannot capture or jump', () => {
  const state = setup({ d4: piece('r', 'w', true), d6: piece('n', 'b') });
  assert.equal(has(state, 'd4', 'd5'), true);
  assert.equal(has(state, 'd4', 'd6'), false);
  assert.equal(has(state, 'd4', 'd7'), false);
  assert.equal(has(state, 'd4', 'a4'), true);
});

test('remorse suppresses attacks, including pawn and knight attacks', () => {
  const state = setup({ a1: null, d4: piece('k'), h8: piece('k', 'b'), d8: piece('r', 'b', true), e5: piece('p', 'b', true), f5: piece('n', 'b', true) });
  assert.equal(inCheck(state, 'w'), false);
  state.board[toIndex('f5')].remorse = false;
  assert.equal(inCheck(state, 'w'), true);
});

test('a fresh capture no longer gives check from the capturing piece', () => {
  const state = setup({ h8: null, d8: piece('k', 'b'), d4: piece('r'), d6: piece('p', 'b') });
  const next = play(state, 'd4', 'd6');
  assert.equal(inCheck(next, 'b'), false);
  assert.equal(next.lastMove.notation.includes('+'), false);
});

test('bishop move absolves all adjacent allies, including diagonal neighbors', () => {
  const state = setup({ c2: piece('b'), d5: piece('r', 'w', true), e5: piece('n', 'w', true), e4: piece('p', 'w', true), e3: piece('q', 'w', true), f4: piece('r', 'w', true) });
  const next = play(state, 'c2', 'd3');
  // d3 neighbors e4 and e3, but not e5/d5/f4.
  assert.equal(at(next, 'e4').remorse, false);
  assert.equal(at(next, 'e3').remorse, false);
  assert.equal(at(next, 'd5').remorse, true);
  assert.equal(at(next, 'e5').remorse, true);
  assert.equal(at(next, 'f4').remorse, true);
  assert.deepEqual(next.lastMove.absolved.sort(), ['e3', 'e4']);
});

test('bishop absolution can create a check from the cured piece', () => {
  const state = setup({ h8: null, d8: piece('k', 'b'), d4: piece('r', 'w', true), c2: piece('b') });
  assert.equal(inCheck(state, 'b'), false);
  const next = play(state, 'c2', 'd3');
  assert.equal(at(next, 'd4').remorse, false);
  assert.equal(inCheck(next, 'b'), true);
  assert.match(next.lastMove.notation, /\+$/);
});

test('capturing beside a stationary bishop does not absolve the capturer', () => {
  const state = setup({ c4: piece('b'), d2: piece('r'), d4: piece('p', 'b') });
  const next = play(state, 'd2', 'd4');
  assert.equal(at(next, 'd4').remorse, true);
  assert.deepEqual(next.lastMove.absolved, []);
});

test('moving a remorseful piece beside a stationary bishop does not absolve it', () => {
  const state = setup({ c4: piece('b'), d2: piece('r', 'w', true) });
  const next = play(state, 'd2', 'd4');
  assert.equal(at(next, 'd4').remorse, true);
});

test('remorseful bishops still heal allies but do not heal themselves', () => {
  const state = setup({ c2: piece('b', 'w', true), d4: piece('r', 'w', true) });
  const next = play(state, 'c2', 'd3');
  assert.equal(at(next, 'd3').remorse, true);
  assert.equal(at(next, 'd4').remorse, false);
});

test('a bishop can absolve another bishop without curing enemy pieces', () => {
  const state = setup({ c2: piece('b'), e4: piece('b', 'w', true), c4: piece('r', 'b', true) });
  const next = play(state, 'c2', 'd3');
  assert.equal(at(next, 'e4').remorse, false);
  assert.equal(at(next, 'c4').remorse, true);
});

test('a capturing bishop becomes remorseful while healing its adjacent allies', () => {
  const state = setup({ c2: piece('b'), e4: piece('n', 'b'), f4: piece('r', 'w', true) });
  const next = play(state, 'c2', 'e4');
  assert.equal(at(next, 'e4').remorse, true);
  assert.equal(at(next, 'f4').remorse, false);
});

test('king safety rejects a pinned piece exposing its king', () => {
  const state = setup({ a1: null, e1: piece('k'), e2: piece('r'), e8: piece('r', 'b') });
  assert.equal(has(state, 'e2', 'd2'), false);
  assert.equal(has(state, 'e2', 'e3'), true);
});

test('a king may enter a remorseful rook attack line', () => {
  const state = setup({ a1: null, e1: piece('k'), f8: piece('r', 'b', true) });
  assert.equal(has(state, 'e1', 'f1'), true);
  state.board[toIndex('f8')].remorse = false;
  assert.equal(has(state, 'e1', 'f1'), false);
});

test('kings cannot be captured or stand adjacent, including remorseful kings', () => {
  const state = setup({ a1: null, h8: null, e1: piece('k', 'w', true), e3: piece('k', 'b', true), a3: piece('r') });
  assert.equal(has(state, 'e1', 'e2'), false);
  assert.equal(has(state, 'a3', 'e3'), false);
});

test('king capture creates remorse and remains subject to king safety', () => {
  const state = setup({ a1: null, e1: piece('k'), e2: piece('p', 'b') });
  const next = play(state, 'e1', 'e2');
  assert.equal(at(next, 'e2').remorse, true);
  assert.equal(next.lastMove.captured.type, 'p');
  const exposed = setup({ a1: null, e1: piece('k'), e2: piece('p', 'b'), e8: piece('r', 'b') });
  assert.equal(has(exposed, 'e1', 'e2'), false);
});

test('castling moves both pieces and clears both king rights', () => {
  const state = setup({ a1: piece('r'), e1: piece('k'), h1: piece('r') }, { castling: 'KQ' });
  assert.equal(has(state, 'e1', 'g1'), true);
  assert.equal(has(state, 'e1', 'c1'), true);
  const next = play(state, 'e1', 'g1');
  assert.equal(at(next, 'g1').type, 'k');
  assert.equal(at(next, 'f1').type, 'r');
  assert.equal(at(next, 'h1'), null);
  assert.equal(next.castling, '');
  assert.equal(next.lastMove.notation, 'O-O');
});

test('castling is forbidden through check or while in check', () => {
  const through = setup({ a1: null, e1: piece('k'), h1: piece('r'), f8: piece('r', 'b') }, { castling: 'K' });
  assert.equal(has(through, 'e1', 'g1'), false);
  const checked = setup({ a1: null, e1: piece('k'), h1: piece('r'), e8: piece('r', 'b') }, { castling: 'K' });
  assert.equal(has(checked, 'e1', 'g1'), false);
  through.board[toIndex('f8')].remorse = true;
  assert.equal(has(through, 'e1', 'g1'), true);
});

test('moving a rook or capturing a home rook removes the corresponding castling right', () => {
  const state = setup({ a1: piece('r'), e1: piece('k'), h1: piece('r'), a8: piece('r', 'b') }, { castling: 'KQq' });
  assert.equal(play(state, 'a1', 'a2').castling, 'Kq');
  const captured = play(state, 'a1', 'a8');
  assert.equal(captured.castling, 'K');
});

test('en passant removes the correct pawn and gives remorse', () => {
  const state = setup({ e5: piece('p'), d7: piece('p', 'b') }, { turn: 'b' });
  const doubleStep = play(state, 'd7', 'd5');
  assert.equal(doubleStep.enPassant, 'd6');
  const next = play(doubleStep, 'e5', 'd6');
  assert.equal(at(next, 'd5'), null);
  assert.equal(at(next, 'd6').color, 'w');
  assert.equal(at(next, 'd6').remorse, true);
  assert.equal(next.lastMove.enPassant, true);
  assert.equal(next.halfmove, 0);
});

test('remorse prevents en passant and king-exposing en passant is illegal', () => {
  const guilty = setup({ e5: piece('p', 'w', true), d5: piece('p', 'b') }, { enPassant: 'd6' });
  assert.equal(has(guilty, 'e5', 'd6'), false);
  const pinned = setup({ a1: null, a5: piece('k'), e5: piece('p'), d5: piece('p', 'b'), h5: piece('r', 'b') }, { enPassant: 'd6' });
  assert.equal(has(pinned, 'e5', 'd6'), false);
});

test('en passant expires after another move', () => {
  const state = setup({ e5: piece('p'), d5: piece('p', 'b') }, { enPassant: 'd6' });
  const next = play(state, 'a1', 'b1');
  assert.equal(next.enPassant, null);
});

test('promotion offers all four pieces and keeps existing remorse', () => {
  const state = setup({ e7: piece('p', 'w', true) });
  assert.deepEqual(legalMoves(state, 'e7').filter((move) => move.to === 'e8').map((move) => move.promotion).sort(), ['b', 'n', 'q', 'r']);
  const next = play(state, 'e7', 'e8', 'n');
  assert.deepEqual(at(next, 'e8'), piece('n', 'w', true));
});

test('promotion capture gives remorse and promotion to bishop does not absolve', () => {
  const state = setup({ c7: piece('p'), d8: piece('r', 'b'), e8: piece('q', 'w', true) });
  const next = play(state, 'c7', 'd8', 'b');
  assert.deepEqual(at(next, 'd8'), piece('b', 'w', true));
  assert.equal(at(next, 'e8').remorse, true);
  assert.deepEqual(next.lastMove.absolved, []);
});

test('ordinary checkmate and stalemate are detected without capturing kings', () => {
  const mate = setup({ a1: null, h8: piece('k', 'b'), f6: piece('k'), g7: piece('q') }, { turn: 'b' });
  assert.equal(gameStatus(mate).type, 'checkmate');
  assert.equal(gameStatus(mate).winner, 'w');
  const stale = setup({ a1: null, h8: piece('k', 'b'), f7: piece('k'), g6: piece('q') }, { turn: 'b' });
  assert.equal(gameStatus(stale).type, 'stalemate');
});

test('remorse can remove what would otherwise be a checkmate', () => {
  const state = setup({ a1: null, h8: piece('k', 'b'), f6: piece('k'), g7: piece('q', 'w', true) }, { turn: 'b' });
  assert.equal(inCheck(state), false);
  assert.equal(gameStatus(state).over, false);
  assert.equal(has(state, 'h8', 'h7'), true);
});

test('repetition key distinguishes remorse and ignores unusable en passant', () => {
  const plain = setup({ d4: piece('r') });
  const guilty = setup({ d4: piece('r', 'w', true) });
  assert.notEqual(positionKey(plain), positionKey(guilty));
  const initial = initialState();
  const moved = play(initial, 'e2', 'e4');
  assert.equal(positionKey(moved), positionKey({ ...moved, enPassant: null }));
  const ep = setup({ e5: piece('p'), d5: piece('p', 'b') }, { enPassant: 'd6' });
  assert.notEqual(positionKey(ep), positionKey({ ...ep, enPassant: null }));
});

test('threefold repetition and fifty-move draws are recognized', () => {
  let state = initialState();
  for (let cycle = 0; cycle < 2; cycle += 1) {
    state = play(state, 'g1', 'f3');
    state = play(state, 'g8', 'f6');
    state = play(state, 'f3', 'g1');
    state = play(state, 'f6', 'g8');
  }
  assert.equal(gameStatus(state).reason, 'Threefold repetition');
  assert.throws(() => play(state, 'e2', 'e4'), /Game over: Threefold repetition/);
  const fifty = setup({ b1: piece('r') }, { halfmove: 100 });
  assert.equal(gameStatus(fifty).reason, 'Fifty-move rule');
  assert.throws(() => play(fifty, 'b1', 'b2'), /Game over: Fifty-move rule/);
});

test('only bare kings use the material draw shortcut', () => {
  assert.equal(gameStatus(setup({})).reason, 'Bare kings');
  assert.equal(gameStatus(setup({ c3: piece('b') })).over, false);
});

test('small computer opponent chooses legal moves, preserves state, and stops at game over', () => {
  const state = initialState();
  const encoded = JSON.stringify(state);
  const move = chooseMove(state, 2);
  assert.ok(move);
  assert.ok(legalMoves(state).some((candidate) => candidate.from === move.from && candidate.to === move.to));
  assert.equal(JSON.stringify(state), encoded);
  assert.equal(chooseMove(setup({})), null);
  const limited = chooseMove(state, { depth: 3, maxNodes: 1 });
  assert.ok(legalMoves(state).some((candidate) => candidate.from === limited.from && candidate.to === limited.to));
});

test('computer recognizes an available mate in one', () => {
  const state = setup({ a1: null, h8: piece('k', 'b'), f6: piece('k'), g6: piece('q') });
  const move = chooseMove(state, 2);
  assert.equal(gameStatus(applyMove(state, move)).type, 'checkmate');
});

test('position setup validates board shape and king counts', () => {
  assert.throws(() => createState({ board: [] }), /64/);
  assert.throws(() => createState({ position: { a1: piece('k') } }), /king/);
  assert.throws(() => setup({ i2: piece('p') }), /square/);
  assert.equal(isAttacked(initialState(), 'e4', 'b'), false);
});

test('the guided demo captures, waits, and absolves the rook with the bishop', () => {
  let state = createState({
    position: {
      g1: piece('k'), b3: piece('b'), d4: piece('r'), h2: piece('p'),
      g8: piece('k', 'b'), d5: piece('p', 'b'), e5: piece('p', 'b'), h7: piece('p', 'b'),
    },
  });
  state = play(state, 'd4', 'd5');
  assert.equal(at(state, 'd5').remorse, true);
  state = play(state, 'h7', 'h6');
  assert.equal(has(state, 'd5', 'e5'), false);
  state = play(state, 'b3', 'c4');
  assert.equal(at(state, 'd5').remorse, false);
  assert.equal(state.lastMove.piece, 'b');
  assert.deepEqual(state.lastMove.absolved, ['d5']);
});
