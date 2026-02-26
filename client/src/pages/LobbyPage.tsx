import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getSocket, connectSocket } from "@/lib/socket";
import { useLocation } from "wouter";
import { Users, Plus, LogOut, Gamepad2, Mail, Swords, Loader2 } from "lucide-react";
import type { Game } from "@shared/schema";

interface OnlineContact {
  id: string;
  displayName: string;
  email: string;
  profileImageUrl: string;
  isOnline: boolean;
}

export default function LobbyPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<OnlineContact[]>([]);
  const [activeGames, setActiveGames] = useState<(Game & { player1Name: string; player2Name: string })[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<{ gameId: string; fromName: string } | null>(null);

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
    : user?.email?.split("@")[0] || "Player";

  useEffect(() => {
    if (!user) return;
    const socket = connectSocket();

    socket.on("connect", () => {
      socket.emit("get_contacts");
      socket.emit("get_active_games");
    });

    if (socket.connected) {
      socket.emit("get_contacts");
      socket.emit("get_active_games");
    }

    socket.on("contacts_list", (data: OnlineContact[]) => setContacts(data));
    socket.on("active_games", (data: any[]) => setActiveGames(data));
    socket.on("game_created", () => {
      toast({ title: "Invite sent!", description: "Waiting for your opponent to accept..." });
    });
    socket.on("game_invite", (data: { gameId: string; fromName: string }) => {
      setIncomingInvite(data);
    });
    socket.on("game_started", (data: { gameId: string }) => {
      setPendingInvite(null);
      navigate(`/game/${data.gameId}`);
    });
    socket.on("contact_added", () => {
      socket.emit("get_contacts");
      toast({ title: "Contact added!" });
    });
    socket.on("contact_status_changed", (data: { contactUserId: string; isOnline: boolean }) => {
      setContacts(prev => prev.map(c =>
        c.id === data.contactUserId ? { ...c, isOnline: data.isOnline } : c
      ));
    });
    socket.on("error", (data: { message: string }) => {
      toast({ title: "Error", description: data.message, variant: "destructive" });
      setPendingInvite(null);
    });

    socket.on("invite_declined", () => {
      setPendingInvite(null);
      toast({ title: "Invite declined", description: "Your opponent declined the invitation." });
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    return () => {
      socket.off("contacts_list");
      socket.off("active_games");
      socket.off("game_created");
      socket.off("game_invite");
      socket.off("game_started");
      socket.off("contact_added");
      socket.off("contact_status_changed");
      socket.off("invite_declined");
      socket.off("error");
      socket.off("connect");
      socket.off("connect_error");
    };
  }, [user, navigate, toast]);

  const handleAddContact = () => {
    if (!contactEmail) return;
    const socket = getSocket();
    socket.emit("add_contact", { email: contactEmail });
    setContactEmail("");
    setShowAddContact(false);
  };

  const handleInvite = (contactId: string) => {
    setPendingInvite(contactId);
    const socket = getSocket();
    socket.emit("create_game", { opponentId: contactId });
  };

  const handleAcceptInvite = () => {
    if (!incomingInvite) return;
    const socket = getSocket();
    socket.emit("join_game", { gameId: incomingInvite.gameId });
    setIncomingInvite(null);
  };

  const handleResumeGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  if (!user) return null;

  return (
    <div
      className="min-h-screen p-4"
      style={{
        background: "linear-gradient(135deg, #1a0f07 0%, #2c1a0e 30%, #3d2b18 60%, #1a0f07 100%)",
      }}
    >
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            {user.profileImageUrl && (
              <img
                src={user.profileImageUrl}
                alt=""
                className="w-10 h-10 rounded-full"
                style={{ border: "2px solid rgba(212,167,106,0.3)" }}
              />
            )}
            <div>
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
              <p className="text-sm" style={{ color: "#8d6e63" }}>
                Welcome, {displayName}
              </p>
            </div>
          </div>
          <a href="/api/logout">
            <Button
              data-testid="button-logout"
              variant="ghost"
              size="icon"
              className="no-default-hover-elevate no-default-active-elevate"
              style={{ color: "#8d6e63" }}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </a>
        </motion.div>

        <AnimatePresence>
          {incomingInvite && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-4 rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(139,105,20,0.4), rgba(80,55,30,0.6))",
                border: "1px solid rgba(251,191,36,0.4)",
              }}
            >
              <div className="flex items-center gap-3">
                <Swords className="w-6 h-6" style={{ color: "#fbbf24" }} />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: "#f0d090" }}>
                    {incomingInvite.fromName} challenges you!
                  </p>
                </div>
                <Button
                  data-testid="button-accept-invite"
                  size="sm"
                  onClick={handleAcceptInvite}
                  style={{ background: "#8B6914", color: "#f0d090" }}
                >
                  Accept
                </Button>
                <Button
                  data-testid="button-decline-invite"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const socket = getSocket();
                    socket.emit("decline_invite", { gameId: incomingInvite?.gameId });
                    setIncomingInvite(null);
                  }}
                  style={{ color: "#8d6e63" }}
                  className="no-default-hover-elevate no-default-active-elevate"
                >
                  Decline
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeGames.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 className="w-4 h-4" style={{ color: "#d4a76a" }} />
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d4a76a" }}>
                Active Games
              </h2>
            </div>
            <div className="space-y-2">
              {activeGames.map((game) => (
                <motion.button
                  key={game.id}
                  data-testid={`game-${game.id}`}
                  onClick={() => handleResumeGame(game.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full p-3 rounded-xl text-left transition-all"
                  style={{
                    background: "rgba(60,40,20,0.6)",
                    border: "1px solid rgba(139,90,43,0.2)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#f0d090" }}>
                        {game.player1Name} vs {game.player2Name}
                      </p>
                      <p className="text-xs" style={{ color: "#8d6e63" }}>
                        Score: {(game.scores as [number, number])[0]} - {(game.scores as [number, number])[1]}
                      </p>
                    </div>
                    <Swords className="w-4 h-4" style={{ color: "#8d6e63" }} />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: "#d4a76a" }} />
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#d4a76a" }}>
                Players Contact List
              </h2>
            </div>
            <Button
              data-testid="button-add-contact"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddContact(!showAddContact)}
              className="no-default-hover-elevate no-default-active-elevate"
              style={{ color: "#d4a76a" }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          <AnimatePresence>
            {showAddContact && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 p-3 rounded-xl"
                style={{
                  background: "rgba(60,40,20,0.6)",
                  border: "1px solid rgba(139,90,43,0.2)",
                }}
              >
                <div className="space-y-2">
                  <Input
                    data-testid="input-contact-email"
                    placeholder="Friend's email address"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
                    className="border-0"
                    style={{ background: "rgba(30,20,10,0.6)", color: "#f0d090" }}
                  />
                  <Button
                    data-testid="button-save-contact"
                    size="sm"
                    onClick={handleAddContact}
                    className="w-full"
                    style={{ background: "#8B6914", color: "#f0d090" }}
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Add Contact
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {contacts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "#8d6e63" }} />
                <p className="text-sm" style={{ color: "#8d6e63" }}>
                  No contacts yet. Add friends by their email!
                </p>
              </motion.div>
            ) : (
              contacts.map((contact, i) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background: "rgba(60,40,20,0.5)",
                    border: "1px solid rgba(139,90,43,0.15)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    {contact.profileImageUrl ? (
                      <img
                        src={contact.profileImageUrl}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: "linear-gradient(135deg, #8B6914, #6B4E12)",
                          color: "#f0d090",
                        }}
                      >
                        {contact.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#f0d090" }}>
                        {contact.displayName}
                      </p>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: contact.isOnline ? "#4ade80" : "#6b7280" }}
                        />
                        <span className="text-xs" style={{ color: "#8d6e63" }}>
                          {contact.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    data-testid={`button-invite-${contact.id}`}
                    size="sm"
                    disabled={!contact.isOnline || pendingInvite === contact.id}
                    onClick={() => handleInvite(contact.id)}
                    style={{
                      background: contact.isOnline ? "#8B6914" : "rgba(60,40,20,0.5)",
                      color: contact.isOnline ? "#f0d090" : "#5d4037",
                    }}
                  >
                    {pendingInvite === contact.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Swords className="w-4 h-4" />
                    )}
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
      <div
        className="fixed bottom-2 right-2 text-xs select-none"
        style={{ color: "rgba(140,110,80,0.4)", fontFamily: "monospace" }}
        data-testid="text-app-version"
      >
        v2.1.0-seeds
      </div>
    </div>
  );
}
