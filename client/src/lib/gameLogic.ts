export function isValidMove(board: number[], pitIndex: number, currentPlayer: number): boolean {
  if (currentPlayer === 0) {
    if (pitIndex < 0 || pitIndex > 5) return false;
  } else {
    if (pitIndex < 6 || pitIndex > 11) return false;
  }
  return board[pitIndex] > 0;
}

export function getPlayerPits(player: number): number[] {
  return player === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
}

export function hasSeeds(board: number[], player: number): boolean {
  const pits = getPlayerPits(player);
  return pits.some(i => board[i] > 0);
}

export function makeMove(
  board: number[],
  pitIndex: number,
  currentPlayer: number
): { newBoard: number[]; captured: number; lastPit: number } {
  const newBoard = [...board];
  let seeds = newBoard[pitIndex];
  newBoard[pitIndex] = 0;
  let currentPit = pitIndex;
  
  while (seeds > 0) {
    currentPit = (currentPit + 1) % 12;
    if (currentPit === pitIndex) continue;
    newBoard[currentPit]++;
    seeds--;
  }

  let captured = 0;
  const opponentPits = currentPlayer === 0 ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];
  
  let capturePit = currentPit;
  while (opponentPits.includes(capturePit) && (newBoard[capturePit] === 2 || newBoard[capturePit] === 3)) {
    captured += newBoard[capturePit];
    newBoard[capturePit] = 0;
    capturePit = (capturePit - 1 + 12) % 12;
  }

  const opponentHasSeeds = opponentPits.some(i => newBoard[i] > 0);
  if (!opponentHasSeeds && captured > 0) {
    let restorePit = currentPit;
    while (opponentPits.includes(restorePit) && captured > 0) {
      const count = (newBoard[currentPit] === 2 || newBoard[currentPit] === 3) ? 
        (restorePit === currentPit ? (newBoard[currentPit] === 2 ? 2 : 3) : 0) : 0;
      restorePit = (restorePit - 1 + 12) % 12;
    }
    captured = 0;
    for (let i = 0; i < 12; i++) newBoard[i] = board[i];
    newBoard[pitIndex] = 0;
    let s = board[pitIndex];
    let p = pitIndex;
    while (s > 0) {
      p = (p + 1) % 12;
      if (p === pitIndex) continue;
      newBoard[p]++;
      s--;
    }
  }

  return { newBoard, captured, lastPit: currentPit };
}

export function checkGameOver(board: number[], scores: [number, number]): {
  isOver: boolean;
  winner: number | null;
} {
  if (scores[0] >= 25) return { isOver: true, winner: 0 };
  if (scores[1] >= 25) return { isOver: true, winner: 1 };
  
  if (scores[0] + scores[1] === 48) {
    if (scores[0] > scores[1]) return { isOver: true, winner: 0 };
    if (scores[1] > scores[0]) return { isOver: true, winner: 1 };
    return { isOver: true, winner: null };
  }

  const p0HasSeeds = hasSeeds(board, 0);
  const p1HasSeeds = hasSeeds(board, 1);
  
  if (!p0HasSeeds || !p1HasSeeds) {
    const remaining = board.reduce((a, b) => a + b, 0);
    const finalScores: [number, number] = [...scores] as [number, number];
    if (!p0HasSeeds) finalScores[1] += remaining;
    else finalScores[0] += remaining;
    
    if (finalScores[0] > finalScores[1]) return { isOver: true, winner: 0 };
    if (finalScores[1] > finalScores[0]) return { isOver: true, winner: 1 };
    return { isOver: true, winner: null };
  }

  return { isOver: false, winner: null };
}
