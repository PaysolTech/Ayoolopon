import { motion } from "framer-motion";
import { Marble } from "./Marble";
import { Lock } from "lucide-react";

interface PitProps {
  seeds: number;
  index: number;
  isPlayerPit: boolean;
  isCurrentTurn: boolean;
  canPlay: boolean;
  onClick: () => void;
  isTopRow: boolean;
  label: string;
}

export function Pit({ seeds, index, isPlayerPit, isCurrentTurn, canPlay, onClick, isTopRow, label }: PitProps) {
  const pitSize = 72;
  const isClickable = isPlayerPit && isCurrentTurn && canPlay && seeds > 0;
  const isOpponentPit = !isPlayerPit;

  return (
    <div className="relative flex flex-col items-center">
      {isTopRow && (
        <span
          className="mb-1 text-[10px] font-bold tracking-wider"
          style={{ color: isOpponentPit ? "#6d5040" : "#d4a76a" }}
        >
          {label}
        </span>
      )}
      <motion.button
        data-testid={`pit-${index}`}
        onClick={isClickable ? onClick : undefined}
        disabled={!isClickable}
        whileHover={isClickable ? { scale: 1.05 } : {}}
        whileTap={isClickable ? { scale: 0.95 } : {}}
        className={`relative flex items-center justify-center rounded-full transition-all duration-200
          ${isClickable ? "cursor-pointer" : "cursor-default"}
          ${isClickable ? "ring-2 ring-amber-400/60 ring-offset-2 ring-offset-amber-900/20" : ""}
        `}
        style={{
          width: pitSize,
          height: pitSize,
          background: isOpponentPit
            ? "radial-gradient(ellipse at 50% 40%, #4a3828 0%, #332318 60%, #221510 100%)"
            : "radial-gradient(ellipse at 50% 40%, #5c4033 0%, #3e2723 60%, #2c1a10 100%)",
          boxShadow: isOpponentPit
            ? `inset 0 4px 12px rgba(0,0,0,0.7), inset 0 -2px 6px rgba(100,60,30,0.2), 0 2px 4px rgba(0,0,0,0.3)`
            : `inset 0 4px 12px rgba(0,0,0,0.6), inset 0 -2px 6px rgba(139,90,43,0.3), 0 2px 4px rgba(0,0,0,0.3)`,
          opacity: isOpponentPit ? 0.75 : 1,
        }}
      >
        <div className="relative flex items-center justify-center" style={{ width: pitSize - 16, height: pitSize - 16 }}>
          {Array.from({ length: seeds }).map((_, i) => (
            <Marble key={`${index}-${i}-${seeds}`} index={i} total={seeds} pitSize={pitSize} />
          ))}
        </div>

        {isOpponentPit && (
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(0,0,0,0.15)" }}
          >
            <Lock className="w-3 h-3 opacity-30" style={{ color: "#8d6e63" }} />
          </div>
        )}

        <motion.span
          key={seeds}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -bottom-5 text-xs font-bold"
          style={{ color: isOpponentPit ? "#8d6e63" : "#d4a76a" }}
        >
          {seeds}
        </motion.span>
      </motion.button>
      {!isTopRow && (
        <span
          className="mt-1 text-[10px] font-bold tracking-wider"
          style={{ color: isOpponentPit ? "#6d5040" : "#d4a76a" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
