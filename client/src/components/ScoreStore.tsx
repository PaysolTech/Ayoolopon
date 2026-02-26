import { motion } from "framer-motion";

interface ScoreStoreProps {
  score: number;
  label: string;
  isActive: boolean;
  position: "left" | "right";
}

export function ScoreStore({ score, label, isActive, position }: ScoreStoreProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${position === "left" ? "mr-3" : "ml-3"}`}>
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: isActive ? "#fbbf24" : "#a1887f" }}
      >
        {label}
      </span>
      <motion.div
        data-testid={`score-${position}`}
        animate={{
          boxShadow: isActive
            ? "inset 0 4px 16px rgba(0,0,0,0.6), 0 0 20px rgba(251,191,36,0.3)"
            : "inset 0 4px 16px rgba(0,0,0,0.6)",
        }}
        className="relative flex items-center justify-center rounded-2xl"
        style={{
          width: 64,
          height: 140,
          background: "radial-gradient(ellipse at 50% 40%, #5c4033 0%, #3e2723 60%, #2c1a10 100%)",
          border: isActive ? "2px solid rgba(251,191,36,0.4)" : "2px solid rgba(60,40,20,0.5)",
        }}
      >
        <motion.span
          key={score}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-bold"
          style={{ color: "#d4a76a" }}
        >
          {score}
        </motion.span>
      </motion.div>
    </div>
  );
}
