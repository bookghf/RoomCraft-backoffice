# RoomCraft Back Office

The internal tool the RoomCraft team uses for the furniture catalog, floor plans and showrooms, resident support, PDPA requests, staff accounts, and the audit log. It is built with Next.js 16 (App Router) and talks only to the Go API in `../roomcraft-api` (`/v1/admin`).

The full analysis and design is in [`docs/BACKOFFICE_DESIGN.md`](docs/BACKOFFICE_DESIGN.md). It covers roles, screens, the admin API, database changes, security and PDPA.

## Run it

```bash
# 1. API and MongoDB (seeded; creates the first owner from ADMIN_EMAIL / ADMIN_PASSWORD)
cd ../roomcraft-api && docker compose up -d --build

# 2. Back office
cp .env.example .env.local      # API_URL = the deployed API (or http://localhost:8080)
npm install
npm run dev                     # http://localhost:3001
```

Sign in with the API's `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Locally they are in `../roomcraft-api/.env.example`. On the deployed API the password is in Google Secret Manager (`gcloud secrets versions access latest --secret admin-password`). On first sign-in you must set a new password. After that, add other staff from **Staff**.

| Script | |
|---|---|
| `npm run dev` | Dev server on port 3001 (the resident web app uses 3000) |
| `npm run build` / `npm start` | Production build, served on port 3001 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Configuration

| Variable | Notes |
|---|---|
| `API_URL` | Base URL of `roomcraft-api`, read on the server only. Deployed: `https://roomcraft-api-888999168308.asia-southeast1.run.app`. Local: `http://localhost:8080` (the default) |

## How it works

- **The server talks to the API.** Pages are Server Components and changes are Server Actions. They call the API from the Next.js server, so the browser never sees the staff token or calls the API itself. That is why the back office does not need to be in the API's `CORS_ORIGINS`.
- **Sessions.** The staff token is kept in the httpOnly cookie `rc_session` (Secure in production).
  - `src/proxy.ts` sends visitors without a session to `/login`.
  - If the API rejects the token, the visitor is sent back to sign in.
- **Permissions.** The API checks permissions on every request. The sidebar and buttons only hide what the signed-in role can't use.
- **Destructive actions** need a second click, and erasing a resident needs their id typed in.

```
src/
  app/login             sign in
  app/(app)             signed-in pages: dashboard, catalog, publish, categories, plans,
                        room-types, designs, users, shares, staff, audit, account
  components            UI kit, sidebar, plan preview (SVG), plan and item editors
  lib/api.ts            server-only API client and session cookie
  lib/actions/*         Server Actions per area
  proxy.ts              redirect to /login without a session
```

## Deploying

- Host it separately from the resident web app, on a private hostname behind a VPN or an IP allow list (for example Cloudflare Access). Set `API_URL` to the API's internal or public URL.
- The API needs `ADMIN_JWT_SECRET` set (at least 32 characters, different from `JWT_SECRET`).
- After the first owner has signed in, remove `ADMIN_PASSWORD` from the API's environment.
