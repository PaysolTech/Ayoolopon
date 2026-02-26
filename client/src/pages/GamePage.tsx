import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getSocket, connectSocket } from "@/lib/socket";
import { GameBoard } from "@/components/GameBoard";
import { ArrowLeft, Trophy, Loader2 } from "lucide-react";
import type { Game } from "@shared/schema";

interface GameState {
  id: string;
  board: number[];
  scores: [number, number];
  currentPlayer: number;
  status: string;
  player1Id: string;
  player2Id: string | null;
  player1Name: string;
  player2Name: string;
  winnerId: string | null;
  boardClosed?: boolean;
  myPlayerIndex?: number;
}

interface MoveData {
  board: number[];
  scores: [number, number];
  currentPlayer: number;
  status: string;
  winnerId: string | null;
  previousBoard?: number[];
  pitIndex?: number;
  movedByPlayer?: number;
}

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [moveInfo, setMoveInfo] = useState<{ previousBoard?: number[]; pitIndex?: number; movedByPlayer?: number }>({});
  const [showSavedGames, setShowSavedGames] = useState(false);
  const [savedGames, setSavedGames] = useState<(Game & { player1Name: string; player2Name: string })[]>([]);
  const [reached25, setReached25] = useState<{ playerName: string; scores: [number, number] } | null>(null);

  const boardClosed = gameState?.boardClosed ?? false;

  useEffect(() => {
    if (!user || !gameId) return;
    const socket = connectSocket();

    const requestGameState = () => {
      socket.emit("join_game_room", { gameId });
    };

    if (socket.connected) {
      requestGameState();
    }
    socket.on("connect", requestGameState);

    socket.on("game_state", (data: GameState) => {
      setGameState(data);
      setMoveInfo({});
      if (data.status === "completed") {
        setTimeout(() => setShowResult(true), 500);
      }
    });

    socket.on("move_made", (data: MoveData) => {
      setMoveInfo({
        previousBoard: data.previousBoard,
        pitIndex: data.pitIndex,
        movedByPlayer: data.movedByPlayer,
      });
      setGameState(prev => prev ? { ...prev, board: data.board, scores: data.scores, currentPlayer: data.currentPlayer, status: data.status, winnerId: data.winnerId } : null);
      if (data.status === "completed") {
        setTimeout(() => setShowResult(true), 2000);
      }
    });

    socket.on("game_saved", () => {
      toast({ title: "Game saved!" });
    });

    socket.on("game_resumed", (data: { gameId: string }) => {
      navigate(`/game/${data.gameId}`);
      setShowSavedGames(false);
    });

    socket.on("saved_games", (data: any[]) => {
      setSavedGames(data);
    });

    socket.on("reached_25", (data: { playerName: string; scores: [number, number] }) => {
      setReached25(data);
    });

    socket.on("game_notification", (data: { message: string }) => {
      toast({ title: data.message });
    });

    socket.on("error", (data: { message: string }) => {
      toast({ title: "Error", description: data.message, variant: "destructive" });
    });

    return () => {
      socket.off("game_state");
      socket.off("move_made");
      socket.off("game_saved");
      socket.off("game_resumed");
      socket.off("saved_games");
      socket.off("reached_25");
      socket.off("game_notification");
      socket.off("error");
      socket.off("connect");
      socket.emit("leave_game_room", { gameId });
    };
  }, [user, gameId]);

  const handlePitClick = useCallback((pitIndex: number) => {
    if (!gameState || !user) return;
    const socket = getSocket();
    socket.emit("make_move", { gameId, pitIndex });
  }, [gameState, user, gameId]);

  const handleSaveGame = useCallback(() => {
    const socket = getSocket();
    socket.emit("save_game", { gameId });
  }, [gameId]);

  const handleResumeSaved = useCallback(() => {
    const socket = getSocket();
    socket.emit("get_saved_games");
    setShowSavedGames(true);
  }, []);

  const handleClose = useCallback(() => {
    const socket = getSocket();
    socket.emit("pause_game", { gameId });
  }, [gameId]);

  const handleNewGame = useCallback(() => {
    navigate("/lobby");
  }, [navigate]);

  const handleReset = useCallback(() => {
    const socket = getSocket();
    socket.emit("reset_game", { gameId });
  }, [gameId]);

  const handlePause = useCallback(() => {
    const socket = getSocket();
    socket.emit("pause_game", { gameId });
  }, [gameId]);

  const handleResume = useCallback(() => {
    const socket = getSocket();
    socket.emit("resume_game", { gameId });
    socket.emit("join_game_room", { gameId });
  }, [gameId]);

  const handleEnd = useCallback(() => {
    const socket = getSocket();
    socket.emit("end_game", { gameId });
  }, [gameId]);

  if (!user) return null;

  if (!gameState) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1a0f07 0%, #2c1a0e 30%, #3d2b18 60%, #1a0f07 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#d4a76a" }} />
          <p style={{ color: "#8d6e63" }}>Loading game...</p>
        </motion.div>
      </div>
    );
  }

  if (gameState.status === "waiting") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1a0f07 0%, #2c1a0e 30%, #3d2b18 60%, #1a0f07 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, #d4d4d8, #71717a)",
              boxShadow: "inset -3px -3px 6px rgba(0,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.2)",
            }}
          />
          <h2 className="text-xl font-bold mb-2" style={{ color: "#f0d090" }}>
            Waiting for opponent...
          </h2>
          <p className="text-sm" style={{ color: "#8d6e63" }}>
            Share this game with a friend
          </p>
          <Button
            data-testid="button-back-lobby"
            variant="ghost"
            onClick={() => navigate("/lobby")}
            className="mt-4 no-default-hover-elevate no-default-active-elevate"
            style={{ color: "#d4a76a" }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>
        </motion.div>
      </div>
    );
  }

  const playerIndex = gameState.myPlayerIndex !== undefined ? gameState.myPlayerIndex : (gameState.player1Id === user.id ? 0 : 1);
  const isMyTurn = gameState.currentPlayer === playerIndex;
  const opponentName = playerIndex === 0 ? gameState.player2Name : gameState.player1Name;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #1a0f07 0%, #2c1a0e 30%, #3d2b18 60%, #1a0f07 100%)" }}
    >
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4"
      >
        <Button
          data-testid="button-back"
          variant="ghost"
          size="icon"
          onClick={() => navigate("/lobby")}
          className="no-default-hover-elevate no-default-active-elevate"
          style={{ color: "#8d6e63" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h1
            className="text-lg font-bold"
            style={{
              background: "linear-gradient(135deg, #d4a76a, #f0d090)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Ayo Olopon
          </h1>
        </div>
        <div className="w-9" />
      </motion.header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        {!boardClosed && (
          <motion.div
            key={`turn-${gameState.currentPlayer}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p
              className="text-lg font-semibold"
              style={{
                color: isMyTurn ? "#fbbf24" : "#8d6e63",
              }}
            >
              {gameState.status === "completed"
                ? "Game Over"
                : isMyTurn
                ? "Your Turn"
                : `${opponentName}'s Turn`}
            </p>
            {!isMyTurn && gameState.status === "active" && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-xs mt-1"
                style={{ color: "#8d6e63" }}
              >
                Waiting...
              </motion.div>
            )}
          </motion.div>
        )}

        <div className="relative w-full max-w-[90vw]">
          <GameBoard
            board={gameState.board}
            scores={gameState.scores}
            currentPlayer={gameState.currentPlayer}
            playerIndex={playerIndex}
            canPlay={isMyTurn && gameState.status === "active" && !boardClosed}
            onPitClick={handlePitClick}
            player1Name={gameState.player1Name}
            player2Name={gameState.player2Name}
            status={gameState.status}
            boardClosed={boardClosed}
            previousBoard={moveInfo.previousBoard}
            movedPitIndex={moveInfo.pitIndex}
            movedByPlayer={moveInfo.movedByPlayer}
            onSaveGame={handleSaveGame}
            onResumeSaved={handleResumeSaved}
            onClose={!boardClosed ? handleClose : undefined}
            onNewGame={handleNewGame}
            onReset={handleReset}
            onPause={!boardClosed ? handlePause : undefined}
            onEnd={handleEnd}
            onOpenBoard={boardClosed ? handleResume : undefined}
          />
        </div>

        {boardClosed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3 mt-2"
          >
            <Button
              data-testid="button-back-lobby-closed"
              variant="ghost"
              onClick={() => navigate("/lobby")}
              style={{ color: "#d4a76a" }}
              className="no-default-hover-elevate no-default-active-elevate"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lobby
            </Button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showSavedGames && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setShowSavedGames(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="rounded-2xl p-6 max-w-sm mx-4 w-full"
              style={{
                background: "linear-gradient(145deg, rgba(80,55,30,0.98), rgba(50,35,18,0.98))",
                border: "1px solid rgba(139,90,43,0.4)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: "#f0d090" }}>Saved Games</h3>
              {savedGames.length === 0 ? (
                <p className="text-sm" style={{ color: "#8d6e63" }}>No saved games found.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedGames.map((game) => (
                    <button
                      key={game.id}
                      data-testid={`saved-game-${game.id}`}
                      className="w-full p-3 rounded-xl text-left transition-all"
                      style={{
                        background: "rgba(60,40,20,0.6)",
                        border: "1px solid rgba(139,90,43,0.2)",
                      }}
                      onClick={() => {
                        const socket = getSocket();
                        socket.emit("resume_game", { gameId: game.id });
                      }}
                    >
                      <p className="font-medium text-sm" style={{ color: "#f0d090" }}>
                        {game.player1Name} vs {game.player2Name}
                      </p>
                      <p className="text-xs" style={{ color: "#8d6e63" }}>
                        Score: {(game.scores as [number, number])[0]} - {(game.scores as [number, number])[1]} | {game.status}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <Button
                data-testid="button-close-saved"
                variant="ghost"
                onClick={() => setShowSavedGames(false)}
                className="w-full mt-4 no-default-hover-elevate no-default-active-elevate"
                style={{ color: "#8d6e63" }}
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reached25 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="rounded-2xl p-8 text-center max-w-sm mx-4"
              style={{
                background: "linear-gradient(145deg, rgba(80,55,30,0.95), rgba(50,35,18,0.98))",
                border: "2px solid rgba(251,191,36,0.4)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(251,191,36,0.1)",
              }}
            >
              <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: "#fbbf24" }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: "#f0d090" }}>
                {reached25.playerName} reached 25!
              </h2>
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "#f0d090" }}>
                    {reached25.scores[0]}
                  </p>
                  <p className="text-xs" style={{ color: "#8d6e63" }}>{gameState.player1Name}</p>
                </div>
                <span className="text-xl" style={{ color: "#5d4037" }}>-</span>
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: "#f0d090" }}>
                    {reached25.scores[1]}
                  </p>
                  <p className="text-xs" style={{ color: "#8d6e63" }}>{gameState.player2Name}</p>
                </div>
              </div>
              <p className="text-sm mb-4" style={{ color: "#d4a76a" }}>
                Continue playing or end the game?
              </p>
              <div className="flex gap-2">
                <Button
                  data-testid="button-continue-game"
                  className="flex-1"
                  onClick={() => setReached25(null)}
                  style={{ background: "linear-gradient(135deg, #1a6b4a, #0f4a33)", color: "#8cf0c4", border: "1px solid rgba(140,240,196,0.3)" }}
                >
                  Continue
                </Button>
                <Button
                  data-testid="button-end-game-25"
                  className="flex-1"
                  onClick={() => { setReached25(null); handleEnd(); }}
                  style={{ background: "#8B6914", color: "#f0d090" }}
                >
                  End Game
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResult && gameState.status === "completed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="rounded-2xl p-8 text-center max-w-sm mx-4"
              style={{
                background: "linear-gradient(145deg, rgba(80,55,30,0.95), rgba(50,35,18,0.98))",
                border: "2px solid rgba(251,191,36,0.4)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(251,191,36,0.1)",
              }}
            >
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: "#fbbf24" }} />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: "#f0d090" }}>
                {gameState.winnerId === null
                  ? "It's a Draw!"
                  : gameState.winnerId === (playerIndex === 0 ? gameState.player1Id : gameState.player2Id)
                  ? "You Won!"
                  : "You Lost!"}
              </h2>
              <p className="mb-2" style={{ color: "#d4a76a" }}>
                Final Score
              </p>
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: "#f0d090" }}>
                    {gameState.scores[0]}
                  </p>
                  <p className="text-xs" style={{ color: "#8d6e63" }}>{gameState.player1Name}</p>
                </div>
                <span className="text-xl" style={{ color: "#5d4037" }}>-</span>
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: "#f0d090" }}>
                    {gameState.scores[1]}
                  </p>
                  <p className="text-xs" style={{ color: "#8d6e63" }}>{gameState.player2Name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  data-testid="button-new-game"
                  className="flex-1"
                  onClick={() => navigate("/lobby")}
                  style={{ background: "#8B6914", color: "#f0d090" }}
                >
                  New Game
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
