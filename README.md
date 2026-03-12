# Album Collective (MVP)

Private Spotify-based shared music journal built with Next.js, Prisma, and NextAuth.

## MVP scope implemented

- App scaffold (Next.js App Router + TypeScript)
- Database schema (users/sessions/accounts + journal entries)
- Spotify auth (OAuth via NextAuth)
- Add-link flow (track/album/playlist URL -> Spotify metadata -> saved entry)
- Pages: Home, Catalog, Stats
- Vercel-ready structure

## Tech stack

- Next.js
- NextAuth (Spotify provider)
- Prisma
- PostgreSQL

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file and fill values:

```bash
cp .env.example .env.local
```

3. Configure Spotify app in [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):

- Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
- For production, also add your Vercel URL callback.

4. Apply Prisma migrations:

```bash
npx prisma migrate deploy
```

If you are creating schema changes locally, use:

```bash
npx prisma migrate dev
```

5. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Spotify local setup

1. In `.env.local`, set:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/album_collective?schema=public
```

2. In Spotify Developer Dashboard, add this Redirect URI:

`http://localhost:3000/api/auth/callback/spotify`

3. Restart the dev server after editing env vars.

4. This project uses Auth.js/NextAuth for Spotify login, not Supabase Auth.
Supabase dashboard auth provider settings are not required for Spotify sign-in in this codebase.

5. Keep hostnames consistent:
- If `NEXTAUTH_URL` is `http://localhost:3000`, register `http://localhost:3000/api/auth/callback/spotify` in Spotify.
- If `NEXTAUTH_URL` is `http://127.0.0.1:3000`, register `http://127.0.0.1:3000/api/auth/callback/spotify` in Spotify.
- Do not mix `localhost` and `127.0.0.1` across these settings.

## Local database setup (beginner-friendly)

Prisma is configured for `postgresql`, so `DATABASE_URL` must point to a Postgres database.

You can use either:
- Local Postgres on your machine
- Hosted Postgres (Neon, Supabase Postgres, Railway, etc.)

### Option A: local Postgres (recommended for development)

1. Install/start Postgres.
2. Create a database named `album_collective` (example: `createdb album_collective`).
3. Set this in `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/album_collective?schema=public
```

Replace `postgres:postgres` with your local username/password.

4. Run migrations:

```bash
npx prisma migrate deploy
```

If you want Prisma to generate a dev migration history on your machine instead:

```bash
npx prisma migrate dev
```

### Option B: hosted Postgres (including Supabase Postgres)

Use your provider's direct Postgres connection string in `.env.local`, for example:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/album_collective?schema=public
```

Where to get it:
- Supabase: Project Settings -> Database -> Connection string (URI)
- Neon: Project Dashboard -> Connection Details
- Railway: Postgres service -> Variables/Connect tab

Note: this app uses NextAuth + Prisma directly. It does not require Supabase Auth settings.

### Required env vars (local startup checklist)

All must be set in `.env.local`:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/album_collective?schema=public
```

If you see `?error=Callback` after Spotify sign-in, it usually means NextAuth callback reached your app, but Prisma failed to read/write session data because database connection failed.

## Data model

Main app model:

- `JournalEntry`
  - `spotifyType`: `TRACK | ALBUM | PLAYLIST`
  - `spotifyId`: Spotify object id
  - `title`, `subtitle`, `imageUrl`
  - `spotifyUrl`, `sourceUrl`
  - `notes`
  - `addedAt`

Auth/session models are the standard NextAuth Prisma models (`User`, `Account`, `Session`, `VerificationToken`).

## Routes

- `/` Home: sign-in state, add-link form, recent entries
- `/catalog` Catalog: all saved entries
- `/stats` Stats: entry counts and top artists/owners
- `/api/entries` GET/POST entries
- `/api/auth/[...nextauth]` NextAuth handlers

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add environment variables from `.env.example`.
4. Set a Postgres `DATABASE_URL` (Neon/Supabase/etc).
5. Run Prisma migration against production DB:

```bash
npx prisma migrate deploy
```

## Notes

- This MVP stores entries per authenticated user.
- Duplicate links are upserted per user (`userId + spotifyType + spotifyId`).
- If Spotify token expires, refresh is handled automatically using stored refresh token.
