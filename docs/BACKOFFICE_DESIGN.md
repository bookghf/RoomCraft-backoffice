# RoomCraft Back Office: Analysis and Design

29 October 2026 · Covers `roomcraft-backoffice` (Next.js), and the admin API and database changes in `roomcraft-api` (Go, MongoDB)

---

## 1. Summary

The back office is the internal tool the RoomCraft team uses to:

- run the furniture catalog;
- run floor plans and showrooms;
- support residents;
- meet PDPA requests.

It is a separate Next.js app (`roomcraft-backoffice`, port 3001). It talks only to the Go API through a new `/v1/admin/*` surface.

Staff accounts are separate from residents:

- Residents sign in through SmartWorld.
- Staff sign in with email and password to the back office.
- A resident token can never reach an admin endpoint.

Key decisions:

| Decision | Why |
|---|---|
| **Separate app, separate auth** | The back office never ships in the resident apps. Staff tokens use their own secret and audience, so a leaked resident token cannot be used for admin access. |
| **Catalog edits go live only when published** | Editors can work on several items, preview the diff, then publish one versioned snapshot. Rollback re-publishes an older snapshot. |
| **Plans are versioned, never edited in place** | Saved designs keep pointing at the version they were made on. |
| **Nothing that residents use is ever hard-deleted from the catalog** | Retired items stay readable, so old designs still render. |
| **Every admin write and every look at resident data is audited** | This gives accountability, plus PDPA evidence. |
| **Four fixed roles** | Owner, catalog manager, support, viewer. This is simple enough to reason about, and permissions are checked on the server. |
| **The browser never holds the API token** | The Next.js server keeps it in an httpOnly cookie and calls the API itself. |

---

## 2. Who uses it and for what

| Role | Who | Main jobs |
|---|---|---|
| **Owner** | Product lead, tech lead | Everything, plus staff accounts, audit log, and erasing a resident's data |
| **Catalog manager** | Merchandising / content | Add and edit furniture, prices, colours. Publish the catalog. Publish plans and showrooms. Manage categories and room types |
| **Support** | Customer support | Look up a resident's designs and share links. Revoke abusive or mistaken share links. Export a resident's data |
| **Viewer** | Management, partners | Dashboard and catalog, read only |

### Permissions

| Permission | Owner | Catalog manager | Support | Viewer |
|---|:-:|:-:|:-:|:-:|
| `dashboard.read` | ✓ | ✓ | ✓ | ✓ |
| `catalog.read` | ✓ | ✓ | ✓ | ✓ |
| `catalog.write` (items, categories) | ✓ | ✓ | | |
| `catalog.publish` (publish, rollback) | ✓ | ✓ | | |
| `plans.write` (plans, showrooms, room types) | ✓ | ✓ | | |
| `designs.read` | ✓ | | ✓ | |
| `users.read` (and export) | ✓ | | ✓ | |
| `users.delete` (PDPA erasure) | ✓ | | | |
| `shares.read` | ✓ | | ✓ | |
| `shares.revoke` | ✓ | | ✓ | |
| `audit.read` | ✓ | | | |
| `staff.manage` | ✓ | | | |

The API checks permissions on every request. The back office hides the pages and buttons a role cannot use, but that is only for convenience.

---

## 3. Screens

| Area | Page | What it does |
|---|---|---|
| Sign in | `/login` | Email and password. Lockout after 5 failed attempts (15 minutes) |
| | `/account` | Change password (forced on first sign-in), profile, sign out, sign out everywhere |
| Dashboard | `/` | Saved designs, residents, furniture value, share links (7, 30 or 90 days). New designs per day. Top items and plans. Catalog status (live version, unpublished changes) |
| Catalog | `/catalog` | All items with publish state (published, new, changed, removing, retired). Search, filter by category, state tabs |
| | `/catalog/new`, `/catalog/[id]` | Item editor: names in English, Thai and Chinese; price; SKU; size; mount; flags; colours; 3D template and parameters. Shows the unpublished diff, usage count, retire and restore, and change history |
| | `/catalog/publish` | Diff since the live version, publish with name and notes, version history, roll back |
| | `/categories` | Add, rename, reorder. A category in use cannot be deleted |
| Spaces | `/plans` | Unit plans, showrooms and empty rooms with version, design count, live or archived |
| | `/plans/new`, `/plans/[id]` | JSON plan editor with live SVG top view. Publish a new version. Version list. Archive or restore |
| | `/room-types` | Showroom gallery groups. A room type in use cannot be deleted |
| Residents | `/designs`, `/designs/[id]` | Saved designs across residents. Search by name, resident or plan. The detail page shows the plan preview and the shopping list, and each view is audited |
| | `/users`, `/users/[id]` | Residents (SmartWorld ids) with design count and value. The detail page shows designs, Recent, share links and preferences. Export as JSON. Erase everything after typing the id to confirm |
| | `/shares` | All share links with status tabs (active, revoked, expired). Revoke |
| Admin | `/staff` | Staff list, add account with a temporary password, change role, disable, reset password |
| | `/audit` | Filter by staff, action, target. Shows field-level before and after |

Residents' names and contact details stay in SmartWorld. The back office shows only the SmartWorld user id, to keep personal data to a minimum.

---

## 4. Catalog publishing flow

```
 edit items ──► catalogItems (working copy)
                      │  GET /admin/catalog/changes  (diff against live)
                      ▼
 publish ─────► catalogVersions (immutable snapshot, newest = live)
                      │  apps read GET /v1/catalog (cached 30 s, ETag)
 rollback ────► copies an old snapshot into a new version (rolledBackFrom)
```

The publish state of each item comes from comparing the working copy with the live snapshot:

| State | Meaning |
|---|---|
| `published` | Same as live |
| `new` | Not in the live catalog yet |
| `changed` | Differs from live (the diff lists the fields) |
| `removing` | Retired but still live; goes away at the next publish |
| `retired` | Retired and not live. It can still be read by id, so old designs render |

Publishing with no changes returns `409 NO_CHANGES`.

---

## 5. Admin API (`/v1/admin`)

All admin endpoints:

- need `Authorization: Bearer <staff token>`;
- use the same envelope as the rest of the API: `{success, data, error:{code, message, details}}`;
- page lists with `page` and `pageSize`, returning `{items, total, page, pageSize}`.

### Auth and staff

| Method | Path | Permission | |
|---|---|---|---|
| POST | `/auth/login` | none | `{email, password}` → `{token, expiresAt, staff, permissions}` |
| GET | `/auth/me` | signed in | Current staff and permissions |
| POST | `/auth/password` | signed in | `{currentPassword, newPassword}`. Revokes other tokens and returns a new one |
| POST | `/auth/logout` | signed in | Signs the account out on every device (bumps `tokenVersion`) |
| GET | `/staff` | `staff.manage` | |
| POST | `/staff` | `staff.manage` | `{email, name, role, password}`. The new account must change the password at first sign-in |
| PATCH | `/staff/{id}` | `staff.manage` | `{name?, role?, disabled?}`. You cannot demote or disable yourself, and at least one active owner must remain |
| POST | `/staff/{id}/reset-password` | `staff.manage` | `{password}` sets a temporary password and signs that account out |

### Dashboard

| Method | Path | Permission | |
|---|---|---|---|
| GET | `/dashboard?days=30` | `dashboard.read` | Totals, per-day series (Bangkok time), top items, top plans, catalog status |

### Catalog

| Method | Path | Permission | |
|---|---|---|---|
| GET | `/catalog/items` | `catalog.read` | `q`, `category`, `state`, paging |
| POST | `/catalog/items` | `catalog.write` | Create. `409 ID_TAKEN` if the id is taken |
| GET | `/catalog/items/{id}` | `catalog.read` | Item, publish state, diff against live, usage count |
| PUT | `/catalog/items/{id}` | `catalog.write` | Replace the working copy |
| POST | `/catalog/items/{id}/retire`, `/restore` | `catalog.write` | |
| GET | `/catalog/changes` | `catalog.read` | Pending changes since the live version |
| POST | `/catalog/publish` | `catalog.publish` | `{version?, notes?}`. `409 NO_CHANGES`, `409 VERSION_EXISTS` |
| GET | `/catalog/versions`, `/catalog/versions/{v}` | `catalog.read` | History; one snapshot |
| POST | `/catalog/versions/{v}/rollback` | `catalog.publish` | `{version?, notes?}` publishes a copy of `v` |
| GET | `/categories` | `catalog.read` | With item counts |
| PUT | `/categories/{id}` | `catalog.write` | Create or update |
| DELETE | `/categories/{id}` | `catalog.write` | `409 CATEGORY_IN_USE` |

### Plans

| Method | Path | Permission | |
|---|---|---|---|
| GET | `/plans` | `catalog.read` | Newest version of each plan, with version count, design count and archived state |
| POST | `/plans` | `plans.write` | `{kind, roomType?, sortOrder?, notes?, spec}` publishes the next version. Checks the geometry, the room type, and showroom items against the catalog. `KIND_MISMATCH` if the kind changes |
| GET | `/plans/{id}/versions` | `catalog.read` | All versions with geometry |
| POST | `/plans/{id}/archive`, `/restore` | `plans.write` | Archived plans are hidden from the apps' lists; saved designs still open |
| GET | `/room-types` | `catalog.read` | With showroom counts |
| PUT | `/room-types/{id}` | `plans.write` | |
| DELETE | `/room-types/{id}` | `plans.write` | `409 ROOM_TYPE_IN_USE` |

### Residents and support

| Method | Path | Permission | |
|---|---|---|---|
| GET | `/designs` | `designs.read` | `q`, `owner`, `planId`, `deleted`, paging |
| GET | `/designs/{id}` | `designs.read` | Audited as `design.view` |
| GET | `/users` | `users.read` | Residents found in designs, drafts, shares and preferences |
| GET | `/users/{id}` | `users.read` | Designs, drafts, shares, preferences. Audited as `user.view` |
| GET | `/users/{id}/export` | `users.read` | PDPA data export. Audited |
| DELETE | `/users/{id}` | `users.delete` | `{confirm: "<id>"}` (must equal the id) permanently erases everything. Audited with counts |
| GET | `/shares` | `shares.read` | `status=active\|revoked\|expired`, `owner` |
| POST | `/shares/{code}/revoke` | `shares.revoke` | The link returns `410` from then on |
| GET | `/audit` | `audit.read` | `actor`, `action`, `targetType`, `targetId`, paging |

### Error codes added

| Code | When |
|---|---|
| `INVALID_CREDENTIALS` (401) | Wrong email or password, or a disabled account |
| `ACCOUNT_LOCKED` (429) | 5 failed attempts; locked 15 minutes |
| `PASSWORD_CHANGE_REQUIRED` (403) | Temporary password not changed yet |
| `FORBIDDEN` (403) | The role lacks the permission |
| `SELF_CHANGE` (409) | Removing your own owner access |
| `LAST_OWNER` (409) | Would leave no active owner |
| `EMAIL_TAKEN` (409) | Staff email already used |
| `ID_TAKEN` (409) | Catalog item id already used |
| `NO_CHANGES` (409) | Publishing with nothing changed |
| `VERSION_EXISTS` (409) | Catalog version name taken, or a concurrent plan publish |
| `CATEGORY_IN_USE` (409) | Items still use the category |
| `ROOM_TYPE_IN_USE` (409) | Showrooms still use the room type |
| `KIND_MISMATCH` (409) | A new plan version changes `kind` |

---

## 6. Database changes (MongoDB)

### New collections

**`staff`**: back office accounts.

| Field | Type | Notes |
|---|---|---|
| `_id` | string | `stf_` + 12 random characters |
| `email` | string | Unique, lower-case |
| `name`, `role` | string | Role is `owner`, `catalog_manager`, `support` or `viewer` |
| `disabled`, `mustChangePassword` | bool | |
| `passwordHash` | string | bcrypt, cost 12. Never returned |
| `tokenVersion` | int | In every token. Bumping it signs the account out everywhere |
| `failedLogins`, `lockedUntil` | int, date | Lockout |
| `lastLoginAt`, `createdAt`, `updatedAt` | date | |

Index: `{email: 1}` unique.

**`auditLog`**: append-only.

| Field | Type | Notes |
|---|---|---|
| `_id` | string | |
| `at` | date | |
| `actorId`, `actorEmail` | string | The email is copied, so entries stay readable if the account changes |
| `action` | string | For example `catalog.item.update`, `catalog.publish`, `plan.publish`, `design.view`, `user.view`, `user.export`, `user.delete`, `share.revoke`, `staff.create`, `auth.login`, `auth.login_failed` |
| `targetType`, `targetId` | string | |
| `summary` | string | One readable line |
| `changes` | map | `{field: {from, to}}` for edits |
| `ip` | string | |

Indexes:

- `{at: -1}`
- `{targetType: 1, targetId: 1, at: -1}`
- `{actorId: 1, at: -1}`

Keep the audit log for at least 1 year. In production, add a TTL index or archive older entries to cold storage, as the company's policy requires.

### New fields on existing collections

| Collection | Field | Purpose |
|---|---|---|
| `catalogItems` | `createdAt`, `updatedBy` | Who changed what |
| `categories`, `roomTypes` | `updatedAt` | |
| `catalogVersions` | `rolledBackFrom` | Set when a version is a rollback copy |
| `plans` | `publishedBy`, `notes`, `archivedAt` | Not sent to the apps. `archivedAt` hides the plan from public lists |

### New indexes for back office queries

| Collection | Index | Used by |
|---|---|---|
| `designs` | `{createdAt: -1}` | Dashboard, design list |
| `designs` | `{planId: 1}` | Design count per plan |
| `designs` | `{content.items.itemId: 1}` | Item usage count |
| `shares` | `{createdAt: -1}` | Share list |

---

## 7. Security model

### Separate staff tokens

- HS256 with `ADMIN_JWT_SECRET`, which is a different secret from the resident one and at least 32 characters.
- Audience `roomcraft-backoffice`, issuer `roomcraft-api`.
- Lifetime 8 hours (`ADMIN_TOKEN_TTL_HOURS`).
- The resident auth middleware skips `/v1/admin/*`, so `X-Dev-User` and SmartWorld tokens are never accepted there.

### Revocation

Each token carries `ver` = `tokenVersion`. The following bump it, which invalidates every outstanding token at once:

- changing the password (the API returns a fresh token for the current device);
- signing out (`POST /auth/logout`);
- a password reset;
- disabling the account.

### Passwords

- bcrypt with cost 12, and at least 10 characters.
- New accounts and resets get a temporary password, and the API returns `PASSWORD_CHANGE_REQUIRED` until it is changed.
- After 5 failures the account locks for 15 minutes.

### First owner

`ADMIN_EMAIL` and `ADMIN_PASSWORD` create the first owner only when the staff collection is empty. That owner must change the password at first sign-in.

### Back office app

- The token is kept in an httpOnly, SameSite=Lax cookie (`rc_session`), set Secure in production. The browser never sees it and never calls the API directly.
- `proxy.ts` sends visitors without a session to `/login`. Every page also checks the session against the API.
- Security headers: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `X-Robots-Tag: noindex`.
- Destructive actions need a second click, or typing the id for erasure.

### Deployment

- Put the back office on a private hostname behind a VPN or IP allow list (for example Cloudflare Access).
- Do not add it to the resident `CORS_ORIGINS`; it never calls the API from the browser.

---

## 8. PDPA (Thailand)

| Requirement | How |
|---|---|
| Data minimisation | Only the SmartWorld user id is stored. No names, phones or emails of residents |
| Right of access | `GET /admin/users/{id}/export` (support) and `GET /v1/me/export` (the resident) |
| Right to erasure | `DELETE /admin/users/{id}` (owner, typed confirmation) and `DELETE /v1/me` (the resident). Deletes designs (including soft-deleted ones), Recent, share links and preferences |
| Accountability | Every view of a resident's designs or profile, every export and every erasure is in `auditLog` with staff, time and IP |
| Least privilege | Catalog staff cannot see resident data. Viewers see aggregates only |

---

## 9. Build and run

```bash
# API and MongoDB (creates the first owner from .env)
cd roomcraft-api && docker compose up --build

# Back office
cd roomcraft-backoffice && cp .env.example .env.local && npm install && npm run dev
# http://localhost:3001: sign in with ADMIN_EMAIL / ADMIN_PASSWORD, then set a new password
```

---

## 10. Later

- **Image upload** for thumbnails and `.glb` models, using presigned S3 or R2 URLs. Today they are URLs typed in.
- **Single sign-on** for staff (Google Workspace or Microsoft Entra) to replace passwords. The token and role model stays the same.
- **Two-factor authentication** (TOTP) for owners, if SSO is not adopted.
- **Scheduled publishing** and approval (one person edits, another publishes).
- **Visual plan editor.** Today plans are edited as JSON with a live preview.
- **Audit log export** and retention policy.
