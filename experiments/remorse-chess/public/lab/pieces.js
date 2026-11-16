// Original vector pieces. Fixed geometry keeps them consistent on every device.
const bases = '<path d="M13 49h38v6H13zM17 44h30v5H17z"/>';
const shapes = {
  p: '<circle cx="32" cy="18" r="8"/><path d="M27 26h10l-1 9 8 9H20l8-9z"/>',
  r: '<path d="M16 10h7v7h5v-7h8v7h5v-7h7v15l-6 5v14H22V30l-6-5z"/><path d="M22 27h20" fill="none"/>',
  n: '<path d="m21 44 2-10 9-9-10 3-7-6 10-9 2-8 7 6c13 0 18 13 15 33z"/><path d="m20 22 9-4M36 17h1M32 27c9 0 10 9 9 17" fill="none"/>',
  b: '<path d="M32 7c-1 5-13 11-13 19 0 6 6 10 13 10s13-4 13-10c0-8-12-14-13-19Z"/><path d="m35 18-8 11" fill="none"/><path d="m27 35-7 9h24l-7-9z"/><circle cx="32" cy="6" r="3"/>',
  q: '<path d="m15 19 8 22h18l8-22-11 11-6-18-6 18zM23 41h18v3H23z"/><circle cx="14" cy="16" r="3"/><circle cx="32" cy="9" r="3"/><circle cx="50" cy="16" r="3"/>',
  k: '<path d="M29 5h6v6h6v6h-6v8h-6v-8h-6v-6h6zM32 27c-12-10-21 0-16 9l6 8h20l6-8c5-9-4-19-16-9Z"/><path d="M32 27v11M23 38h18" fill="none"/>',
};
export const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export function pieceSvg(piece, small = false) {
  const white = piece.color === 'w';
  return `<svg class="rc-piece${small ? ' rc-piece-small' : ''}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g fill="${white ? '#fff4de' : '#30362f'}" stroke="${white ? '#514c3e' : '#f0e1c3'}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${shapes[piece.type] || ''}${bases}</g></svg>`;
}
