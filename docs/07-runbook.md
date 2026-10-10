# 07 — Runbook

Part A covers the SaaS application in this repository. Part B keeps the notes on running the original single-tenant system.

---

## Part A — The SaaS application

### Local development

```bash
npm install
npm run db:check     # confirms migrations + bucket + auth settings
npm run dev          # http://localhost:3000
npm run typecheck
npm run build        # production build
```

Node 20+ (built with Node 24).

### Environment variables

| Name | Used by | Required |
|------|---------|----------|
| `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) | all Supabase calls | yes |
| `SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | browser + server clients (RLS applies) | yes |
| `SUPABASE_SERVICE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) | public invoice page, FX refresh, db:check — server only | yes |
| `OPENAI_API_KEY` | receipt OCR (`/api/ocr`) | for scanning |
| `OPENAI_OCR_MODEL` | vision model name, default `gpt-5-mini` | no |
| `CREDENTIALS_ENCRYPTION_KEY` | AES-256-GCM key for the login vault (32 bytes base64) | for the vault |
| `CRON_SECRET` | protects `GET /api/cron/fx` | recommended |
| `NEXT_PUBLIC_SITE_URL` | absolute links in robots/sitemap | production |

`next.config.ts` maps the `SUPABASE_*` names to the `NEXT_PUBLIC_*` names the browser needs.

### Database bootstrap (fresh Supabase project)

1. SQL editor: run `migrations/0001_initial_schema.sql`, then `migrations/0002_saas_tenancy.sql`. Both are idempotent.
2. `0002` also creates the private bucket `tenant-files` and its policies. If bucket creation is refused by your plan, create it in Storage (private, 10 MB limit) and re-run the policy block.
3. Authentication → URL configuration: Site URL + Redirect URLs (`/auth/callback` on every host you use).
4. First user: sign up through the app and complete onboarding. Never seed users by script.

### Roles

Each organisation has seven templates: Owner (everything, cannot be deleted), Manager, Finance, Legal, Partner, Staff, Viewer. Settings → Roles edits the module × action matrix; row-level security reads the same matrix, so a change applies immediately to the database as well as the UI.

### Inviting people

Settings → Team → Invite creates a link `/invite/<token>` (7 days). Share it (copy or the mailto button). The person signs up or signs in with the invited email and accepts. Supabase's own invite emails are not used because no SMTP provider is configured.

### Exchange rates

`GET /api/cron/fx` (with `Authorization: Bearer $CRON_SECRET` or `?key=`) stores the ECB daily rates for all currencies (EUR based). Vercel runs it on weekdays (see `vercel.json`). Any member can also `POST /api/cron/fx` from the app once per hour. The display-currency toggle in the sidebar converts base amounts with these rates; a green dot means rates are less than a week old.

### Files

All uploads go to `tenant-files/org/<orgId>/<module>/`. Records store the path; `/api/files/<path>` redirects to a 2-minute signed URL after checking membership. Deleting a room photo or a document removes the object; other attachments are kept when the record is deleted (audit trail).

### Backups and reset

* Settings → Data exports any table (or all) for the organisation as XLSX/CSV/JSON.
* Settings → Data → Reset deletes business rows of the organisation (not settings, team, rooms) through `app_reset_organization_data`. Export first.
* Supabase's own backups depend on the plan.

### Deploy

Vercel, auto-deploy from `main`. Add the environment variables, then the production URL to Supabase redirect URLs. Schema changes: write a new `migrations/000N_*.sql` (idempotent), run it in the SQL editor **before** deploying the code that needs it.

### Mobile

Install from the browser menu (Android: Install app; iOS: Share → Add to Home Screen). Check every new form at 390 px width: the DataTable renders cards and the Modal becomes a bottom sheet automatically.

---

## Part B — The original single-tenant system (for reference)

### Local development

```bash
cd web
npm install
# create web/.env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
npm run dev
```

### Database bootstrap

1. Run `migrations/0001_initial_schema.sql`.
2. Create a public bucket `dms-files`.
3. Seed users with the script after replacing its passwords, or create users from Settings once an Admin exists.
4. Rooms seeded 1–10; account balances at 0; press the sidebar FX refresh once.

### Operational gotchas (original system)

* The FX rate only updates when someone presses the sidebar refresh.
* The GM dashboard's monthly revenue figure reads the newest 30 revenue rows only.
* The invoice link emailed to guests needs a login; send the PDF/print instead.
* Deleting an expense does not reverse the account balance.
* Room photos uploaded from the room page land in the `expenses/` storage folder.
* Tailwind v4 needs Chrome 111+.
