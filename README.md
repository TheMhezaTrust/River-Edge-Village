# The Mheza Trust — Website & Enterprise Workstation

A single full-stack [Next.js 15](https://nextjs.org) application serving:

1. **Public website** — marketing site for River Edge Rural Village. The homepage is deliberately limited to public information: Trust basics, the plot layout and site-plan picture, prices and promotions, the Terms and Conditions of Sale, contact details, a short project-progress timeline, and an interest form. Member financials, other members' records and government department engagement details are **never** public — they sit behind the staff login or the member's own portal login.
2. **Internal Enterprise Workstation** (`/workstation`) — secure, role-based portal for staff, trustees and committee members.

Both share one database, one design language (earth-tone Tailwind theme), and one codebase.

## Tech stack

| Layer      | Choice                                                        |
|------------|---------------------------------------------------------------|
| Framework  | Next.js 15 (App Router, JavaScript)                           |
| Styling    | Tailwind CSS v4 (custom forest/earth/sunset/trust theme)      |
| Database   | Prisma ORM — SQLite in development, PostgreSQL-ready          |
| Auth       | JWT (jose) in httpOnly cookies, bcrypt password hashing       |
| Access     | Role-based permissions (`lib/roles.js`) enforced in every API route |
| Charts     | recharts                                                      |
| Uploads    | Document upload/download **disabled for launch** (no object storage); all `/api/**/documents*` routes return 410. `lib/uploads.js` + `lib/files.js` retained for re-enable |
| AI assistant | "Mheza" public chat bot — OpenAI-compatible LLM (DeepSeek by default) via `app/api/chat` |

## Mheza — public AI assistant

A floating chat widget named **Mheza** appears on **public marketing pages only**. It is mounted once in `app/(site)/layout.jsx` and hides itself (via a `usePathname` check) on `/portal`, `/workstation` and `/login`, which share that layout but are not public. It is **read-only** and answers only from public information.

- **Widget:** `components/site/ChatBot.jsx` (client component).
- **API:** `app/api/chat/route.js` — POST `{ messages }`, calls an OpenAI-compatible `/chat/completions` endpoint server-side. Sanitises/trims history, caps message length, applies a basic per-IP rate limit, and never exposes the key to the client.
- **Grounding:** `lib/chat-context.js` builds the system prompt from `lib/contact.js` plus **live** public project data (pricing, plot availability). It carries strict guardrails: the bot must never reveal, guess or request any member's personal/financial data, staff emails/credentials, or Trust internal financials, and must not claim the rezoning is approved.
- **Provider config (`.env`):** `DEEPSEEK_API_KEY` (required to enable live answers), `LLM_BASE_URL` (default `https://api.deepseek.com/v1`), `LLM_MODEL` (default `deepseek-chat`). Any OpenAI-compatible provider works by changing the base URL/model. With no key set, the bot returns a helpful "not configured" message instead of failing.

## Getting started

```bash
npm install
npx prisma db push     # creates prisma/dev.db (SQLite)
npm run db:seed        # demo dataset: 216 plots (survey erf numbers), 36 members, departments, finances
npm run dev            # http://localhost:3000
```

> **Note on the current database.** The live `prisma/dev.db` no longer holds the demo dataset. On 24 September 2026 the real River Edge member roster was imported: **146 members / plot owners** (144 individuals + 2 entities — The Mheza Trust and River Edge SA Primary Co-Operative Limited), with **177 of 224 erven allocated** (SOLD) and 47 still available. Eight erven that were on the roster but missing from the survey layout (1B, 34, 166, 269, 274, 277, 279, 284) were created with placeholder off-map coordinates and still need real positions. Running `npm run db:seed` again will **wipe the real roster** and restore the 36 demo members — only re-seed on a throwaway database. The import script (`import-roster.mjs`) and its source (`roster_raw.txt`) are kept for audit/re-run.

### Signing in

The public site has a single sign-in entry point at **`http://localhost:3000/login`** with two choices — **Member** (member portal) and **Administrator / Staff** (Enterprise Workstation). The direct URLs `/portal` and `/workstation/login` still work and redirect signed-in users to their dashboard.

### Staff accounts

**Workstation** — `http://localhost:3000/workstation` (seeded password for all: `Mheza@2026` — change on first login)

| Email | Name | Role |
|---|---|---|
| bongani.sifiniza@themhezatrust.local | Bongani Sifiniza | Administrator (full access) |
| thandile.sifiniza@themhezatrust.local | Thandile Sifiniza | Finance & Member Records |
| sisanda.toni@themhezatrust.local | Sisanda Toni | Finance & Member Records |
| nokuthula.gedle@themhezatrust.local | Nokuthula Gedle | Finance & Member Records |
| sipho.jauka@themhezatrust.local | Sipho Jauka | Plot Administrator |
| sydney.velapi@themhezatrust.local | Sydney Velapi | Plot Administrator |
| lihle.jacob@themhezatrust.local | Lihle Jacob | Plot Administrator |

**Member portal** — `http://localhost:3000/portal`

The 146 imported members are **portal-inactive**: each has a generated placeholder email (`…@placeholder.mheza.invalid`), a placeholder phone where the roster supplied none, and **no password**. A member activates their own account at `/portal/register` (`POST /api/portal/register`) by matching the ID number or phone on file; self sign-up requires accepting the Terms and Conditions of Sale. Members whose roster row had no ID number (67 of them) can only be activated by phone match or by staff, who must verify identity first. Imported members have **no payment history** — balances show the full erf price as outstanding until Finance records payments.

Real members create their own account at `/portal/register`. A brand-new self-registration (no matching record) files the erf preference as an inquiry for the Finance team to confirm — such a member has no plot and no financial history until staff allocate one.

Payment details, balances and documents are only reachable with a portal session: `/portal/dashboard` redirects to `/portal` when signed out, and every `/api/portal/*` handler calls `getPortalSession()` first.

## Roles & permissions

Defined in `lib/roles.js`. Every staff role can **view every module**; only writes are restricted. Each API route handler calls `guard("resource:action")` before touching data, and the workstation UI hides controls the current role cannot use.

- **Administrator** (Bongani Sifiniza) — everything, including user management, settings and the audit log
- **Finance & Member Records** (Thandile Sifiniza, Sisanda Toni, Nokuthula Gedle) — changes to finances, payroll, member/customer records, inquiries, the document library and member communications; everything else read-only
- **Plot Administrator** (Sipho Jauka, Sydney Velapi, Lihle Jacob) — changes to plot records: erf size, availability, price, block and layout position; everything else read-only

All three roles can also manage their own tasks and view the staff directory (Settings → Users) and the audit log. Pages a role cannot edit show a "Read-only view" banner and hide every add/edit/delete control.

## Project structure

```
app/
  (site)/            # public website: home, about, projects, plots, status,
                     # trust-info, terms, contact, login (staff + member chooser),
                     # portal (login + register + dashboard)
  workstation/
    login/           # staff sign-in
    (app)/           # authenticated shell (sidebar + notifications)
      page.jsx       # dashboard (stats, charts, quick actions)
      members/ plots/ finance/ documents/ departments/
      inquiries/ tasks/ communication/ reports/ settings/
  api/               # route handlers (auth, portal, public, members, plots,
                     # finance, documents, departments, inquiries, tasks,
                     # communication, admin, dashboard, reports)
components/          # shared UI: ui.jsx, PlotMap.jsx, InterestForm.jsx, site/, ws/
lib/                 # prisma.js, auth.js (JWT/RBAC server), roles.js (client-safe),
                     # api-client.js, contact.js (Trust details), files.js (authenticated
                     # download URLs), format.js, plan-layout.js, uploads.js
prisma/              # schema.prisma + seed.js
storage/uploads/     # uploaded files — never inside public/, so not statically served
docs/                # user guide & training material
```

## Production deployment (Vercel + Neon)

The app is a **Next.js SSR** application (server components + API route handlers), so it must run on a
platform that executes Node at request time. The chosen target is **Vercel** (Next-native) with a
**Neon** serverless Postgres database. Vercel's filesystem is ephemeral, which is why SQLite and
local-disk uploads cannot be used in production — hence the Postgres migration and the launch-time
disabling of document upload/download (no object storage is provisioned yet).

Everything below after step 0 is done once. Steps marked **⚠ needs you** require an account/action only
the Trust admin can perform (provisioning services, secrets, DNS).

### 0. Prerequisites (local, already done)

- Repo initialised with a clean baseline commit; all PII/secret files are git-ignored
  (`roster_raw.txt`, `prisma/data-export.json`, `prisma/dev.db`, `.env`, `*-income-backup.json`,
  `storage/uploads/*`, logs, `.plan-tiles/`). **Never** commit these.
- `prisma/data-export.json` holds the current SQLite data (146 members, 224 plots, finances) and is the
  migration source. `prisma/import-to-postgres.mjs` loads it into Postgres in FK-safe order.
- `.env.example` documents every production environment variable.

### 1. Create the Neon Postgres database — ⚠ needs you

1. Create a Neon project (e.g. `mheza-prod`). Copy the **pooled** connection string
   (`...pooler.neon.tech/...?sslmode=require`).
2. This becomes `DATABASE_URL` in both Vercel and your local `.env` for the cutover.

### 2. Switch Prisma to PostgreSQL — ⚠ needs you (cutover)

Prisma's `provider` is a **static string** (it cannot be read from an env var), so switching affects
development too. Do this as a deliberate cutover, not while iterating:

```bash
# 1. Stop the local dev server first (it holds the SQLite client).
# 2. Edit prisma/schema.prisma:  provider = "sqlite"  ->  provider = "postgresql"
# 3. Point .env DATABASE_URL at the Neon pooled string.
npx prisma generate
npx prisma db push                 # creates the schema on Neon (no seed in prod)
node prisma/import-to-postgres.mjs # loads prisma/data-export.json into Neon
```

Verify counts on Neon (`member` 146, `plot` 224, etc.) before deploying. Keep `dev.db` and
`data-export.json` as the rollback snapshot.

### 3. Deploy to Vercel via Git — ⚠ needs you

1. Push the repo to a **private** GitHub repository.
2. In Vercel: **Add New → Project → Import** that repo (framework auto-detected as Next.js).
3. Set environment variables in **Project → Settings → Environment Variables** (Production *and* Preview):

   | Variable | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | Neon pooled string (`?sslmode=require`) | from step 1 |
   | `JWT_SECRET` | strong random secret | generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
   | `NEXT_PUBLIC_SITE_URL` | `https://themhezatrust.co.za` | SEO `metadataBase` / `og:url` |
   | `DEEPSEEK_API_KEY` | your DeepSeek key | enables the "Mheza" assistant; leave empty to keep the friendly fallback |
   | `LLM_BASE_URL` | `https://api.deepseek.com/v1` | optional (default) |
   | `LLM_MODEL` | `deepseek-chat` | optional (default) |

4. **Build command** `next build`, **Output** default. No `prisma generate` postinstall is needed if the
   Prisma client is committed via the standard `prisma generate` in the build; if Vercel reports a missing
   client, add `prisma generate` to the build step (`prisma generate && next build`).
5. Deploy. Vercel gives you a `*.vercel.app` URL — smoke-test it before wiring the domain.

> **Do not** run `npm run db:seed` against production — it wipes the real roster and restores demo data.

### 4. Attach the custom domain `themhezatrust.co.za` — ⚠ needs you

1. Vercel → **Project → Settings → Domains → Add** `themhezatrust.co.za` (and `www.themhezatrust.co.za`).
   Vercel issues TLS automatically once DNS resolves.
2. At your **domain registrar** (where `.co.za` is managed), create the DNS records Vercel shows. Typically:

   | Type | Name | Value |
   |---|---|---|
   | `A` | `@` (apex) | Vercel's apex IP (shown in the Domains panel, e.g. `76.76.21.21`) |
   | `CNAME` | `www` | `cname.vercel-dns.com` |

3. Wait for propagation (minutes to a few hours). Vercel flips the domain to **Valid Configuration** and
   serves HTTPS. Set `NEXT_PUBLIC_SITE_URL` to the live `https://themhezatrust.co.za` (already the default).

### 5. Post-deploy checklist

- Confirm all staff accounts and change the seeded `Mheza@2026` password on first login (**Settings → Profile**).
- Verify member isolation: a portal session sees only its own payments/balance, never another member's.
- Verify `/api/**/documents*` return **410** and no upload UI is reachable.
- If `DEEPSEEK_API_KEY` is set, exercise the Mheza widget and confirm it never leaks member/staff data.
- Wire `app/api/public/inquiries/route.js` to a real mail provider (SendGrid/Mailgun) — it currently logs
  and creates a workstation notification only. The integration point is marked in the file.
- Enable Neon **point-in-time / scheduled backups** and Vercel deployment protection for Preview URLs.

### 6. Re-enabling documents later

Documents are disabled only because no object storage exists yet. To restore: provision an S3-compatible
bucket (or Vercel Blob), reimplement the read/write in `lib/uploads.js` against it, revert the five
`/api/**/documents*` route handlers to their original guarded implementations, and re-add the nav item,
quick action, member-detail card and portal "My Documents" upload widget. `lib/files.js` and the
`UploadDocument` component were intentionally kept to make this straightforward.

### Hardening (ongoing)

Optional 2FA on `/workstation/login`, session-timeout tuning in `lib/auth.js` (currently 12h), dependency
updates, and monitoring/alerting on Vercel + Neon.


## Key domain facts encoded in the app

- River Edge Rural Village: Portion 2 of Farm 970, Cove Ridge East, Buffalo City Metropolitan Municipality — 31.9 ha, 216 plots × 800 m², 165 families.
- Erf numbering follows the official survey layout plan (`lib/plan-layout.js` holds the digitised bands, block zones and map coordinates, including subdivided erven 1A, 145A/145B, 165A, 186A, 203A).
- All The Mheza Trust projects are administered by **River Edge Primary Co-Op**.
- Official banking details (per Absa confirmation letter dated 15/08/2026): **Absa**, account name **River Edge SA Primary Co-operative Ltd**, registration **202500243224**, account number **4121013447**, branch code **632005**, account type **Current**. These are hardcoded in `components/site/Footer.jsx`, `app/(site)/trust-info/page.jsx` and the member portal dashboard (`app/(site)/portal/dashboard/page.jsx`) — the account is held by the Co-Op, not the Trust, so label it accordingly.
- The Mheza Trust registration number **IT000099/2024(E)**; original seller **Mr Albert Shaw**; Trust attorney **Mr Webb**. Contact: **081 391 7967 / 081 708 2669 / 081 488 5448**, themhezatrust@gmail.com. These live in `lib/contact.js` (`TRUST`) and are the single source of truth for every page.
- Registered domain: **themhezatrust.co.za** (`https://themhezatrust.co.za`). Held in `lib/contact.js` as `TRUST.website` / `TRUST.siteUrl`, shown in the footer, `/contact` and `/trust-info`, and used for SEO `metadataBase` / `og:url` in `app/layout.jsx` (override per-environment with `NEXT_PUBLIC_SITE_URL` in `.env`).
- Pricing: **R75,000 promotional** (full payment) until **30 November 2026**, then **R90,000** standard with payment plans.
- A buyer acquires a heritable **Right of Use**, not a title deed; ownership stays with the Trust until transfer to the CPA. Full text published at `/terms` (`app/(site)/terms/page.jsx`).
- Status: **Application for Rezoning to Residential Zoning 4 (Townhouse)** — BCMM is prepared to consider an application (meeting 18 Aug 2026, Mr Kershan Naidoo, City Planner: Land Use Management). The previous application was rejected for **procedural** reasons under Section 74(c) of the BCMM SPLUM By-Law, not on the merits. Sanitation no-objection received; Waterworks response awaited; CPA registration in progress with DALRRD. The full public text is the "BCMM Zoning Status" section on `/status` (`app/(site)/status/page.jsx`).
- Payment reference format: **`Plot Number – Buyer Name`** (en-dash), per Terms and Conditions of Sale clause 6.4 — e.g. `12 – Your Full Name`. This is the single source of truth; the banking copy in `app/(site)/trust-info/page.jsx`, `components/site/Footer.jsx`, the plot pages, the member portal and the staff payment form all match it.
