export function getPlayerPits(player: number): number[] {
  return player === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
}

export function hasSeeds(board: number[], player: number): boolean {
  const pits = getPlayerPits(player);
  return pits.some(i => board[i] > 0);
}

function sowFrom(board: number[], pitIndex: number, playerPits: number[]): { board: number[]; lastPit: number; crossedOpponent: boolean } {
  let seeds = board[pitIndex];
  board[pitIndex] = 0;
  let currentPit = pitIndex;
  let crossedOpponent = false;

  while (seeds > 0) {
    currentPit = (currentPit + 1) % 12;
    if (currentPit === pitIndex) continue;
    if (!playerPits.includes(currentPit)) crossedOpponent = true;
    board[currentPit]++;
    seeds--;
  }

  return { board, lastPit: currentPit, crossedOpponent };
}

function sowWithRelay(board: number[], pitIndex: number, playerPits: number[]): { board: number[]; lastPit: number } {
  const newBoard = [...board];
  let { lastPit, crossedOpponent } = sowFrom(newBoard, pitIndex, playerPits);
  let iterations = 0;

  while (iterations < 100) {
    iterations++;
    if (!playerPits.includes(lastPit)) break;
    if (newBoard[lastPit] === 1) break;
    if (!crossedOpponent) break;
    ({ lastPit, crossedOpponent } = sowFrom(newBoard, lastPit, playerPits));
  }

  return { board: newBoard, lastPit };
}

function simulateMove(board: number[], pitIndex: number, currentPlayer: number): { newBoard: number[]; captured: number } {
  const playerPits = getPlayerPits(currentPlayer);
  const { board: newBoard, lastPit } = sowWithRelay(board, pitIndex, playerPits);

  let captured = 0;
  const opponentPits = getPlayerPits(currentPlayer === 0 ? 1 : 0);

  let capturePit = lastPit;
  while (opponentPits.includes(capturePit) && (newBoard[capturePit] === 2 || newBoard[capturePit] === 3)) {
    captured += newBoard[capturePit];
    newBoard[capturePit] = 0;
    capturePit = (capturePit - 1 + 12) % 12;
  }

  const opponentHasSeeds = opponentPits.some(i => newBoard[i] > 0);
  if (!opponentHasSeeds && captured > 0) {
    return { newBoard: board.slice(), captured: 0 };
  }

  return { newBoard, captured };
}

export function wouldFeedOpponent(board: number[], pitIndex: number, currentPlayer: number): boolean {
  const playerPits = getPlayerPits(currentPlayer);
  const { board: newBoard } = sowWithRelay(board, pitIndex, playerPits);

  const opponent = currentPlayer === 0 ? 1 : 0;
  return hasSeeds(newBoard, opponent);
}

export function isValidMove(board: number[], pitIndex: number, currentPlayer: number): boolean {
  const playerPits = getPlayerPits(currentPlayer);
  if (!playerPits.includes(pitIndex)) return false;
  if (board[pitIndex] <= 0) return false;

  const opponent = currentPlayer === 0 ? 1 : 0;
  if (!hasSeeds(board, opponent)) {
    if (!wouldFeedOpponent(board, pitIndex, currentPlayer)) {
      const hasOtherFeedingMove = playerPits.some(p => {
        if (board[p] <= 0 || p === pitIndex) return false;
        return wouldFeedOpponent(board, p, currentPlayer);
      });
      if (hasOtherFeedingMove) return false;
    }
  }

  return true;
}

export function makeMove(
  board: number[],
  pitIndex: number,
  currentPlayer: number
): { newBoard: number[]; captured: number; lastPit: number } {
  const playerPits = getPlayerPits(currentPlayer);
  const { board: sowedBoard, lastPit } = sowWithRelay(board, pitIndex, playerPits);
  const newBoard = [...sowedBoard];

  let captured = 0;
  const opponentPits = getPlayerPits(currentPlayer === 0 ? 1 : 0);

  let capturePit = lastPit;
  while (opponentPits.includes(capturePit) && (newBoard[capturePit] === 2 || newBoard[capturePit] === 3)) {
    captured += newBoard[capturePit];
    newBoard[capturePit] = 0;
    capturePit = (capturePit - 1 + 12) % 12;
  }

  const opponentHasSeeds = opponentPits.some(i => newBoard[i] > 0);
  if (!opponentHasSeeds && captured > 0) {
    const { board: sowOnly, lastPit: sowLastPit } = sowWithRelay(board, pitIndex, playerPits);
    return { newBoard: sowOnly, captured: 0, lastPit: sowLastPit };
  }

  return { newBoard, captured, lastPit };
}

export function checkGameOver(board: number[], scores: [number, number]): {
  isOver: boolean;
  winner: number | null;
  finalScores?: [number, number];
  reached25?: boolean;
} {
  if (scores[0] >= 25) return { isOver: false, winner: 0, finalScores: scores, reached25: true };
  if (scores[1] >= 25) return { isOver: false, winner: 1, finalScores: scores, reached25: true };

  if (scores[0] + scores[1] === 48) {
    if (scores[0] > scores[1]) return { isOver: true, winner: 0, finalScores: scores };
    if (scores[1] > scores[0]) return { isOver: true, winner: 1, finalScores: scores };
    return { isOver: true, winner: null, finalScores: scores };
  }

  const p0Moves = getPlayerPits(0).some(p => board[p] > 0);
  const p1Moves = getPlayerPits(1).some(p => board[p] > 0);

  if (!p0Moves && !p1Moves) {
    if (scores[0] > scores[1]) return { isOver: true, winner: 0, finalScores: scores };
    if (scores[1] > scores[0]) return { isOver: true, winner: 1, finalScores: scores };
    return { isOver: true, winner: null, finalScores: scores };
  }

  return { isOver: false, winner: null };
}

export function getValidMoves(board: number[], currentPlayer: number): number[] {
  return getPlayerPits(currentPlayer).filter(p => isValidMove(board, p, currentPlayer));
}
