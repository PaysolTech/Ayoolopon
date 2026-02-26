import type { Express } from "express";
import { type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { setupAuth, registerAuthRoutes, getSession } from "./replit_integrations/auth";
import { storage } from "./storage";
import { contacts as contactsTable } from "@shared/schema";
import { isValidMove, makeMove, checkGameOver, hasSeeds, getValidMoves } from "./gameLogic";
import { db } from "./db";
import passport from "passport";

const userSockets = new Map<string, string>();
const pendingInvites = new Map<string, { gameId: string; fromId: string; toId: string }>();

function getUserName(user: any): string {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  if (user.email) return user.email.split("@")[0];
  return "Player";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ message: "Email required" });
    const user = await storage.searchUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });
    const userId = (req.user as any).claims.sub;
    if (user.id === userId) return res.status(400).json({ message: "Cannot add yourself" });
    return res.json({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, profileImageUrl: user.profileImageUrl });
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  const sessionMiddleware = getSession();
  io.engine.use(sessionMiddleware);
  io.engine.use(passport.initialize());
  io.engine.use(passport.session());

  io.engine.on("connection_error", (err: any) => {
    console.log("[socket] engine connection_error:", err.message, err.code);
  });

  io.use(async (socket, next) => {
    const req = socket.request as any;
    const user = req.user;
    console.log("[socket] auth middleware - user:", user ? `${user.claims?.sub}` : "none");
    if (!user || !user.claims?.sub) {
      console.log("[socket] auth rejected - no user/claims");
      return next(new Error("Authentication required"));
    }
    (socket as any).userId = user.claims.sub;
    return next();
  });

  async function broadcastOnlineStatus(userId: string, isOnline: boolean) {
    const allContacts = await db.select().from(contactsTable);
    for (const contact of allContacts) {
      if (contact.contactUserId === userId) {
        const ownerSocketId = userSockets.get(contact.userId);
        if (ownerSocketId) {
          io.to(ownerSocketId).emit("contact_status_changed", {
            contactUserId: userId,
            isOnline,
          });
        }
      }
    }
  }

  io.on("connection", async (socket) => {
    const userId = (socket as any).userId as string;
    console.log(`[socket] connected: userId=${userId}, socketId=${socket.id}`);

    userSockets.set(userId, socket.id);
    await broadcastOnlineStatus(userId, true);

    socket.on("get_contacts", async () => {
      try {
        const contactsList = await storage.getContacts(userId);
        const mapped = contactsList.map(c => ({
          id: c.user.id,
          displayName: getUserName(c.user),
          email: c.user.email || "",
          profileImageUrl: c.user.profileImageUrl || "",
          isOnline: userSockets.has(c.user.id),
        }));
        socket.emit("contacts_list", mapped);
      } catch (err: any) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("add_contact", async (data: { email: string }) => {
      try {
        const contactUser = await storage.searchUserByEmail(data.email);
        if (!contactUser) {
          socket.emit("error", { message: "No user found with that email. They need to sign in first." });
          return;
        }
        if (contactUser.id === userId) {
          socket.emit("error", { message: "You can't add yourself." });
          return;
        }
        const existing = await storage.getContacts(userId);
        if (existing.some(c => c.user.id === contactUser.id)) {
          socket.emit("error", { message: "This person is already in your contacts." });
          return;
        }
        await storage.addContact(userId, contactUser.id);
        socket.emit("contact_added");
      } catch (err: any) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("get_active_games", async () => {
      try {
        const gamesList = await storage.getActiveGames(userId);
        const enriched = await Promise.all(gamesList.map(async (g) => {
          const p1 = await storage.getUser(g.player1Id);
          const p2 = g.player2Id ? await storage.getUser(g.player2Id) : null;
          return {
            ...g,
            player1Name: p1 ? getUserName(p1) : "Player 1",
            player2Name: p2 ? getUserName(p2) : "Waiting...",
          };
        }));
        socket.emit("active_games", enriched);
      } catch (err: any) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("create_game", async (data: { opponentId: string }) => {
      try {
        if (!data.opponentId) {
          socket.emit("error", { message: "Invalid opponent" });
          return;
        }

        const opponent = await storage.getUser(data.opponentId);
        if (!opponent) {
          socket.emit("error", { message: "Opponent not found." });
          return;
        }

        const game = await storage.createGame(userId);

        pendingInvites.set(game.id, {
          gameId: game.id,
          fromId: userId,
          toId: data.opponentId,
        });

        const opponentSocketId = userSockets.get(data.opponentId);
        if (opponentSocketId) {
          const fromUser = await storage.getUser(userId);
          io.to(opponentSocketId).emit("game_invite", {
            gameId: game.id,
            fromName: fromUser ? getUserName(fromUser) : "Someone",
          });
        }

        socket.emit("game_created", { gameId: game.id });
      } catch (err: any) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("join_game", async (data: { gameId: string }) => {
      try {
        const game = await storage.getGame(data.gameId);
        if (!game) {
          socket.emit("error", { message: "Game not found" });
          return;
        }

        const invite = pendingInvites.get(data.gameId);
        if (!invite || invite.toId !== userId) {
          socket.emit("error", { message: "No valid invite" });
          return;
        }

        await storage.updateGame(data.gameId, {
          player2Id: userId,
          status: "paused",
        });

        pendingInvites.delete(data.gameId);

        socket.join(data.gameId);
        socket.emit("game_started", { gameId: data.gameId });

        const p1SocketId = userSockets.get(game.player1Id);
        if (p1SocketId) {
          io.to(p1SocketId).emit("game_started", { gameId: data.gameId });
        }
      } catch (err: any) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("decline_invite", async (data: { gameId: string }) => {
      const invite = pendingInvites.get(data.gameId);
      if (invite && invite.toId === userId) {
        pendingInvites.delete(data.gameId);
        await storage.updateGame(data.gameId, { status: "completed" });

        const fromSocketId = userSockets.get(invite.fromId);
        if (fromSocketId) {
          io.to(fromSocketId).emit("invite_declined", { gameId: data.gameId });
        }
      }
    });

    socket.on("join_game_room", async (data: { gameId: string }) => {
      try {
        socket.join(data.gameId);
        const game = await storage.getGame(data.gameId);
        if (!game) {
          socket.emit("error", { message: "Game not found" });
          return;
        }

        if (game.player1Id !== userId && game.player2Id !== userId) {
          socket.emit("error", { message: "Not a participant" });
          return;
        }

        const p1 = await storage.getUser(game.player1Id);
        const p2 = game.player2Id ? await storage.getUser(game.player2Id) : null;

        const myPlayerIndex = game.player1Id === userId ? 0 : game.player2Id === userId ? 1 : -1;
        console.log(`[game_state] userId=${userId}, game.player1Id=${game.player1Id}, game.player2Id=${game.player2Id}, currentPlayer=${game.currentPlayer}, myPlayerIndex=${myPlayerIndex}`);

        socket.emit("game_state", {
          id: game.id,
          board: game.board,
          scores: game.scores,
          currentPlayer: game.currentPlayer,
          status: game.status,
          player1Id: game.player1Id,
          player2Id: game.player2Id,
          player1Name: p1 ? getUserName(p1) : "Player 1",
          player2Name: p2 ? getUserName(p2) : "Player 2",
          winnerId: game.winnerId,
          boardClosed: game.status === "paused",
          myPlayerIndex,
        });
      } catch (err: any) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("leave_game_room", (data: { gameId: string }) => {
      socket.leave(data.gameId);
    });

    socket.on("make_move", async (data: { gameId: string; pitIndex: number }) => {
      try {
        const game = await storage.getGame(data.gameId);
        if (!game || game.status !== "active") {
          socket.emit("error", { message: "Game not active" });
          return;
        }

        const playerIndex = game.player1Id === userId ? 0 : game.player2Id === userId ? 1 : -1;
        if (playerIndex === -1 || game.currentPlayer !== playerIndex) {
          socket.emit("error", { message: "Not your turn" });
          return;
        }

        const board = game.board as number[];
        if (!isValidMove(board, data.pitIndex, playerIndex)) {
          socket.emit("error", { message: "Invalid move" });
          return;
        }

        const { newBoard, captured } = makeMove(board, data.pitIndex, playerIndex);
        const newScores: [number, number] = [...(game.scores as [number, number])] as [number, number];
        newScores[playerIndex] += captured;

        const nextPlayer = playerIndex === 0 ? 1 : 0;
        const gameResult = checkGameOver(newBoard, newScores);

        let winnerId: string | null = null;
        let status = "active";
        const finalBoard = [...newBoard];

        if (gameResult.reached25) {
          await storage.updateGame(data.gameId, {
            board: finalBoard,
            scores: newScores,
            currentPlayer: nextPlayer,
          });

          const moveResult = {
            board: finalBoard,
            scores: newScores,
            currentPlayer: nextPlayer,
            status: "active",
            winnerId: null,
            previousBoard: board,
            pitIndex: data.pitIndex,
            movedByPlayer: playerIndex,
          };
          io.to(data.gameId).emit("move_made", moveResult);

          const reachedPlayer = gameResult.winner === 0 ? game.player1Id : game.player2Id;
          const reachedName = gameResult.winner === 0
            ? (await storage.getUser(game.player1Id))
            : (await storage.getUser(game.player2Id!));
          io.to(data.gameId).emit("reached_25", {
            gameId: data.gameId,
            playerIndex: gameResult.winner,
            playerName: reachedName ? getUserName(reachedName) : "A player",
            scores: newScores,
          });
        } else if (gameResult.isOver) {
          status = "completed";
          if (gameResult.winner === 0) winnerId = game.player1Id;
          else if (gameResult.winner === 1) winnerId = game.player2Id;

          await storage.updateGame(data.gameId, {
            board: finalBoard,
            scores: newScores,
            currentPlayer: nextPlayer,
            status,
            winnerId,
          });

          const moveResult = {
            board: finalBoard,
            scores: newScores,
            currentPlayer: nextPlayer,
            status,
            winnerId,
            previousBoard: board,
            pitIndex: data.pitIndex,
            movedByPlayer: playerIndex,
          };
          io.to(data.gameId).emit("move_made", moveResult);
        } else {
          const nextPlayerMoves = getValidMoves(finalBoard, nextPlayer);
          if (nextPlayerMoves.length === 0) {
            status = "completed";
            const remaining = finalBoard.reduce((a, b) => a + b, 0);
            newScores[playerIndex] += remaining;
            for (let i = 0; i < 12; i++) finalBoard[i] = 0;
            if (newScores[0] > newScores[1]) winnerId = game.player1Id;
            else if (newScores[1] > newScores[0]) winnerId = game.player2Id;
          }

          await storage.updateGame(data.gameId, {
            board: finalBoard,
            scores: newScores,
            currentPlayer: nextPlayer,
            status,
            winnerId,
          });

          const moveResult = {
            board: finalBoard,
            scores: newScores,
            currentPlayer: nextPlayer,
            status,
            winnerId,
            previousBoard: board,
            pitIndex: data.pitIndex,
            movedByPlayer: playerIndex,
          };
          io.to(data.gameId).emit("move_made", moveResult);
        }
      } catch (err: any) {
        socket.emit("error", { message: err.message });
      }
    });

    socket.on("save_game", async (data: { gameId: string }) => {
      try {
        const game = await storage.getGame(data.gameId);
        if (!game) { socket.emit("error", { message: "Game not found" }); return; }
        if (game.player1Id !== userId && game.player2Id !== userId) { socket.emit("error", { message: "Not a participant" }); return; }
        if (game.status === "active") {
          await storage.updateGame(data.gameId, { status: "paused" });
        }
        const p1 = await storage.getUser(game.player1Id);
        const p2 = game.player2Id ? await storage.getUser(game.player2Id) : null;
        io.to(data.gameId).emit("game_state", {
          id: game.id, board: game.board, scores: game.scores, currentPlayer: game.currentPlayer,
          status: "paused", player1Id: game.player1Id, player2Id: game.player2Id,
          player1Name: p1 ? getUserName(p1) : "Player 1", player2Name: p2 ? getUserName(p2) : "Player 2",
          winnerId: game.winnerId,
          boardClosed: true,
        });
        socket.emit("game_saved", { gameId: data.gameId });
      } catch (err: any) { socket.emit("error", { message: err.message }); }
    });

    socket.on("get_saved_games", async () => {
      try {
        const gamesList = await storage.getSavedGames(userId);
        const enriched = await Promise.all(gamesList.map(async (g) => {
          const p1 = await storage.getUser(g.player1Id);
          const p2 = g.player2Id ? await storage.getUser(g.player2Id) : null;
          return {
            ...g,
            player1Name: p1 ? getUserName(p1) : "Player 1",
            player2Name: p2 ? getUserName(p2) : "Waiting...",
          };
        }));
        socket.emit("saved_games", enriched);
      } catch (err: any) { socket.emit("error", { message: err.message }); }
    });

    socket.on("resume_game", async (data: { gameId: string }) => {
      try {
        const game = await storage.getGame(data.gameId);
        if (!game) { socket.emit("error", { message: "Game not found" }); return; }
        if (game.player1Id !== userId && game.player2Id !== userId) { socket.emit("error", { message: "Not a participant" }); return; }
        const isNewGame = game.board.every((v: number) => v === 4) && game.scores[0] === 0 && game.scores[1] === 0;
        const openerIndex = game.player1Id === userId ? 0 : 1;
        const newCurrentPlayer = isNewGame ? openerIndex : game.currentPlayer;
        if (game.status === "paused") {
          await storage.updateGame(data.gameId, { status: "active", currentPlayer: newCurrentPlayer });
        }
        const p1 = await storage.getUser(game.player1Id);
        const p2 = game.player2Id ? await storage.getUser(game.player2Id) : null;
        const emitState = (targetSocket: any) => {
          const targetUserId = targetSocket === socket ? userId : (game.player1Id === userId ? game.player2Id : game.player1Id);
          const myIdx = game.player1Id === targetUserId ? 0 : game.player2Id === targetUserId ? 1 : -1;
          targetSocket.emit("game_state", {
            id: game.id,
            board: game.board,
            scores: game.scores,
            currentPlayer: newCurrentPlayer,
            status: "active",
            player1Id: game.player1Id,
            player2Id: game.player2Id,
            player1Name: p1 ? getUserName(p1) : "Player 1",
            player2Name: p2 ? getUserName(p2) : "Player 2",
            winnerId: game.winnerId,
            boardClosed: false,
            myPlayerIndex: myIdx,
          });
        };
        emitState(socket);
        const otherPlayerId = game.player1Id === userId ? game.player2Id : game.player1Id;
        if (otherPlayerId) {
          const otherSocketId = userSockets.get(otherPlayerId);
          if (otherSocketId) {
            emitState(io.to(otherSocketId));
          }
        }
        socket.emit("game_resumed", { gameId: data.gameId });
      } catch (err: any) { socket.emit("error", { message: err.message }); }
    });

    socket.on("pause_game", async (data: { gameId: string }) => {
      try {
        const game = await storage.getGame(data.gameId);
        if (!game) { socket.emit("error", { message: "Game not found" }); return; }
        if (game.player1Id !== userId && game.player2Id !== userId) { socket.emit("error", { message: "Not a participant" }); return; }
        if (game.status !== "active") { socket.emit("error", { message: "Game is not active" }); return; }
        await storage.updateGame(data.gameId, { status: "paused" });
        const p1 = await storage.getUser(game.player1Id);
        const p2 = game.player2Id ? await storage.getUser(game.player2Id) : null;
        const state = {
          id: game.id,
          board: game.board,
          scores: game.scores,
          currentPlayer: game.currentPlayer,
          status: "paused",
          player1Id: game.player1Id,
          player2Id: game.player2Id,
          player1Name: p1 ? getUserName(p1) : "Player 1",
          player2Name: p2 ? getUserName(p2) : "Player 2",
          winnerId: game.winnerId,
          boardClosed: true,
        };
        io.to(data.gameId).emit("game_state", state);
      } catch (err: any) { socket.emit("error", { message: err.message }); }
    });

    socket.on("close_game", async (data: { gameId: string }) => {
      try {
        const game = await storage.getGame(data.gameId);
        if (!game) { socket.emit("error", { message: "Game not found" }); return; }
        if (game.player1Id !== userId && game.player2Id !== userId) { socket.emit("error", { message: "Not a participant" }); return; }
        if (game.status === "active") {
          await storage.updateGame(data.gameId, { status: "paused" });
        }
        const p1 = await storage.getUser(game.player1Id);
        const p2 = game.player2Id ? await storage.getUser(game.player2Id) : null;
        io.to(data.gameId).emit("game_state", {
          id: game.id,
          board: game.board,
          scores: game.scores,
          currentPlayer: game.currentPlayer,
          status: "paused",
          player1Id: game.player1Id,
          player2Id: game.player2Id,
          player1Name: p1 ? getUserName(p1) : "Player 1",
          player2Name: p2 ? getUserName(p2) : "Player 2",
          winnerId: game.winnerId,
          boardClosed: true,
        });
      } catch (err: any) { socket.emit("error", { message: err.message }); }
    });

    socket.on("end_game", async (data: { gameId: string }) => {
      try {
        const game = await storage.getGame(data.gameId);
        if (!game) { socket.emit("error", { message: "Game not found" }); return; }
        if (game.player1Id !== userId && game.player2Id !== userId) { socket.emit("error", { message: "Not a participant" }); return; }

        const board = game.board as number[];
        const scores = [...(game.scores as [number, number])] as [number, number];
        for (let i = 0; i < 6; i++) { scores[0] += board[i]; board[i] = 0; }
        for (let i = 6; i < 12; i++) { scores[1] += board[i]; board[i] = 0; }

        let winnerId: string | null = null;
        if (scores[0] > scores[1]) winnerId = game.player1Id;
        else if (scores[1] > scores[0]) winnerId = game.player2Id;

        await storage.updateGame(data.gameId, { board, scores, status: "completed", winnerId });
        const p1 = await storage.getUser(game.player1Id);
        const p2 = game.player2Id ? await storage.getUser(game.player2Id) : null;
        io.to(data.gameId).emit("game_state", {
          id: game.id, board, scores, currentPlayer: game.currentPlayer, status: "completed",
          player1Id: game.player1Id, player2Id: game.player2Id,
          player1Name: p1 ? getUserName(p1) : "Player 1", player2Name: p2 ? getUserName(p2) : "Player 2",
          winnerId,
          boardClosed: false,
        });
      } catch (err: any) { socket.emit("error", { message: err.message }); }
    });

    socket.on("reset_game", async (data: { gameId: string }) => {
      try {
        const game = await storage.getGame(data.gameId);
        if (!game) { socket.emit("error", { message: "Game not found" }); return; }
        if (game.player1Id !== userId && game.player2Id !== userId) { socket.emit("error", { message: "Not a participant" }); return; }

        const newBoard = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
        const newScores: [number, number] = [0, 0];
        await storage.updateGame(data.gameId, { board: newBoard, scores: newScores, currentPlayer: 0, status: "active", winnerId: null });
        const p1 = await storage.getUser(game.player1Id);
        const p2 = game.player2Id ? await storage.getUser(game.player2Id) : null;
        io.to(data.gameId).emit("game_state", {
          id: game.id, board: newBoard, scores: newScores, currentPlayer: 0, status: "active",
          player1Id: game.player1Id, player2Id: game.player2Id,
          player1Name: p1 ? getUserName(p1) : "Player 1", player2Name: p2 ? getUserName(p2) : "Player 2",
          winnerId: null,
          boardClosed: false,
        });
      } catch (err: any) { socket.emit("error", { message: err.message }); }
    });

    socket.on("disconnect", async () => {
      userSockets.delete(userId);
      await broadcastOnlineStatus(userId, false);
    });
  });

  return httpServer;
}
