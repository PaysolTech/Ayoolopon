import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Marbles } from "./Marble";
import { computeSowSteps } from "@/lib/gameAnimations";
import boardTexture from "@assets/Screenshot_2026-02-24_123447_1771970968877.png";

interface GameBoardProps {
  board: number[];
  scores: [number, number];
  currentPlayer: number;
  playerIndex: number;
  canPlay: boolean;
  onPitClick: (index: number) => void;
  player1Name: string;
  player2Name: string;
  status: string;
  boardClosed?: boolean;
  previousBoard?: number[];
  movedPitIndex?: number;
  movedByPlayer?: number;
  onSaveGame?: () => void;
  onResumeSaved?: () => void;
  onClose?: () => void;
  onNewGame?: () => void;
  onReset?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onOpenBoard?: () => void;
}

function pitIndexToLabel(pitIndex: number, playerIndex: number): string {
  if (playerIndex === 0) {
    if (pitIndex >= 0 && pitIndex <= 5) return `A${pitIndex + 1}`;
    return `B${pitIndex - 5}`;
  } else {
    if (pitIndex >= 6 && pitIndex <= 11) return `A${pitIndex - 5}`;
    return `B${pitIndex + 1}`;
  }
}

export function GameBoard({
  board,
  scores,
  currentPlayer,
  playerIndex,
  canPlay,
  onPitClick,
  player1Name,
  player2Name,
  status,
  boardClosed = false,
  previousBoard,
  movedPitIndex,
  movedByPlayer,
  onSaveGame,
  onResumeSaved,
  onClose,
  onNewGame,
  onReset,
  onPause,
  onEnd,
  onOpenBoard,
}: GameBoardProps) {
  const [selectedPit, setSelectedPit] = useState<number | null>(null);
  const [animatingBoard, setAnimatingBoard] = useState<number[] | null>(null);
  const [highlightedPit, setHighlightedPit] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCount, setShowCount] = useState(false);
  const prevBoardRef = useRef<number[]>(board);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const wasClosedOnMount = useRef(boardClosed);
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setAnimatingBoard(null);
    setHighlightedPit(null);
    setIsAnimating(false);
  }, []);

  const runSowAnimation = useCallback((prevBoard: number[], pitIndex: number, finalBoard: number[], movedBy?: number) => {
    cancelAnimation();
    const steps = computeSowSteps(prevBoard, pitIndex, movedBy);
    if (steps.length <= 1) return;

    setIsAnimating(true);
    let stepIndex = 0;
    setAnimatingBoard(steps[0].boardSnapshot);
    setHighlightedPit(pitIndex);

    const advance = () => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setAnimatingBoard(steps[stepIndex].boardSnapshot);
        setHighlightedPit(steps[stepIndex].pitIndex);
        animationRef.current = setTimeout(advance, 250);
      } else {
        animationRef.current = setTimeout(() => {
          setAnimatingBoard(null);
          setHighlightedPit(null);
          setIsAnimating(false);
        }, 400);
      }
    };
    animationRef.current = setTimeout(advance, 350);
  }, [cancelAnimation]);

  useEffect(() => {
    if (JSON.stringify(prevBoardRef.current) !== JSON.stringify(board)) {
      if (previousBoard && movedPitIndex !== undefined && movedByPlayer !== undefined) {
        runSowAnimation(previousBoard, movedPitIndex, board, movedByPlayer);
      }
      setSelectedPit(null);
      prevBoardRef.current = board;
    }
  }, [board, previousBoard, movedPitIndex, movedByPlayer, runSowAnimation]);

  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, []);

  const displayBoard = animatingBoard || board;
  const topRow = [11, 10, 9, 8, 7, 6];
  const bottomRow = [0, 1, 2, 3, 4, 5];
  const myRow = playerIndex === 0 ? bottomRow : topRow;
  const opponentRow = playerIndex === 0 ? topRow : bottomRow;
  const isMyTurn = currentPlayer === playerIndex && canPlay;
  const isActive = status === "active";
  const myColor = playerIndex === 0 ? "blue" : "red";
  const opponentColor = playerIndex === 0 ? "red" : "blue";

  const handleBowlClick = (pitIndex: number) => {
    if (!isActive || isAnimating) return;
    if (!myRow.includes(pitIndex)) return;
    if (!isMyTurn) return;
    if (board[pitIndex] === 0) return;
    setSelectedPit(selectedPit === pitIndex ? null : pitIndex);
  };

  const handlePlay = () => {
    if (selectedPit === null || !isMyTurn || !myRow.includes(selectedPit) || board[selectedPit] === 0 || isAnimating) return;
    onPitClick(selectedPit);
    setSelectedPit(null);
  };

  const handleCount = () => {
    setShowCount(prev => !prev);
  };

  const myPitTotal = myRow.reduce((sum, i) => sum + displayBoard[i], 0);

  const myScore = scores[playerIndex];
  const opponentScore = scores[playerIndex === 0 ? 1 : 0];

  const myStoreLabel = myScore > opponentScore ? "OTA" : myScore < opponentScore ? "OPE" : "";
  const opponentStoreLabel = opponentScore > myScore ? "OTA" : opponentScore < myScore ? "OPE" : "";

  const renderPit = (pitIndex: number, isTop: boolean) => {
    const isMine = myRow.includes(pitIndex);
    const isSelected = selectedPit === pitIndex;
    const isHighlighted = highlightedPit === pitIndex;
    const label = pitIndexToLabel(pitIndex, playerIndex);
    const count = displayBoard[pitIndex];
    const canClick = isMine && isMyTurn && board[pitIndex] > 0 && !isAnimating;

    return (
      <motion.div
        key={pitIndex}
        data-testid={`pit-${pitIndex}`}
        className={`relative flex flex-col items-center group ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => handleBowlClick(pitIndex)}
        whileHover={canClick ? { scale: 1.05 } : {}}
        animate={isSelected ? { scale: 1.1 } : isHighlighted ? { scale: 1.08 } : { scale: 1 }}
      >
        {isTop && (
          <span
            className="font-mono text-xs mb-2 font-semibold select-none"
            style={{ color: isMine ? "rgba(200,160,100,0.75)" : "rgba(140,110,80,0.45)" }}
          >
            {label}
          </span>
        )}
        <div
          className="w-[7vw] h-[7vw] rounded-full flex items-center justify-center relative"
          style={{
            background: `radial-gradient(ellipse at 48% 40%, ${
              isHighlighted ? "#6B4530" : isSelected ? "#5A3A22" : "#4A3020"
            } 0%, ${
              isHighlighted ? "#4A3020" : isSelected ? "#3A2515" : "#2E1B10"
            } 45%, ${
              "#1A0E06"
            } 100%)`,
            boxShadow: isHighlighted
              ? `inset 0 1vw 2vw rgba(0,0,0,0.92), inset 0 0.5vw 1vw rgba(0,0,0,0.6), inset 0 -0.2vw 0.5vw rgba(120,70,30,0.08), 0 0 1.2vw rgba(218,165,32,0.5)`
              : isSelected
              ? `inset 0 1vw 2vw rgba(0,0,0,0.92), inset 0 0.5vw 1vw rgba(0,0,0,0.6), inset 0 -0.2vw 0.5vw rgba(120,70,30,0.08), 0 0 0.8vw rgba(59,130,246,0.4)`
              : `inset 0 1vw 2vw rgba(0,0,0,0.92), inset 0 0.5vw 1vw rgba(0,0,0,0.6), inset 0 -0.2vw 0.5vw rgba(120,70,30,0.08)`,
            outline: isHighlighted
              ? "2px solid rgba(218,165,32,0.7)"
              : isSelected
              ? "3px solid rgba(59,130,246,0.7)"
              : "none",
            outlineOffset: "2px",
            opacity: isMine ? 1 : 0.6,
            transition: "all 0.2s ease",
          }}
        >
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 100%, rgba(80,50,25,0.12) 0%, transparent 50%)",
            }}
          />
          <div
            className="absolute inset-[3%] rounded-full pointer-events-none"
            style={{
              boxShadow: "inset 0 0.3vw 0.8vw rgba(0,0,0,0.4)",
              background: "radial-gradient(ellipse at 35% 25%, rgba(120,80,40,0.06), transparent 60%)",
            }}
          />

          <Marbles count={count} />

          {isMine && showCount && !isHighlighted && !isSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full z-10"
              style={{ backdropFilter: "blur(1px)" }}
            >
              <span
                className="font-bold text-lg"
                style={{ color: "#C4A265", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
              >
                {count}
              </span>
            </motion.div>
          )}

          {(isHighlighted || isSelected) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full z-10"
              style={{ backdropFilter: "blur(2px)" }}
            >
              <motion.span
                key={count}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                className="text-white font-bold text-2xl"
                style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
              >
                {count}
              </motion.span>
            </motion.div>
          )}
        </div>
        {!isTop && (
          <span
            className="font-mono text-xs mt-2 font-semibold select-none"
            style={{ color: isMine ? "rgba(200,160,100,0.75)" : "rgba(140,110,80,0.45)" }}
          >
            {label}
          </span>
        )}
      </motion.div>
    );
  };

  const renderStore = (score: number, isOpponent: boolean, testId: string) => {
    const storeLabel = isOpponent ? "OPPONENT" : "ME";
    const rankLabel = isOpponent ? opponentStoreLabel : myStoreLabel;

    return (
      <div className="flex flex-col items-center relative z-10">
        <span
          className="font-mono text-xs font-bold uppercase tracking-wider mb-1 select-none"
          data-testid={`label-rank-${testId}`}
          style={{
            color: rankLabel === "OTA" ? "rgba(218,165,32,0.9)" : rankLabel === "OPE" ? "rgba(180,80,60,0.8)" : "transparent",
            textShadow: rankLabel === "OTA" ? "0 0 8px rgba(218,165,32,0.4)" : "none",
            minHeight: "1.2em",
          }}
        >
          {rankLabel}
        </span>
        <div
          className="w-[8vw] h-[28vh] rounded-[3vw] flex flex-col items-center justify-center relative overflow-hidden"
          data-testid={testId}
          style={{
            background: `radial-gradient(ellipse at 48% 38%, #4A3020 0%, #2E1B10 50%, #1A0E06 100%)`,
            boxShadow: "inset 0 1.5vw 2.5vw rgba(0,0,0,0.95), inset 0 0.5vw 1.2vw rgba(0,0,0,0.5), inset 0 -0.3vw 0.8vw rgba(100,65,30,0.06)",
            border: "1px solid rgba(20,12,5,0.7)",
          }}
        >
          <div
            className="absolute inset-[5%] rounded-[2.5vw] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 40% 30%, rgba(100,65,30,0.05), transparent 70%)",
              boxShadow: "inset 0 0.5vw 1.5vw rgba(0,0,0,0.3)",
            }}
          />
          <div className="absolute inset-0 flex flex-wrap items-center justify-center p-2 opacity-35 content-center overflow-hidden">
            {Array.from({ length: Math.min(score, 48) }).map((_, i) => {
              const colorIdx = i % 8;
              const colors = ["#8B9B72","#7A8B65","#9EA58E","#B0A898","#A3A08B","#6B7A5E","#C2BCB0","#8A9470"];
              return (
                <div
                  key={i}
                  className="m-[0.5px] relative"
                  style={{
                    width: "1.1vw",
                    height: "1.1vw",
                    borderRadius: "45% 55% 50% 48%",
                    backgroundColor: colors[colorIdx],
                    transform: `rotate(${(i * 37) % 360}deg)`,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                />
              );
            })}
          </div>
          <span
            className="font-bold text-4xl z-20"
            style={{
              color: "rgba(200,160,100,0.85)",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {score}
          </span>
        </div>
        <span
          className="font-mono text-xs font-bold uppercase tracking-wider mt-1 select-none"
          data-testid={`label-store-${testId}`}
          style={{
            color: isOpponent ? "rgba(180,100,60,0.7)" : "rgba(100,160,220,0.7)",
          }}
        >
          {storeLabel}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-[90vw]"
      data-testid="game-board"
    >
      <div className="flex justify-center mb-4">
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{
            background: "rgba(30,20,10,0.85)",
            border: "1px solid rgba(139,90,43,0.3)",
          }}
        >
          <div
            className="px-6 py-2 font-mono text-sm uppercase tracking-wider font-bold flex items-center gap-2"
            style={{
              color: playerIndex === 0 ? "rgb(96,165,250)" : "rgb(248,113,113)",
              background: currentPlayer === 0 ? "rgba(59,130,246,0.15)" : "transparent",
              borderRight: "1px solid rgba(139,90,43,0.3)",
            }}
          >
            <span>{player1Name}</span>
            <span className="text-white text-lg">{scores[0]}</span>
          </div>
          <div
            className="px-6 py-2 font-mono text-sm uppercase tracking-wider font-bold flex items-center gap-2"
            style={{
              color: playerIndex === 1 ? "rgb(96,165,250)" : "rgb(248,113,113)",
              background: currentPlayer === 1 ? "rgba(239,68,68,0.15)" : "transparent",
            }}
          >
            <span>{player2Name}</span>
            <span className="text-white text-lg">{scores[1]}</span>
          </div>
        </div>
      </div>

      <div className="relative" style={{ perspective: "1200px" }}>
      <div
        className="relative rounded-[2vw] p-[2vw] flex items-center justify-between gap-[2vw] w-full"
        style={{
          background: "linear-gradient(160deg, #8B5E3C 0%, #7A4E30 15%, #6B4228 30%, #5C3822 50%, #6B4228 70%, #7A4E30 85%, #8B5E3C 100%)",
          boxShadow: `
            0 2vw 5vw rgba(0,0,0,0.6),
            0 0.5vw 1.5vw rgba(0,0,0,0.4),
            inset 0 0.2vw 0.4vw rgba(255,230,180,0.08),
            inset 0 -0.2vw 0.4vw rgba(0,0,0,0.25)
          `,
          border: "0.3vw solid #3A2216",
        }}
      >
        <div
          className="absolute inset-0 rounded-[1.8vw] pointer-events-none z-[1]"
          style={{
            backgroundImage: `url(${boardTexture})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.18,
            mixBlendMode: "multiply",
          }}
        />

        <div
          className="absolute inset-0 rounded-[1.8vw] pointer-events-none z-[2]"
          style={{
            background: `
              repeating-linear-gradient(
                87deg,
                transparent,
                transparent 4px,
                rgba(90,55,25,0.1) 4px,
                rgba(90,55,25,0.1) 5px
              ),
              repeating-linear-gradient(
                84deg,
                transparent,
                transparent 12px,
                rgba(60,35,15,0.07) 12px,
                rgba(60,35,15,0.07) 14px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 30px,
                rgba(50,30,12,0.05) 30px,
                rgba(50,30,12,0.05) 33px
              )
            `,
            mixBlendMode: "multiply",
          }}
        />

        <div
          className="absolute inset-0 rounded-[1.8vw] pointer-events-none z-[3]"
          style={{
            background: `
              radial-gradient(ellipse at 20% 30%, rgba(0,0,0,0.08) 0%, transparent 40%),
              radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.06) 0%, transparent 35%),
              radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(0,0,0,0.04) 100%)
            `,
          }}
        />

        <div
          className="absolute inset-0 rounded-[1.8vw] pointer-events-none z-[4]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 15% 25%, rgba(60,30,10,0.12) 1px, transparent 1px),
              radial-gradient(circle at 45% 65%, rgba(60,30,10,0.08) 1px, transparent 1px),
              radial-gradient(circle at 75% 35%, rgba(60,30,10,0.1) 1px, transparent 1px),
              radial-gradient(circle at 85% 80%, rgba(60,30,10,0.06) 1px, transparent 1px),
              radial-gradient(circle at 30% 80%, rgba(60,30,10,0.09) 1px, transparent 1px)
            `,
            backgroundSize: "120px 80px, 90px 110px, 140px 70px, 100px 130px, 110px 90px",
          }}
        />

        <div
          className="absolute left-1/2 top-0 bottom-0 w-[1vw] -translate-x-1/2 z-20"
          style={{
            background: "linear-gradient(90deg, #0E0704 0%, #1A0E06 30%, #0E0704 50%, #1A0E06 70%, #0E0704 100%)",
            boxShadow: "inset 0 0 0.6vw rgba(0,0,0,0.9), -2px 0 5px rgba(0,0,0,0.5), 2px 0 5px rgba(0,0,0,0.5)",
          }}
        />

        {renderStore(opponentScore, true, "score-opponent")}

        <div className="flex flex-col gap-[3vh] relative z-10 flex-1">
          <div className="flex justify-center h-[40px]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between w-[25vw] px-[1vw]">
              {playerIndex === 1 && (
                <div className="flex gap-3 items-center">
                  <button
                    data-testid="button-count-top"
                    onClick={handleCount}
                    className="px-5 py-1 rounded-full font-mono text-sm uppercase transition-all"
                    style={{
                      background: showCount
                        ? "linear-gradient(135deg, #8B9B72, #6B7A5E)"
                        : "rgba(68,64,60,0.6)",
                      color: showCount ? "#1a1a0e" : "rgb(120,113,108)",
                      cursor: "pointer",
                      boxShadow: showCount ? "0 2px 8px rgba(0,0,0,0.4)" : "none",
                      fontWeight: 700,
                    }}
                  >
                    {showCount ? `Count: ${myPitTotal}` : "Count"}
                  </button>
                  <button
                    data-testid="button-play-top"
                    onClick={handlePlay}
                    disabled={selectedPit === null || !isMyTurn || !myRow.includes(selectedPit ?? -1) || isAnimating}
                    className="px-6 py-1 rounded-full font-mono text-sm uppercase transition-all"
                    style={{
                      background: selectedPit !== null && isMyTurn && myRow.includes(selectedPit) && !isAnimating
                        ? "linear-gradient(135deg, #C4A265, #9B8050)"
                        : "rgba(68,64,60,0.6)",
                      color: selectedPit !== null && isMyTurn && myRow.includes(selectedPit) && !isAnimating ? "#2A1708" : "rgb(120,113,108)",
                      cursor: selectedPit !== null && isMyTurn && myRow.includes(selectedPit) && !isAnimating ? "pointer" : "not-allowed",
                      boxShadow: selectedPit !== null && isMyTurn && myRow.includes(selectedPit) && !isAnimating
                        ? "0 2px 8px rgba(0,0,0,0.4)"
                        : "none",
                      fontWeight: 700,
                    }}
                  >
                    Play
                  </button>
                </div>
              )}
            </motion.div>
          </div>

          <div className="flex justify-between w-full">
            {topRow.map((pitIndex) => renderPit(pitIndex, true))}
          </div>

          <div className="flex justify-between w-full">
            {bottomRow.map((pitIndex) => renderPit(pitIndex, false))}
          </div>

          <div className="flex justify-center h-[40px]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between w-[25vw] px-[1vw]">
              {playerIndex === 0 && (
                <div className="flex gap-3 items-center">
                  <button
                    data-testid="button-count-bottom"
                    onClick={handleCount}
                    className="px-5 py-1 rounded-full font-mono text-sm uppercase transition-all"
                    style={{
                      background: showCount
                        ? "linear-gradient(135deg, #8B9B72, #6B7A5E)"
                        : "rgba(68,64,60,0.6)",
                      color: showCount ? "#1a1a0e" : "rgb(120,113,108)",
                      cursor: "pointer",
                      boxShadow: showCount ? "0 2px 8px rgba(0,0,0,0.4)" : "none",
                      fontWeight: 700,
                    }}
                  >
                    {showCount ? `Count: ${myPitTotal}` : "Count"}
                  </button>
                  <button
                    data-testid="button-play-bottom"
                    onClick={handlePlay}
                    disabled={selectedPit === null || !isMyTurn || !myRow.includes(selectedPit ?? -1) || isAnimating}
                    className="px-6 py-1 rounded-full font-mono text-sm uppercase transition-all"
                    style={{
                      background: selectedPit !== null && isMyTurn && myRow.includes(selectedPit) && !isAnimating
                        ? "linear-gradient(135deg, #C4A265, #9B8050)"
                        : "rgba(68,64,60,0.6)",
                      color: selectedPit !== null && isMyTurn && myRow.includes(selectedPit) && !isAnimating ? "#2A1708" : "rgb(120,113,108)",
                      cursor: selectedPit !== null && isMyTurn && myRow.includes(selectedPit) && !isAnimating ? "pointer" : "not-allowed",
                      boxShadow: selectedPit !== null && isMyTurn && myRow.includes(selectedPit) && !isAnimating
                        ? "0 2px 8px rgba(0,0,0,0.4)"
                        : "none",
                      fontWeight: 700,
                    }}
                  >
                    Play
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {renderStore(myScore, false, "score-mine")}
      </div>

      <AnimatePresence>
        {boardClosed && (
          <motion.div
            className="absolute top-0 left-0 w-1/2 h-full rounded-l-[2vw] overflow-hidden"
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "right center",
              willChange: "transform",
              pointerEvents: "none",
              zIndex: 50,
            }}
            initial={wasClosedOnMount.current && !hasMounted.current ? { rotateY: 180 } : { rotateY: 0 }}
            animate={{ rotateY: 180 }}
            exit={{ rotateY: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 28,
              mass: 0.9,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "translateZ(0.5px)",
                background: "linear-gradient(160deg, #8B5E3C 0%, #7A4E30 30%, #6B4228 60%, #5C3822 100%)",
                border: "0.3vw solid #3A2216",
                borderRight: "none",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${boardTexture})`,
                  backgroundSize: "cover",
                  backgroundPosition: "left center",
                  opacity: 0.15,
                  mixBlendMode: "multiply",
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "repeating-linear-gradient(87deg, transparent, transparent 4px, rgba(90,55,25,0.1) 4px, rgba(90,55,25,0.1) 5px), repeating-linear-gradient(84deg, transparent, transparent 12px, rgba(60,35,15,0.07) 12px, rgba(60,35,15,0.07) 14px)",
                  mixBlendMode: "multiply",
                }}
              />
            </div>

            <div
              className="absolute inset-0 rounded-r-[2vw] overflow-hidden flex items-center justify-center"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg) translateZ(0.5px)",
                background: "linear-gradient(160deg, #8B5E3C 0%, #7A4E30 20%, #6B4228 40%, #5C3822 60%, #6B4228 80%, #7A4E30 100%)",
                boxShadow: "0 2vw 5vw rgba(0,0,0,0.6), inset 0 0.2vw 0.4vw rgba(255,230,180,0.06)",
                border: "0.3vw solid #3A2216",
                borderLeft: "none",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${boardTexture})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.15,
                  mixBlendMode: "multiply",
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "repeating-linear-gradient(87deg, transparent, transparent 4px, rgba(90,55,25,0.1) 4px, rgba(90,55,25,0.1) 5px), repeating-linear-gradient(84deg, transparent, transparent 12px, rgba(60,35,15,0.07) 12px, rgba(60,35,15,0.07) 14px)",
                  mixBlendMode: "multiply",
                }}
              />

              <div className="text-center z-10 select-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {boardClosed && (
          <motion.div
            className="absolute top-0 left-0 w-1/2 h-full rounded-l-[2vw] overflow-hidden"
            style={{
              pointerEvents: "none",
              zIndex: 45,
            }}
            initial={wasClosedOnMount.current && !hasMounted.current ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: wasClosedOnMount.current && !hasMounted.current ? 0 : 0.3 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(160deg, #8B5E3C 0%, #7A4E30 30%, #6B4228 60%, #5C3822 100%)",
                border: "0.3vw solid #3A2216",
                borderRight: "none",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${boardTexture})`,
                  backgroundSize: "cover",
                  backgroundPosition: "left center",
                  opacity: 0.15,
                  mixBlendMode: "multiply",
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "repeating-linear-gradient(87deg, transparent, transparent 4px, rgba(90,55,25,0.1) 4px, rgba(90,55,25,0.1) 5px), repeating-linear-gradient(84deg, transparent, transparent 12px, rgba(60,35,15,0.07) 12px, rgba(60,35,15,0.07) 14px)",
                  mixBlendMode: "multiply",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {boardClosed && (
          <motion.div
            className="absolute inset-0 rounded-[2vw] flex items-center justify-center"
            style={{
              pointerEvents: "none",
              zIndex: 55,
            }}
            initial={wasClosedOnMount.current && !hasMounted.current ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: wasClosedOnMount.current && !hasMounted.current ? 0 : 0.5 }}
          >
            <div className="text-center select-none flex flex-col items-center justify-center">
              <h2
                className="tracking-[0.3em] leading-tight"
                style={{
                  fontSize: "clamp(2rem, 4.5vw, 4rem)",
                  fontFamily: "'Architects Daughter', cursive",
                  fontWeight: 700,
                  background: "linear-gradient(180deg, #ffd700 0%, #daa520 25%, #ffd700 50%, #b8860b 75%, #daa520 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
                }}
              >
                AYO
              </h2>
              <h2
                className="tracking-[0.2em] leading-tight"
                style={{
                  fontSize: "clamp(1.4rem, 3.5vw, 3rem)",
                  fontFamily: "'Architects Daughter', cursive",
                  fontWeight: 700,
                  background: "linear-gradient(180deg, #ffd700 0%, #daa520 25%, #ffd700 50%, #b8860b 75%, #daa520 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
                }}
              >
                OLOPON
              </h2>
              <p
                className="mt-3"
                style={{
                  fontSize: "clamp(0.55rem, 1vw, 0.85rem)",
                  fontFamily: "Arial, sans-serif",
                  color: "#daa520",
                  filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))",
                }}
              >
                By
              </p>
              <p
                className="mt-1"
                style={{
                  fontSize: "clamp(0.7rem, 1.4vw, 1.1rem)",
                  fontFamily: "'Architects Daughter', cursive",
                  background: "linear-gradient(180deg, #ffd700 0%, #daa520 50%, #b8860b 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.6))",
                }}
              >
                Tunde Awosanya
              </p>
              <div
                className="mt-4"
                style={{
                  fontSize: "clamp(0.6rem, 1.1vw, 0.95rem)",
                  fontFamily: "Arial, sans-serif",
                  color: "#daa520",
                  lineHeight: "1.7",
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                }}
              >
                <p>&copy; 2025 jekatayo.com</p>
                <p>Powered by</p>
                <p>Paysol Technology LLC, Largo, MD USA</p>
                <p>Paysol Technology LTD, Alausa Ikeja, Lagos Nigeria</p>
              </div>
            </div>
            {onOpenBoard && (
              <motion.button
                data-testid="button-click-to-start"
                onClick={(e) => { e.stopPropagation(); onOpenBoard(); }}
                className="absolute bottom-3 right-4 select-none"
                style={{
                  pointerEvents: "auto",
                  cursor: "pointer",
                  border: "none",
                  padding: "0.3rem 0.6rem",
                  fontFamily: "'Architects Daughter', cursive",
                  fontWeight: 700,
                  fontSize: "clamp(0.7rem, 1.2vw, 1rem)",
                  letterSpacing: "0.15em",
                  background: "linear-gradient(180deg, #ffd700 0%, #daa520 50%, #b8860b 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.7))",
                }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                CLICK TO START
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <div className="flex flex-wrap justify-center mt-4 gap-2">
        {onSaveGame && (
          <button
            data-testid="button-save-game"
            onClick={onSaveGame}
            className="px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition-all"
            style={{
              background: "linear-gradient(135deg, #1a6b4a, #0f4a33)",
              color: "#8cf0c4",
              border: "1px solid rgba(140,240,196,0.3)",
            }}
          >
            Save Game
          </button>
        )}
        {onResumeSaved && (
          <button
            data-testid="button-resume-saved"
            onClick={onResumeSaved}
            className="px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition-all"
            style={{
              background: "linear-gradient(135deg, #1a6b4a, #0f4a33)",
              color: "#8cf0c4",
              border: "1px solid rgba(140,240,196,0.3)",
            }}
          >
            Resume Saved
          </button>
        )}
        {onClose && (
          <button
            data-testid="button-close-game"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition-all"
            style={{
              background: "linear-gradient(135deg, #3d3d3d, #2a2a2a)",
              color: "#c0c0c0",
              border: "1px solid rgba(192,192,192,0.3)",
            }}
          >
            Close
          </button>
        )}
        {onNewGame && (
          <button
            data-testid="button-new-game-ctrl"
            onClick={onNewGame}
            className="px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition-all"
            style={{
              background: "linear-gradient(135deg, #1a3d6b, #0f2a4a)",
              color: "#8cc4f0",
              border: "1px solid rgba(140,196,240,0.3)",
            }}
          >
            New Game
          </button>
        )}
      </div>
      <div className="flex flex-wrap justify-center mt-2 gap-2">
        {onReset && (
          <button
            data-testid="button-reset-game"
            onClick={onReset}
            className="px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition-all"
            style={{
              background: "linear-gradient(135deg, #6b3d1a, #4a2a0f)",
              color: "#f0c48c",
              border: "1px solid rgba(240,196,140,0.3)",
            }}
          >
            Reset
          </button>
        )}
        {onPause && (status === "active") && (
          <button
            data-testid="button-pause-game"
            onClick={onPause}
            className="px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition-all"
            style={{
              background: "linear-gradient(135deg, #8B6914, #6B4E12)",
              color: "#f0d090",
              border: "1px solid rgba(240,208,144,0.3)",
            }}
          >
            Pause
          </button>
        )}
        {onEnd && (
          <button
            data-testid="button-end-game"
            onClick={onEnd}
            className="px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition-all"
            style={{
              background: "linear-gradient(135deg, #8b1a1a, #6b0f0f)",
              color: "#f08c8c",
              border: "1px solid rgba(240,140,140,0.3)",
            }}
          >
            End
          </button>
        )}
      </div>
    </motion.div>
  );
}
