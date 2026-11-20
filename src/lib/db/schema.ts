import { integer, jsonb, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

/** A person who signed in with Steam. account_id is the Steam32 id used by the Deadlock API. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  steamId: text("steam_id").notNull().unique(),
  accountId: integer("account_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Generic key/value cache for upstream Deadlock API responses. */
export const cacheEntries = pgTable("cache_entries", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Players a signed-in user saved ("favorites"). owner/player are Deadlock account ids. */
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  ownerAccountId: integer("owner_account_id").notNull(),
  playerAccountId: integer("player_account_id").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("favorites_owner_player").on(table.ownerAccountId, table.playerAccountId)]);

export type User = typeof users.$inferSelect;
