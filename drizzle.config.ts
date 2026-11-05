import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local by itself.
(process as unknown as { loadEnvFile?: (path: string) => void }).loadEnvFile?.(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
