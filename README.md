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
| Uploads    | Local `storage/uploads`, served only via authenticated routes (swap for S3-compatible storage in production) |
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

## Production deployment notes

1. **PostgreSQL**: in `prisma/schema.prisma` change `provider = "sqlite"` → `provider = "postgresql"` and set `DATABASE_URL` to your Postgres connection string. The schema is fully compatible (JSON-ish data stored as strings). Then `npx prisma db push` (or migrate) — do **not** run the seed in production.
2. **Secrets**: set a strong `JWT_SECRET` environment variable.
3. **Email/SMS**: inquiry submissions currently log to the server console and create workstation notifications. Wire `app/api/public/inquiries/route.js` to SendGrid/Mailgun (member emails) and Twilio (SMS) — the integration point is marked in the file.
4. **File storage**: uploads live in `storage/uploads` (deliberately **outside** `public/`) and are served only through authenticated routes — `GET /api/documents/file/[name]` (staff `documents:view`, honouring per-document role restrictions), `GET /api/members/documents/file/[name]` (staff `members:view`) and `GET /api/portal/documents/file/[name]` (the owning member only). Replace the local disk writes in `lib/uploads.js` with S3-compatible storage for multi-instance deployments, keeping the same authorization checks.
5. **Hardening checklist**: enable HTTPS/SSL at the proxy, optional 2FA on `/workstation/login`, session timeout tuning in `lib/auth.js` (currently 12h), scheduled database backups, and dependency updates.

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
