import { Button } from "@/components/ui/button";
import { Swords, Users, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #1a0f07 0%, #2c1a0e 30%, #3d2b18 60%, #1a0f07 100%)" }}
    >
      <nav className="flex items-center justify-between p-4 md:p-6">
        <h1
          className="text-2xl font-bold"
          style={{
            background: "linear-gradient(135deg, #d4a76a, #f0d090)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Ayo Olopon
        </h1>
        <a href="/api/login">
          <Button
            data-testid="button-login-nav"
            style={{ background: "#8B6914", color: "#f0d090", border: "1px solid rgba(212,167,106,0.3)" }}
          >
            Sign In
          </Button>
        </a>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div
            className="w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 35% 30%, #6d4c30, #3d2b18)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(0,0,0,0.3)",
              border: "2px solid rgba(212,167,106,0.3)",
            }}
          >
            <div className="grid grid-cols-3 gap-1">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, #d4d4d8, #71717a)",
                    boxShadow: "inset -1px -1px 2px rgba(0,0,0,0.3)",
                  }}
                />
              ))}
            </div>
          </div>

          <h1
            className="text-5xl md:text-6xl font-bold mb-2 font-serif"
            style={{ color: "#f0d090" }}
          >
            Ayo Olopon
          </h1>
          <h2
            className="text-4xl md:text-5xl font-bold mb-4 font-serif"
            style={{ color: "#f0d090" }}
          >
            The Ancient Game of Strategy
          </h2>
          <p
            className="text-lg md:text-xl mb-8 max-w-lg mx-auto"
            style={{ color: "#8d6e63" }}
          >
            Challenge friends to Ayo Olopon, a timeless Nigerian board game of skill and strategy. Play in real-time with beautiful 3D visuals.
          </p>

          <a href="/api/login">
            <Button
              data-testid="button-get-started"
              size="lg"
              className="text-lg px-8 py-6"
              style={{
                background: "linear-gradient(135deg, #8B6914, #a67c1a)",
                color: "#f0d090",
                border: "1px solid rgba(212,167,106,0.4)",
                boxShadow: "0 4px 20px rgba(139,105,20,0.4)",
              }}
            >
              Get Started with Free Plan
            </Button>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto px-4 pb-12">
          <div
            className="p-6 rounded-xl text-center"
            style={{
              background: "rgba(61,43,24,0.5)",
              border: "1px solid rgba(212,167,106,0.15)",
            }}
          >
            <Swords className="w-10 h-10 mx-auto mb-3" style={{ color: "#d4a76a" }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#f0d090" }}>Real-Time Multiplayer</h3>
            <p className="text-sm" style={{ color: "#8d6e63" }}>Challenge friends and play together in real-time with instant moves.</p>
          </div>
          <div
            className="p-6 rounded-xl text-center"
            style={{
              background: "rgba(61,43,24,0.5)",
              border: "1px solid rgba(212,167,106,0.15)",
            }}
          >
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "#d4a76a" }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#f0d090" }}>Contact List</h3>
            <p className="text-sm" style={{ color: "#8d6e63" }}>Add friends, see who's online, and challenge them with one tap.</p>
          </div>
          <div
            className="p-6 rounded-xl text-center"
            style={{
              background: "rgba(61,43,24,0.5)",
              border: "1px solid rgba(212,167,106,0.15)",
            }}
          >
            <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: "#d4a76a" }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#f0d090" }}>Beautiful Board</h3>
            <p className="text-sm" style={{ color: "#8d6e63" }}>Enjoy a stunning 3D wooden board with animated marbles and smooth gameplay.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
