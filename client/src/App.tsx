import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "@/pages/LandingPage";
import LobbyPage from "@/pages/LobbyPage";
import GamePage from "@/pages/GamePage";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #1a0f07 0%, #2c1a0e 30%, #3d2b18 60%, #1a0f07 100%)" }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#d4a76a" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <Switch>
      <Route path="/" component={LobbyPage} />
      <Route path="/lobby" component={LobbyPage} />
      <Route path="/game/:id" component={GamePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
