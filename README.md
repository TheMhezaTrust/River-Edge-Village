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
| Uploads    | Vercel Blob (presigned browser uploads) for the photo gallery and each member's document vault. The Trust-level document library is still **disabled** — `/api/documents*` and `/api/members/documents*` return 410, with `lib/uploads.js` + `lib/files.js` retained for re-enable |
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

The portal is a separate app section (`app/portal/`) with its own layout: it deliberately does **not** inherit the public site chrome (no navbar, footer, chat widget or page-view tracker) and sets `robots: noindex`. Signed-in members land in `app/portal/(shell)/` — a sidebar shell (`components/portal/PortalShell.jsx`) with Dashboard, My Profile, My Beneficiaries, My Plot Details, Payments & Statement, plus a print-ready Statement of Account at `/portal/statement`. Signed-out screens (`/portal`, `/portal/access`, `/portal/password`) share `components/portal/PortalAuthPage.jsx`.

`app/robots.js` serves `/robots.txt` disallowing `/portal` and `/workstation` for every user agent, so crawlers are told not to request the private areas at all rather than relying on the per-page `noindex` tag alone. Note the two mechanisms trade off: a disallowed URL cannot be fetched, so a crawler that finds a link to it elsewhere cannot read its `noindex` tag and may still list the bare URL without a description. Both are kept on purpose — the disallow stops the pages being crawled, the tag stops any that are reached from being indexed.

The 146 imported members are **portal-inactive**: each has a generated placeholder email (`…@placeholder.mheza.invalid`), a placeholder phone where the roster supplied none, and **no password**. Public self-registration has been removed — member accounts are created and managed from the administrator dashboard (`/workstation/members`) only. Imported members have **no payment history** — balances show the full erf price as outstanding until Finance records payments.

### Portal access lifecycle

A member cannot sign in until the office issues credentials. From a member's record in the workstation (`/workstation/members/[id]` → **Member Portal Access**, `components/ws/PortalAccessPanel.jsx`) staff with `members:manage` can do either, both gated by the password-confirm modal:

1. **Email an access link** — `POST /api/members/[id]/portal-access` mints a single-use 32-byte token, stores only its SHA-256 hash (`MemberToken`), emails the link via Resend and never returns the token to the caller. It expires after 30 minutes (`TOKEN_TTL_MINUTES` in `lib/member-access.js`) and is consumed on use. `purpose` is `ACTIVATE` for a first invitation and `RESET` when the office answers a forgotten-password call. Requires `RESEND_API_KEY`; without it the panel's error tells staff to use option 2.
2. **Set a temporary password** — `POST /api/members/[id]/portal-password` generates an unambiguous 12-character password (shown once, with a copy button) and sets `Member.mustChangePassword`. The shell layout bounces such a member to `/portal/password` before any portal page renders, so the flag is enforced server-side.

The member sets or changes their own password at `/portal/access?token=…` (link) or `/portal/password` (forced change). Both post to `/api/portal/access` / `/api/portal/change-password`. Members can also self-serve a reset from the **Forgot password?** form on `/portal` → `POST /api/portal/forgot-password`, which is rate-limited per IP *and* per address but always returns the same generic message, so it cannot be used to discover which addresses belong to members.

### Portal session timeout

Members are held to a **15-minute inactivity window** (`PORTAL_SESSION_SECONDS` / `PORTAL_SESSION_TTL` in `lib/auth.js`); staff keep the 12-hour session. `startPortalSession(member)` signs a short-lived JWT into the `mheza_portal` cookie, and `PortalShell` re-issues it via `POST /api/portal/heartbeat` every 4 minutes — but only while the tab is visible *and* the member has actually been active, so a background tab cannot defeat the timeout. A client-side idle timer shows a 60-second warning with a "Stay signed in" action, then logs out and returns to `/portal?reason=timeout`.

### Portal data privacy (POPIA)

Every portal page loads through `loadPortalMember()` (`lib/portal-data.js`) and every portal API through `getActivePortalMember()` (`lib/auth.js`). Both derive the member id **only** from the verified session cookie — no portal route accepts a member id parameter — so no query in the portal can be pointed at somebody else's record. Per-plot payment lists are additionally filtered by `memberId`. Members cannot see other members, the Trust's internal financials (`Income`/`Expense`), the farmer's contract, or anything under `/workstation`. A member may edit their own contact number, addresses and (with their current password) email via `PUT /api/portal/me`; **name and ID number are not editable** — those go to `POST /api/portal/change-request`, which writes a `MemberChangeRequest` and a staff notification, and the office approves or rejects it from the **Portal change requests** panel on `/workstation/members` (approval requires the password-confirm modal because it writes to the member record).

Portal tables (`MemberToken`, `MemberChangeRequest`) and the two new `Member` columns (`mustChangePassword`, `lastLoginAt`) are auto-provisioned at runtime by `ensureMemberAccessTables()` in `lib/provision.js`, like the other additive tables. `Plot.certificateIssuedAt` is provisioned the same way by `ensurePlotCertificateColumn()`, `Member.purchaseDate` / `Plot.purchasedAt` / `Income.paymentId` by `ensureMemberRecordColumns()`, and `MemberDocument.sizeKb` / `uploadedById` by `ensureMemberDocumentColumns()`. Because the generated Prisma client selects every column of a model, `lib/prisma.js` starts **all four** eagerly on first import rather than waiting for a portal request; otherwise the first deploy would break **every** member, plot and income query in the app until the columns existed. (The public pages and the public inquiry API use explicit `select`s, so they are not exposed.) The eager call is deliberately not awaited so a cold start is not blocked, which means the routes that actually read a new column `await` the same cached promise themselves before querying — `loadPortalMember()`, the member/plot/finance/report/dashboard APIs, the payment-correction route and the member-document routes.

### Right of Use Status

`/portal/plot` shows each member a **Right of Use Status** with exactly two possible values, defined once in `RIGHT_OF_USE` (`lib/format.js`) and read through `rightOfUseLabel(plot.certificateIssuedAt)`:

- **Granted (Certificate Pending)** — `certificateIssuedAt` is null. This is the default for every plot, including all 146 imported members, because no Certificate of Land Use has been issued yet.
- **Active (Certificate Issued)** — the Trust has recorded the certificate as issued.

The status turns on certificate issuance, **not** on whether the plot is paid off; the payment position is shown separately as "Paid on this plot" and "Balance on this plot". Staff set it from `/workstation/plots` → click a plot → **Mark certificate issued** (or **Undo certificate issued**), which `PUT`s `{certificateIssued: true|false}` to `/api/plots/[id]` and stores the current timestamp or null. Marking it issued does not by itself put a file in the member's hands — upload the scanned certificate to that member's vault (below) with the category **Certificate of Land Use** and it appears in their portal immediately.

### Correcting a member's record against the signed contract

Purchase prices, plot sizes and payment histories are **not** uniform: members bought at different times, at different prices, and some hold more than one erf. Everything the import auto-filled can therefore be overridden from `/workstation/members/[id]`, and each change is reflected in the member's portal immediately.

- **Per-plot** — `PUT /api/plots/[id]` accepts `number`, `block`, `sizeSqm`, `price` and `purchasedAt` (the date *that erf* was bought), plus `memberId` to attach or release a holder; reassigning sets the status to `SOLD`, releasing sets it to `AVAILABLE`, and a duplicate erf number inside the same project is rejected. Changing a plot number desyncs it from its survey-plan position and from the `Plot Number – Buyer Name` bank reference convention (T&C 6.4), so the UI warns before saving.
- **Per-member** — `PUT /api/members/[id]` accepts `purchaseDate` ("date joined"; the portal falls back to `createdAt` when it is null) and `purchasePrice`. An empty `purchasePrice` clears the override back to `null` rather than to `0`, because `memberPrice()` (`lib/member-totals.js`) prefers the override whenever it is not null — the old coercion would have zeroed the member's balance on every screen.
- **Past payments** — `PUT`/`DELETE /api/payments/[id]`, held behind the `payments:correct` permission (**Administrator only**; Finance & Member Records can still *add* payments via `POST /api/members/[id]/payments`) and a fresh password confirmation, since this rewrites money already recorded as received.

Each payment also writes an `Income` row, and Finance reports on `Income` while the member's statement reports on `Payment`. `Income.paymentId` (unique, `ON DELETE SET NULL`) links the two, so a correction updates or deletes its income row in the same transaction and the cashflow report cannot drift from the statement; `DELETE /api/finance/income` refuses to remove a linked row and points at the member's record instead. Rows captured **before** the link existed cannot be matched reliably, so they are left untouched and the response carries `incomeSynced: false`, which the UI turns into an instruction to correct that income row by hand. Every correction is audited with before/after values.

### Member document vault (signed contracts)

Every member has a vault holding the paperwork the Trust issued them — the signed and stamped **Acknowledgement of Payment and Plot Allocation**, a Certificate of Land Use, a signed contract. Staff manage it from **Member Contracts** on `/workstation/members/[id]`; the member reads it at `/portal/documents` (**My Documents**), where each file can be viewed or downloaded.

- **Upload** — PDF only, up to 25 MB, sent from the browser straight into Vercel Blob by the presigned flow (`uploadPresigned` → `POST /api/member-documents/upload` → `issueSignedToken`), so a large scan never passes through a serverless function. The signed token is `put`-scoped to one exact pathname under `member-documents/<memberId>/`, is issued only to a session holding `documents:manage` **with a fresh password confirmation**, and enforces the content type and size limit server-side as well as in the browser. The row that makes the file appear in the vault is written by `POST /api/members/[id]/documents`.
- **Download** — always through a proxy (`GET /api/member-documents/[id]/file` for staff, `GET /api/portal/documents/[id]/file` for the member), which streams the object back rather than redirecting to it. **The Blob URL is never sent to a browser**: it is a permanent public link and these are signed legal documents carrying ID numbers, so `safeDocument()` strips `filePath` from every JSON response, and `isBlobUrl()` (`lib/member-documents.js`) stops a stored path from pointing the proxy anywhere else. File names are sanitised before they go into `Content-Disposition`. The member route takes its id from the verified session and puts it *in the lookup*, so somebody else's document is a 404 rather than a 403 — it does not exist as far as that route is concerned.
- **Delete** — `DELETE /api/members/[id]/documents/[docId]`, scoped by member id *and* document id, behind `documents:manage` plus a password confirmation; the Blob object is removed best-effort afterwards, since the member's access ends the moment the row goes.
- **Who** — `documents:manage` is held by Administrators *and* by Finance & Member Records, who capture the payments these acknowledgements confirm. `documents:view` is every role, so a Plot Administrator can read a member's contracts but cannot add to or remove from the vault.

Uploads and deletions are audited as `MEMBER_DOCUMENT_UPLOADED` / `MEMBER_DOCUMENT_DELETED`. The vault is separate from the Trust-level document library, which is still disabled — see *Re-enabling documents later*.

## Roles & permissions

Defined in `lib/roles.js`. Every staff role can **view every module**; only writes are restricted. Each API route handler calls `guard("resource:action")` before touching data, and the workstation UI hides controls the current role cannot use.

- **Administrator** (Bongani Sifiniza) — everything, including user management, settings and the audit log
- **Finance & Member Records** (Thandile Sifiniza, Sisanda Toni, Nokuthula Gedle) — changes to finances, payroll, member/customer records, inquiries, the document library and member communications; everything else read-only
- **Plot Administrator** (Sipho Jauka, Sydney Velapi, Lihle Jacob) — changes to plot records: erf number, size, availability, price, block, purchase date and layout position; everything else read-only

Editing or deleting a payment that has already been captured (`payments:correct`) is deliberately **not** part of `finance:manage`, so it does not reach Finance & Member Records through any role list — only the two administrator roles hold it.

All three roles can also manage their own tasks and view the staff directory (Settings → Users) and the audit log. Pages a role cannot edit show a "Read-only view" banner and hide every add/edit/delete control.

### Main Administrator (backend-only)

One staff account is designated the **Main Administrator** (`SUPER_ADMIN_EMAIL`, default `bongani.sifiniza@themhezatrust.local` — see `lib/super-admin.js`). The role is written to the database automatically the first time that account signs in or opens the workstation. There is no UI control for it: no administrator can grant it to someone else, take it away, or deactivate that account from Settings → Users.

It is deliberately invisible — the role label is **"Administrator"**, identical to any other administrator, on both the public website and the workstation. Only two things differ, for this account alone:

- **Traffic Analytics** (`/workstation/analytics`) — public-website traffic: unique visitors and page views for today / this week / this month / this year, a 30-day trend chart and a most-visited-pages breakdown (recharts). The sidebar link renders only for this account; everyone else, including other administrators, gets a 404 on the route.
- **Security-question password recovery** — below.

### Password recovery (two security questions)

**Forgot password?** on `/workstation/login` leads to `/workstation/recover`: work email → security question 1 → security question 2 → new password. Each correct answer exchanges a short-lived (10 minute) signed stage token for the next step, so no step can be skipped, and the questions are revealed only inside that flow.

The Main Administrator sets both questions and answers in **Settings → Profile → Password Recovery Questions** (current password required). Answers are normalised (case- and spacing-insensitive) and stored as **bcrypt hashes**; the question text is never returned to the settings screen, so changing them means entering all four values again.

Brute-force protection: five wrong answers lock recovery for 30 minutes (the counters live on the `SecurityQuestion` row, so they survive serverless restarts), plus a per-IP limit on every step. Accounts without recovery questions — every other staff account and all members — receive a generic "ask the administrator" response, which also avoids confirming that an email address exists.

### Website traffic tracking

`components/site/PageViewTracker.jsx` (mounted in `app/(site)/layout.jsx`) posts the current path to `/api/track` on every public page view, including client-side navigations. Only the allow-listed public sections in `lib/analytics.js` are accepted; `/workstation`, `/api`, `/portal`, `/login` and the administrator-only `/plots` are never recorded. Visitors are identified by `ipHash` — a salted SHA-256 of the IP address (`ANALYTICS_SALT`, falling back to `JWT_SECRET`) — so unique visitors can be counted without storing raw IPs. The `PageView` table is auto-provisioned on first use.

### Email (Resend)

`lib/email.js` sends through the Resend REST API (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`) — a plain `fetch`, no SDK. Two things use it: the **new-inquiry notification** that `app/api/public/inquiries/route.js` sends to the Trust inbox (`TRUST.email` in `lib/contact.js`) every time a visitor submits a website form, and **Reply to Customer** in an inquiry's detail view under `/workstation/inquiries` (any role holding `inquiries:manage` — Administrator, Finance & Member Records).

The notification is best-effort: it is sent after the inquiry row and the in-app staff notifications are written, inside its own `try/catch`, so a Resend outage never costs the Trust a submission and the visitor still sees the success message. Failures are logged to the server console. It deliberately omits the ID/passport a visitor may have entered — that stays on the inquiry record, but an identity number is not copied into a shared mailbox — and writes no `InquiryReply` row, because that history is for emails to the customer.

`POST /api/inquiries/[id]/reply` sends first and only then writes, so the history never claims an email went out that the provider rejected; a failure is still stored with the provider's message so staff can see the customer was not reached. A successful send moves the inquiry `NEW → CONTACTED`. Deliberately it does **not** touch an inquiry that is already `CONVERTED` or `CLOSED`, which would otherwise corrupt the conversion-rate figure on that page.

Every attempt is written to `InquiryReply` — the inquiry's communication history, the equivalent of `DepartmentLog` for government engagements — and to the audit log as `INQUIRY_REPLY_SENT` / `INQUIRY_REPLY_FAILED`. The table is auto-provisioned on first use, like the other additive tables. The body is sent as plain text and the customer's answer is routed to `EMAIL_REPLY_TO`.

## Project structure

```
app/
  (site)/            # public website: home, about, projects, plots, status,
                     # trust-info, terms, contact, login (staff + member chooser)
  portal/            # member portal — own layout, no public site chrome
    page.jsx         # sign-in (+ forgot password)
    access/          # set a password from an emailed single-use link
    password/        # forced change of an office-issued temporary password
    (shell)/         # authenticated sidebar shell
      dashboard/ profile/ beneficiaries/ plot/ payments/ statement/
  workstation/
    login/           # staff sign-in
    recover/         # security-question password recovery (Main Administrator)
    (app)/           # authenticated shell (sidebar + notifications)
      page.jsx       # dashboard (stats, charts, quick actions)
      analytics/     # public-website traffic (Main Administrator only)
      members/ plots/ finance/ documents/ departments/
      inquiries/ tasks/ communication/ reports/ settings/
  api/               # route handlers (auth, portal, public, members, plots,
                     # finance, documents, departments, inquiries, tasks,
                     # communication, admin, dashboard, reports, track)
components/          # shared UI: ui.jsx, PlotMap.jsx, InterestForm.jsx, site/, ws/,
                     # portal/ (shell, icons, profile + statement widgets)
lib/                 # prisma.js, provision.js (runtime CREATE TABLE), auth.js
                     # (JWT/RBAC server), roles.js (client-safe), super-admin.js,
                     # security-questions.js, rate-limit.js, analytics.js,
                     # email.js (Resend transport), api-client.js, contact.js
                     # (Trust details), files.js (authenticated
                     # download URLs), format.js, plan-layout.js, uploads.js
prisma/              # schema.prisma + seed.js
storage/uploads/     # uploaded files — never inside public/, so not statically served
docs/                # user guide & training material
```

## Production deployment (Vercel + Neon)

The app is a **Next.js SSR** application (server components + API route handlers), so it must run on a
platform that executes Node at request time. The chosen target is **Vercel** (Next-native) with a
**Neon** serverless Postgres database. Vercel's filesystem is ephemeral, which is why SQLite and
local-disk uploads cannot be used in production — hence the Postgres migration, and hence object storage
(**Vercel Blob**) for the photo gallery and for each member's document vault. The Trust-level document
library was disabled at launch and has not been ported to Blob; it still returns 410.

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
   | `SUPER_ADMIN_EMAIL` | `bongani.sifiniza@themhezatrust.local` | optional — staff account holding the backend-only Main Administrator role (Traffic Analytics + security-question recovery) |
   | `ANALYTICS_SALT` | any long random string | optional — salt for the hashed visitor IP; falls back to `JWT_SECRET` |
   | `RESEND_API_KEY` | `re_…` from resend.com | enables outbound email (inquiry replies). Without it the Reply to Customer button reports that email is not configured |
   | `EMAIL_FROM` | `The Mheza Trust <inquiries@themhezatrust.co.za>` | must be an address on the domain verified in Resend |
   | `EMAIL_REPLY_TO` | `themhezatrust@gmail.com` | optional — where a customer's answer lands |

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
- Verify the vault is isolated too: upload a PDF from **Member Contracts**, confirm it appears under
  **My Documents** for that member, and confirm a *different* member's session gets **404** from
  `/api/portal/documents/<id>/file` for it.
- Verify the Trust-level library is still off: `/api/documents*` and `/api/members/documents*` return **410**.
- If `DEEPSEEK_API_KEY` is set, exercise the Mheza widget and confirm it never leaks member/staff data.
- Submit one test inquiry through the live contact form and confirm the notification reaches
  `themhezatrust@gmail.com` — this also proves the Resend domain (SPF/DKIM) is verified, without which
  sends fail and are only visible in the Vercel function logs (see "Email (Resend)").
- Enable Neon **point-in-time / scheduled backups** and Vercel deployment protection for Preview URLs.

### 6. Re-enabling the Trust-level document library later

Object storage now exists — the Vercel Blob store the gallery and the member vault both use — so the
library is disabled only because nobody has ported it. The member vault is the reference implementation:
copy the presigned upload (`app/api/member-documents/upload/route.js`), the metadata routes
(`app/api/members/[id]/documents/`), and the streaming download proxy (`lib/member-documents.js`), then
restore `/workstation/documents`, its nav item and the quick action. `lib/uploads.js` and `lib/files.js`
are the abandoned on-disk implementation and nothing imports them; delete them when the port is done.

### Hardening (ongoing)

Optional 2FA on `/workstation/login`, session-timeout tuning in `lib/auth.js` (currently 12h), dependency
updates, and monitoring/alerting on Vercel + Neon.


## Key domain facts encoded in the app

- River Edge Rural Village: Portion 2 of Farm 970, Cove Ridge East, Buffalo City Metropolitan Municipality — 31.9 ha, 216 plots × 800 m², 165 families.
- Erf numbering follows the official survey layout plan (`lib/plan-layout.js` holds the digitised bands, block zones and map coordinates, including subdivided erven 1A, 145A/145B, 165A, 186A, 203A).
- All The Mheza Trust projects are administered by **River Edge Primary Co-Op**.
- Official banking details (per Absa confirmation letter dated 15/08/2026): **Absa**, account name **River Edge SA Primary Co-operative Ltd**, registration **202500243224**, account number **4121013447**, branch code **632005**, account type **Current**. These are hardcoded in `components/site/Footer.jsx`, `app/(site)/trust-info/page.jsx` and `components/portal/BankingDetails.jsx` (used on the member portal dashboard, payments page and statement) — the account is held by the Co-Op, not the Trust, so label it accordingly.
- The Mheza Trust registration number **IT000099/2024(E)**; original seller **Mr Albert Shaw**; Trust attorney **Mr Webb**. Contact: **081 391 7967 / 081 708 2669 / 081 488 5448**, themhezatrust@gmail.com. These live in `lib/contact.js` (`TRUST`) and are the single source of truth for every page. The **seller and attorney names are gated**: on the public site they are replaced with a neutral fallback for visitors who are not logged in, and only shown in full once a member has a portal session. The gating helpers `sellerName(isMember, fallback)` / `attorneyName(isMember, fallback)` live in `lib/contact.js` and are used by the homepage, `/trust-info`, `/status` and `/terms`.
- Registered domain: **themhezatrust.co.za** (`https://themhezatrust.co.za`). Held in `lib/contact.js` as `TRUST.website` / `TRUST.siteUrl`, shown in the footer, `/contact` and `/trust-info`, and used for SEO `metadataBase` / `og:url` in `app/layout.jsx` (override per-environment with `NEXT_PUBLIC_SITE_URL` in `.env`).
- Pricing: **R75,000 promotional** (full payment) until **30 November 2026**, then **R90,000** standard with payment plans.
- A buyer acquires a heritable **Right of Use**, not a title deed; ownership stays with the Trust until transfer to the CPA. Full text published at `/terms` (`app/(site)/terms/page.jsx`).
- Status: **Application for Rezoning to Residential Zoning 4 (Townhouse)** — BCMM is prepared to consider an application (meeting 18 Aug 2026, Mr Kershan Naidoo, City Planner: Land Use Management). The previous application was rejected for **procedural** reasons under Section 74(c) of the BCMM SPLUM By-Law, not on the merits. Sanitation no-objection received; Waterworks response awaited; CPA registration in progress with DALRRD. The full public text is the "BCMM Zoning Status" section on `/status` (`app/(site)/status/page.jsx`).
- Payment reference format: **`Plot Number – Buyer Name`** (en-dash), per Terms and Conditions of Sale clause 6.4 — e.g. `12 – Your Full Name`. This is the single source of truth; the banking copy in `app/(site)/trust-info/page.jsx`, `components/site/Footer.jsx`, the plot pages, the member portal and the staff payment form all match it.
