import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { phoneNumber, pin }
        : { phoneNumber, displayName, pin };
      
      const res = await apiRequest("POST", endpoint, body);
      const user = await res.json();
      setUser(user);
      toast({ title: mode === "login" ? "Welcome back!" : "Account created!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #1a0f07 0%, #2c1a0e 30%, #3d2b18 60%, #1a0f07 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h1
              className="text-5xl font-bold mb-2 tracking-tight"
              style={{
                background: "linear-gradient(135deg, #d4a76a, #f0d090, #c4944a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "none",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}
            >
              Ayo Olopon
            </h1>
            <p className="text-sm" style={{ color: "#a1887f" }}>
              The ancient game of strategy
            </p>
          </motion.div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: "linear-gradient(145deg, rgba(80,55,30,0.8), rgba(50,35,18,0.9))",
            border: "1px solid rgba(139,90,43,0.3)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex mb-6 rounded-lg overflow-hidden" style={{ background: "rgba(30,20,10,0.5)" }}>
            <button
              data-testid="tab-login"
              onClick={() => setMode("login")}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                mode === "login" ? "rounded-lg" : ""
              }`}
              style={{
                background: mode === "login" ? "rgba(139,90,43,0.5)" : "transparent",
                color: mode === "login" ? "#f0d090" : "#8d6e63",
              }}
            >
              Sign In
            </button>
            <button
              data-testid="tab-register"
              onClick={() => setMode("register")}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                mode === "register" ? "rounded-lg" : ""
              }`}
              style={{
                background: mode === "register" ? "rgba(139,90,43,0.5)" : "transparent",
                color: mode === "register" ? "#f0d090" : "#8d6e63",
              }}
            >
              Register
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="phone" style={{ color: "#d4a76a" }}>Phone Number</Label>
                <Input
                  data-testid="input-phone"
                  id="phone"
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="border-0"
                  style={{
                    background: "rgba(30,20,10,0.6)",
                    color: "#f0d090",
                  }}
                />
              </div>

              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="name" style={{ color: "#d4a76a" }}>Display Name</Label>
                  <Input
                    data-testid="input-name"
                    id="name"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="border-0"
                    style={{
                      background: "rgba(30,20,10,0.6)",
                      color: "#f0d090",
                    }}
                  />
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="pin" style={{ color: "#d4a76a" }}>4-Digit PIN</Label>
                <Input
                  data-testid="input-pin"
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="****"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                  className="border-0 tracking-[0.5em] text-center"
                  style={{
                    background: "rgba(30,20,10,0.6)",
                    color: "#f0d090",
                  }}
                />
              </div>

              <Button
                data-testid="button-submit"
                type="submit"
                disabled={loading || pin.length !== 4}
                className="w-full font-semibold text-base border-0"
                style={{
                  background: "linear-gradient(135deg, #8B6914, #6B4E12)",
                  color: "#f0d090",
                }}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-5 h-5 border-2 rounded-full"
                    style={{ borderColor: "#f0d090", borderTopColor: "transparent" }}
                  />
                ) : mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </motion.form>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
              className="w-3 h-3 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 30%, #d4d4d8, #71717a)",
                boxShadow: "inset -1px -1px 2px rgba(0,0,0,0.3), 1px 1px 2px rgba(0,0,0,0.2)",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
