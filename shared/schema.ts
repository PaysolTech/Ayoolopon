import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

import { users } from "./models/auth";

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contactUserId: varchar("contact_user_id").notNull().references(() => users.id),
});

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  player1Id: varchar("player1_id").notNull().references(() => users.id),
  player2Id: varchar("player2_id").references(() => users.id),
  board: jsonb("board").notNull().$type<number[]>(),
  scores: jsonb("scores").notNull().$type<[number, number]>(),
  currentPlayer: integer("current_player").notNull().default(0),
  status: text("status").notNull().default("waiting"),
  winnerId: varchar("winner_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertGameSchema = createInsertSchema(games).omit({ id: true, createdAt: true });

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export const INITIAL_BOARD = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
export const INITIAL_SCORES: [number, number] = [0, 0];
