# Staff Training Material — The Mheza Trust Workstation

## Session 1: Orientation (30 min)

**Goal:** every staff member can sign in, understand their role's scope, and navigate the workstation.

1. Sign in at `/login` (choose **Administrator / Staff**) or go directly to `/workstation` with your issued credentials. Change your password immediately (Settings → Profile).
2. Tour the sidebar: every module is visible to every staff role.
3. Understand the permission model:
   - You can **view everything**; what you can **change** depends on your role — Administrator (everything, including staff accounts), Finance & Member Records (finances, payroll, members, inquiries, documents, communications) or Plot Administrator (plot records and layout). Read-only pages say so with an amber banner and show no edit buttons.
   - Every create/update/delete is written to the audit log, which every role can read at Settings → Audit.
4. Dashboard walkthrough: stats, sales trend, quick actions, notifications bell, your tasks.

**Exercise:** log in, locate your assigned tasks, mark one notification as read.

## Session 2: Sales Pipeline (45 min — Finance & Member Records, Administrator)

**Goal:** handle an inquiry from arrival to converted member.

1. Public forms (Express Interest, Register Interest, Viewing Request, Contact) create **Inquiries** with status NEW and notify the Finance & Member Records team.
2. Workflow: New → assign to yourself → Contacted (after first call) → Converted (member created) or Closed.
3. **Convert to Member** pre-fills the member record; the interested plot moves to Reserved (or Sold when payment clears).
4. Plot status discipline — the map is the single source of truth:
   - Green Available · Yellow Reserved (deposit received) · Red Sold (paid in full or on an approved plan).
   - Only **Plot Administrators** (Sipho, Sydney, Lihle) can change plot size, availability or layout position; everyone else can read it. Ask them before promising a status change.
   - Erf numbers follow the official survey layout plan, including subdivided erven (1A, 145A/145B, 165A, 186A, 203A). Always quote the erf number, not a row/column.
5. Promotional rules: R75,000 requires **full payment** before 30 Nov 2026; after that R90,000 with 6/12/24-month plans.

**Exercise:** convert a seeded inquiry into a member and reserve their plot.

## Session 3: Finance (45 min — Finance & Member Records, Administrator)

**Goal:** record money accurately and keep member balances correct.

1. Recording a member payment (Members → member → Record Payment) automatically:
   - creates the Payment,
   - posts a matching Income entry,
   - notifies the team.
   Never create a duplicate manual Income row for the same money.
2. Reference format `Plot Number – Buyer Name` (Terms and Conditions of Sale clause 6.4) — reconcile weekly against the bank statement.
3. Expenses: use the correct category (Salaries, Contractor, Supplies, Fees, Legal, Marketing).
4. Cash Flow tab: review inflow/outflow and closing balance monthly; P&L summary feeds trustee reporting.
5. Payroll: gross less PAYE/UIF/SDL = net; generate payslips before month-end.

**Exercise:** record a R7,500 instalment, then find it in the cash-flow chart.

## Session 4: Compliance & Departments (45 min — Administrator; others attend to understand the record)

Only the Administrator can change department records and follow-up dates; Finance & Member Records and Plot Administrators can read them and should report any interaction to the Administrator the same day.

**Goal:** keep the approvals record complete and current.

1. Every department contact (BCMM, DALRRD, Sanitation, Waterworks, IEM, City Health, DWA, DEDEA, Roads, Engineering) has a status: Pending / In Progress / Approved / No Objection / Rejected.
2. **Log every interaction** the same day: date, method, summary, next steps, and set the follow-up date.
3. Overdue follow-ups show red — clear them before weekly meetings.
4. Documents module: upload submissions and responses to the Department folder with tags; set role visibility when sensitive.
5. These department records are **confidential — staff-only**. They no longer appear on the public website; the public Status page carries only the project timeline and public announcements. Treat contact officials, direct numbers and internal notes as sensitive.

**Exercise:** log a mock call with the Waterworks Division and set a follow-up two weeks out.

## Session 5: Members & Communication (30 min — all roles)

1. Member records are legal records: capture ID numbers, beneficiaries and addresses exactly as on documents.
2. Member portal support: members **sign themselves up** at `/portal/register` and must be logged in to see anything — payments, balances and documents never appear publicly or to another member. When someone calls about a balance, read it from their member page — never quote from memory.
3. A self sign-up creates the member record **and** files the erf preference as a new inquiry, and notifies the Finance & Member Records team. Someone must contact the member, confirm the allocation, and record payments; until then their portal shows no plot and no balance.
4. If a member cannot sign up because "we could not verify your details", the Trust already holds their email but the ID number or phone on file does not match — correct the record, then have them try again.
5. Uploaded files are stored outside the web root and are only served through authenticated download routes; a member can fetch their own files, staff with member/document view rights can fetch any. Never email a document link as a way of sharing it.
6. Internal messages for one-to-one; announcements for team-wide news.
7. Templates (Communication tab) standardize payment reminders and follow-ups.
8. The **Terms and Conditions of Sale** (`/terms`) are public and binding on every buyer — know where clause 6 (payment and the non-payment ladder), clause 7 (Right of Use Certificate and transfer fee) and clause 9 (Community Constitution) sit, because most member calls start there.

## Session 6: Security & Governance (30 min — all roles)

- Never share credentials; Administrators issue and reset accounts.
- Role changes are made by the Administrator (Bongani Sifiniza) and recorded in the meeting minutes.
- Suspicious activity: check the audit log (Settings → Audit) and report to the Administrator.
- Sessions expire after 12 hours; the workstation is for Trust devices/networks where possible.
- Backups: database file + `storage/uploads` directory are backed up per the deployment schedule.
- Member personal and financial data is never exposed on the public website: the public plot pages carry erf number, size, price and availability only.

## Quick-reference card

| I want to… | Go to |
|---|---|
| See today's new inquiries | Dashboard → Notifications, or Inquiries (status NEW) |
| Record a payment | Members → member → Record Payment |
| Reserve a plot | Plots → click plot → Mark Reserved |
| Check BCMM status | Departments → BCMM card |
| Post team news | Communication → Announcements |
| Assign work | Tasks → Add Task |
| Find a document | Documents → folder/tag search |
| Add a staff user | Settings → Users (Admin only) |
