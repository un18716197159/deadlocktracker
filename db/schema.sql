-- Fallback: paste into the Neon SQL Editor if you do not want to use `npm run db:push`.
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  steam_id text NOT NULL UNIQUE,
  account_id integer NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cache_entries (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);
