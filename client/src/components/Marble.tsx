import { motion, AnimatePresence } from "framer-motion";

interface MarblesProps {
  count: number;
  color?: string;
}

const SEED_COLORS = [
  { base: "#8B9B72", highlight: "rgba(180,200,160,0.5)", shadow: "rgba(60,70,45,0.6)" },
  { base: "#7A8B65", highlight: "rgba(160,185,140,0.45)", shadow: "rgba(55,65,40,0.6)" },
  { base: "#9EA58E", highlight: "rgba(200,210,185,0.5)", shadow: "rgba(75,80,65,0.6)" },
  { base: "#B0A898", highlight: "rgba(210,205,195,0.5)", shadow: "rgba(85,80,70,0.6)" },
  { base: "#A3A08B", highlight: "rgba(195,195,170,0.45)", shadow: "rgba(78,76,65,0.6)" },
  { base: "#6B7A5E", highlight: "rgba(140,165,120,0.5)", shadow: "rgba(45,55,35,0.6)" },
  { base: "#C2BCB0", highlight: "rgba(225,220,210,0.5)", shadow: "rgba(95,90,82,0.6)" },
  { base: "#8A9470", highlight: "rgba(170,190,145,0.45)", shadow: "rgba(60,68,48,0.6)" },
];

function getSeedStyle(i: number) {
  const colorSet = SEED_COLORS[i % SEED_COLORS.length];
  const scaleX = 0.85 + (((i * 7 + 3) % 5) / 25);
  const scaleY = 0.9 + (((i * 11 + 7) % 5) / 30);
  const rotation = ((i * 37 + 13) % 360);
  return { colorSet, scaleX, scaleY, rotation };
}

function getPosition(i: number, total: number) {
  const jitterX = ((i * 13 + 7) % 11 - 5) * 0.04;
  const jitterY = ((i * 17 + 3) % 11 - 5) * 0.04;

  if (total === 1) return { x: 0, y: 0 };
  if (total === 2) return { x: (i === 0 ? -0.45 : 0.45) + jitterX, y: jitterY };
  if (total === 3) {
    const positions = [{ x: 0, y: -0.4 }, { x: -0.4, y: 0.3 }, { x: 0.4, y: 0.3 }];
    return { x: positions[i].x + jitterX, y: positions[i].y + jitterY };
  }
  if (total === 4) {
    return { x: (i % 2 === 0 ? -0.4 : 0.4) + jitterX, y: (i < 2 ? -0.4 : 0.4) + jitterY };
  }
  if (total <= 6) {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    const radius = 0.5;
    return { x: Math.cos(angle) * radius + jitterX, y: Math.sin(angle) * radius + jitterY };
  }

  const angle = (i / total) * Math.PI * 2;
  const radius = total <= 10 ? 0.55 : 0.6;
  const layer = i < total * 0.6 ? 1 : 0.4;
  return {
    x: Math.cos(angle) * radius * layer + jitterX,
    y: Math.sin(angle) * radius * layer + jitterY,
  };
}

export function Marbles({ count }: MarblesProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      <AnimatePresence>
        {Array.from({ length: count }).map((_, i) => {
          const pos = getPosition(i, count);
          const { colorSet, scaleX, scaleY, rotation } = getSeedStyle(i);
          return (
            <motion.div
              key={i}
              className="absolute flex items-center justify-center"
              style={{
                width: "1.5vw",
                height: "1.5vw",
                zIndex: i,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                x: `${pos.x}vw`,
                y: `${pos.y}vw`,
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <div
                className="w-full h-full relative"
                style={{
                  borderRadius: "45% 55% 50% 48% / 52% 46% 54% 48%",
                  backgroundColor: colorSet.base,
                  transform: `scaleX(${scaleX}) scaleY(${scaleY}) rotate(${rotation}deg)`,
                  boxShadow: `
                    inset 1px -1px 3px ${colorSet.shadow},
                    inset -1px 1px 2px ${colorSet.highlight},
                    0 1px 3px rgba(0,0,0,0.4),
                    0 0 1px rgba(0,0,0,0.3)
                  `,
                }}
              >
                <div
                  className="absolute rounded-full"
                  style={{
                    top: "12%",
                    left: "18%",
                    width: "28%",
                    height: "22%",
                    background: colorSet.highlight,
                    filter: "blur(1px)",
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    bottom: "15%",
                    right: "15%",
                    width: "20%",
                    height: "18%",
                    background: "rgba(0,0,0,0.15)",
                    filter: "blur(1.5px)",
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
