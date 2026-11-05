import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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

export type User = typeof users.$inferSelect;
