import { eq, and, or } from "drizzle-orm";
import { db } from "./db";
import { contacts, games, type Contact, type InsertContact, type Game, INITIAL_BOARD, INITIAL_SCORES } from "@shared/schema";
import { users, type User } from "@shared/models/auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  searchUserByEmail(email: string): Promise<User | undefined>;

  addContact(userId: string, contactUserId: string): Promise<Contact>;
  getContacts(userId: string): Promise<{ contact: Contact; user: User }[]>;
  removeContact(userId: string, contactUserId: string): Promise<void>;

  createGame(player1Id: string): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined>;
  getActiveGames(userId: string): Promise<Game[]>;
  getSavedGames(userId: string): Promise<Game[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async searchUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async addContact(userId: string, contactUserId: string): Promise<Contact> {
    const [created] = await db.insert(contacts).values({
      userId,
      contactUserId,
    }).returning();
    return created;
  }

  async getContacts(userId: string): Promise<{ contact: Contact; user: User }[]> {
    const userContacts = await db.select().from(contacts).where(eq(contacts.userId, userId));
    const result: { contact: Contact; user: User }[] = [];
    for (const c of userContacts) {
      const [contactUser] = await db.select().from(users).where(eq(users.id, c.contactUserId));
      if (contactUser) {
        result.push({ contact: c, user: contactUser });
      }
    }
    return result;
  }

  async removeContact(userId: string, contactUserId: string): Promise<void> {
    await db.delete(contacts).where(
      and(eq(contacts.userId, userId), eq(contacts.contactUserId, contactUserId))
    );
  }

  async createGame(player1Id: string): Promise<Game> {
    const [game] = await db.insert(games).values({
      player1Id,
      player2Id: null,
      board: INITIAL_BOARD,
      scores: INITIAL_SCORES,
      currentPlayer: 0,
      status: "waiting",
      winnerId: null,
    }).returning();
    return game;
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined> {
    const [updated] = await db.update(games).set(updates).where(eq(games.id, id)).returning();
    return updated;
  }

  async getActiveGames(userId: string): Promise<Game[]> {
    return db.select().from(games).where(
      and(
        or(eq(games.player1Id, userId), eq(games.player2Id, userId)),
        or(eq(games.status, "active"), eq(games.status, "waiting"), eq(games.status, "paused"))
      )
    );
  }

  async getSavedGames(userId: string): Promise<Game[]> {
    return db.select().from(games).where(
      and(
        or(eq(games.player1Id, userId), eq(games.player2Id, userId)),
        or(eq(games.status, "active"), eq(games.status, "paused"))
      )
    );
  }
}

export const storage = new DatabaseStorage();
