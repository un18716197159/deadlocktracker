
Eg byrja med å leite etter informasjon og referansar til nettsida mi. Målet med nettsida er å vise statistikk frå spelet Deadlock.

Eg brukte https://statlocker.gg som ein referanse for design og funksjonar.

For å finne informasjon om spelarar og statistikk undersøkte eg dei opne kjeldene til Deadlock API.

---

## Setup (Deadlock Tracker)

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run db:push              # creates users, cache_entries and favorites tables
npm run icons:sync           # downloads the current in-game item icons into public/item-icons (run again after game updates)
npm run dev
```

Environment variables (set the same ones in Vercel → Settings → Environment Variables, for Production **and** Preview/Development):

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `SESSION_SECRET` | Random string, at least 32 characters (signs the login cookie) |
| `DEADLOCK_API_KEY` | Optional. Raises Deadlock API rate limits |

Never commit `.env*` files or paste these values into chats or issues.

While developing, `/api/debug/shape` and `/api/debug/item` show what the Deadlock API really returns (disabled in production).
