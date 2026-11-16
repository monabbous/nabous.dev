import { chooseMove } from './engine.js';

self.addEventListener('message', ({ data }) => {
  try {
    const move = chooseMove(data.state, { depth: data.level, maxNodes: 16000 });
    self.postMessage({ id: data.id, move });
  } catch {
    self.postMessage({ id: data.id, error: 'The computer could not finish its move.' });
  }
});
