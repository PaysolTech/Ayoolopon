export interface SowStep {
  pitIndex: number;
  boardSnapshot: number[];
}

export function computeSowSteps(
  board: number[],
  pitIndex: number,
  currentPlayer?: number
): SowStep[] {
  const steps: SowStep[] = [];
  const currentBoard = [...board];
  const playerPits = currentPlayer !== undefined
    ? (currentPlayer === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11])
    : (pitIndex <= 5 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11]);

  let activePit = pitIndex;
  let iterationCount = 0;

  while (iterationCount < 100) {
    iterationCount++;
    let seeds = currentBoard[activePit];
    if (seeds <= 0) break;
    currentBoard[activePit] = 0;

    steps.push({ pitIndex: activePit, boardSnapshot: [...currentBoard] });

    const startPit = activePit;
    let currentPit = activePit;
    let crossedOpponent = false;

    while (seeds > 0) {
      currentPit = (currentPit + 1) % 12;
      if (currentPit === startPit) continue;
      if (!playerPits.includes(currentPit)) crossedOpponent = true;
      currentBoard[currentPit]++;
      seeds--;
      steps.push({ pitIndex: currentPit, boardSnapshot: [...currentBoard] });
    }

    if (!playerPits.includes(currentPit)) break;
    if (currentBoard[currentPit] === 1) break;
    if (!crossedOpponent) break;
    activePit = currentPit;
  }

  return steps;
}

export function computeCaptureSteps(
  boardAfterSow: number[],
  lastPit: number,
  playerIndex: number
): SowStep[] {
  const steps: SowStep[] = [];
  const currentBoard = [...boardAfterSow];
  const opponentPits = playerIndex === 0 ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];

  let capturePit = lastPit;
  while (opponentPits.includes(capturePit) && (currentBoard[capturePit] === 2 || currentBoard[capturePit] === 3)) {
    currentBoard[capturePit] = 0;
    steps.push({ pitIndex: capturePit, boardSnapshot: [...currentBoard] });
    capturePit = (capturePit - 1 + 12) % 12;
  }

  return steps;
}
