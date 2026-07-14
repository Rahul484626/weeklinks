# Weeklinks

Personal AI video topic tracker with Google sign-in and Google Drive integration.

## Features

- **Continue with Google** login (optional allow-list via `ALLOWED_EMAIL`)
- Topic to-do list auto-discovered from Drive folders
- Hybrid overrides: rename, hide, reorder, and mark complete in the app without changing Drive
- Per-topic file manager: list, download, upload, and edit plain-text scripts in Drive

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Auth.js v5 (NextAuth) with Google provider + Drive scope
- Supabase Postgres via `@supabase/supabase-js` (no Prisma)
- `@auth/supabase-adapter` for login/account storage
- Google Drive API v3

## 1. Google Cloud setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Drive API**.
3. Configure the OAuth consent screen (External is fine for personal use).
4. Add yourself as a **test user** while the app is in Testing mode.
5. Create **OAuth 2.0 Client ID** → Application type **Web application**.
6. Authorized redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://YOUR_DOMAIN/api/auth/callback/google`
7. Copy the Client ID and Client Secret.

Requested scopes (handled by the app):

- `openid`, `email`, `profile`
- `https://www.googleapis.com/auth/drive`

## 2. Supabase setup

### API keys

Supabase Dashboard → **Project Settings → API**:

| Variable | Where |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only, never expose to browser) |

### Database schema

1. Open **SQL Editor** in Supabase
2. Paste and run [`supabase/schema.sql`](supabase/schema.sql)
3. **Required:** Expose `next_auth` to the Data API — pick **one** method:
   - **Dashboard (recommended):** Project Settings → **Data API** → **Exposed schemas** → add `next_auth` → Save
   - **SQL:** run [`supabase/expose-next-auth.sql`](supabase/expose-next-auth.sql) in the SQL Editor

   If you used `ALTER ROLE authenticator SET pgrst.db_schemas`, you must also run `NOTIFY pgrst, 'reload schema'` (not `reload config` alone) so PostgREST picks up the tables.

4. Verify setup:

```bash
npm run verify:supabase
```

This creates:

- `next_auth.*` — users, accounts, sessions (for Google login)
- `public.topics` — topic checklist state

## 3. Local development

```bash
cp .env.example .env
# Fill in Google OAuth, AUTH_SECRET, and Supabase keys

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful env vars

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth credentials |
| `AUTH_SECRET` | Session encryption secret |
| `AUTH_URL` | App base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access for NextAuth + topics |
| `ALLOWED_EMAIL` | Optional: only these Google emails can sign in |
| `DRIVE_ROOT_FOLDER_ID` | Optional: sync child folders of this parent |
| `MAX_UPLOAD_MB` | Upload size limit (default 500) |

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

### Drive folder sync

- By default, **Sync from Drive** lists **top-level folders** in My Drive.
- If your topics live under one parent folder, set `DRIVE_ROOT_FOLDER_ID` to that folder’s ID (from the Drive URL).

## 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET`
- `AUTH_URL` = `https://YOUR_PROJECT.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_EMAIL` (recommended)
- `DRIVE_ROOT_FOLDER_ID` (optional)

Add production OAuth redirect URI in Google Cloud:

`https://YOUR_PROJECT.vercel.app/api/auth/callback/google`

Then:

```bash
vercel --prod
```

## 5. Usage

1. Sign in with Google and grant Drive access.
2. Open **Dashboard** → **Sync from Drive**.
3. Check off completed topics; rename / hide / drag to reorder.
4. Click a topic to open its Drive folder: upload videos/scripts, download files, or edit plain-text scripts in the browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |

## Troubleshooting sign-in

| Symptom | Fix |
|---------|-----|
| `/login?error=Configuration` or terminal `AdapterError` | Expose `next_auth` (dashboard or `expose-next-auth.sql`) |
| `Invalid schema: next_auth` (PGRST106) | `next_auth` not in exposed schemas |
| `Could not find the table ... in the schema cache` | Run `NOTIFY pgrst, 'reload schema'` via `expose-next-auth.sql` |
| `invalid_grant` / `Invalid code verifier` | Use one browser tab; clear cookies for localhost; sign in again (stale OAuth PKCE) |
| `AccessDenied` on login | Your Google email is not in `ALLOWED_EMAIL` |
| `redirect_uri_mismatch` | Add `http://localhost:3000/api/auth/callback/google` in Google Cloud OAuth redirect URIs |

Use the **legacy `service_role` JWT** (`eyJ...`) for `SUPABASE_SERVICE_ROLE_KEY`, not only the newer `sb_secret_` key, if the adapter still fails after exposing the schema.

Run `npm run verify:supabase` after any Supabase changes.

## Notes

- Login uses **Google via NextAuth**, not Supabase Auth.
- Data is stored in Supabase Postgres through the **Supabase JS client** (no ORM).
- Native Google Docs/Sheets are downloadable/exportable; in-browser editing is for plain files (`.txt`, `.md`, `.json`, etc.).
- Large video uploads may hit host body-size limits on free Vercel tiers.
