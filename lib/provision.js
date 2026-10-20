import { prisma } from "./prisma.js";

// Additive tables are created on first use so a feature works in any
// environment without a manual `prisma db push` (mirrors the existing
// SiteContent / TermsAcceptance / GalleryImage pattern). The DDL matches
// Prisma's PostgreSQL mapping for the model in prisma/schema.prisma, and the
// promise is cached per server instance so the statements run at most once.

const SECURITY_QUESTION_DDL = [
  `CREATE TABLE IF NOT EXISTS "SecurityQuestion" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "question1" TEXT NOT NULL,
    "answer1Hash" TEXT NOT NULL,
    "question2" TEXT NOT NULL,
    "answer2Hash" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityQuestion_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SecurityQuestion_userId_key" ON "SecurityQuestion"("userId")`,
];

const PAGE_VIEW_DDL = [
  `CREATE TABLE IF NOT EXISTS "PageView" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "PageView_timestamp_idx" ON "PageView"("timestamp")`,
  `CREATE INDEX IF NOT EXISTS "PageView_path_idx" ON "PageView"("path")`,
];

// The foreign keys are declared inline rather than with separate ALTER TABLE
// statements so the whole thing stays idempotent: once the table exists,
// CREATE TABLE IF NOT EXISTS skips the constraints too. Names and referential
// actions match what `prisma migrate diff` generates for the model.
const INQUIRY_REPLY_DDL = [
  `CREATE TABLE IF NOT EXISTS "InquiryReply" (
    "id" SERIAL NOT NULL,
    "inquiryId" INTEGER NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "providerId" TEXT,
    "error" TEXT,
    "sentById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryReply_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InquiryReply_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InquiryReply_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "InquiryReply_inquiryId_idx" ON "InquiryReply"("inquiryId")`,
];

// Portal access needs two columns on the Member table that already exists in
// production, plus two new tables. CREATE TABLE IF NOT EXISTS cannot add
// columns, so those use ADD COLUMN IF NOT EXISTS — also idempotent.
const MEMBER_ACCESS_DDL = [
  `ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`,
  `CREATE TABLE IF NOT EXISTS "MemberToken" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'ACTIVATE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MemberToken_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MemberToken_tokenHash_key" ON "MemberToken"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "MemberToken_memberId_idx" ON "MemberToken"("memberId")`,
  `CREATE TABLE IF NOT EXISTS "MemberChangeRequest" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "currentValue" TEXT,
    "proposedValue" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberChangeRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MemberChangeRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberChangeRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "MemberChangeRequest_memberId_idx" ON "MemberChangeRequest"("memberId")`,
  `CREATE INDEX IF NOT EXISTS "MemberChangeRequest_status_idx" ON "MemberChangeRequest"("status")`,
];

// The Right of Use status shown to a member turns on whether the Trust has
// issued the Certificate of Land Use for that erf, which is a fact about the
// plot rather than about its payment balance — so it needs its own column.
const PLOT_CERTIFICATE_DDL = [
  `ALTER TABLE "Plot" ADD COLUMN IF NOT EXISTS "certificateIssuedAt" TIMESTAMP(3)`,
];

// Correcting a member's record against their signed contract needs a purchase
// date on both the member and each plot (a member's erven were often bought at
// different times), plus a link from the income row a payment generates back to
// that payment — without it, editing or deleting a captured payment would leave
// the cashflow report disagreeing with the member's statement.
const MEMBER_RECORD_DDL = [
  `ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3)`,
  `ALTER TABLE "Plot" ADD COLUMN IF NOT EXISTS "purchasedAt" TIMESTAMP(3)`,
  `ALTER TABLE "Income" ADD COLUMN IF NOT EXISTS "paymentId" INTEGER`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Income_paymentId_key" ON "Income"("paymentId")`,
  // ADD CONSTRAINT has no IF NOT EXISTS, so guard it against the catalog.
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Income_paymentId_fkey') THEN
      ALTER TABLE "Income" ADD CONSTRAINT "Income_paymentId_fkey"
        FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,
];

// A member's vault holds the signed paperwork the Trust issues them, with the file
// itself in Vercel Blob. The table has been in the schema since the start, but
// whether it exists in a given database cannot be checked from here, so the
// CREATE TABLE stays in front as idempotent insurance and the two new columns are
// added separately — they are what the client selects on every read of the table.
const MEMBER_DOCUMENT_DDL = [
  `CREATE TABLE IF NOT EXISTS "MemberDocument" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MemberDocument_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `ALTER TABLE "MemberDocument" ADD COLUMN IF NOT EXISTS "sizeKb" INTEGER`,
  `ALTER TABLE "MemberDocument" ADD COLUMN IF NOT EXISTS "uploadedById" INTEGER`,
  `CREATE INDEX IF NOT EXISTS "MemberDocument_memberId_idx" ON "MemberDocument"("memberId")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MemberDocument_uploadedById_fkey') THEN
      ALTER TABLE "MemberDocument" ADD CONSTRAINT "MemberDocument_uploadedById_fkey"
        FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,
];

// The formal bookkeeping the Income/Expense operational rows post into: a chart of
// accounts, double-entry transactions with balanced journal lines, the budget "jars"
// each incoming payment is split across, period locking, opening balances and
// beneficiary distributions. Tables are created in FK-safe order — parents before the
// rows that reference them — because a fresh database starts with none of them.
const LEDGER_DDL = [
  `CREATE TABLE IF NOT EXISTS "Account" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Account_code_key" UNIQUE ("code")
  )`,
  `CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" SERIAL NOT NULL,
    "txnNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "periodKey" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" INTEGER,
    "vatApplicable" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reversesId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Transaction_txnNo_key" UNIQUE ("txnNo")
  )`,
  `CREATE INDEX IF NOT EXISTS "Transaction_periodKey_idx" ON "Transaction"("periodKey")`,
  `CREATE INDEX IF NOT EXISTS "Transaction_date_idx" ON "Transaction"("date")`,
  `CREATE INDEX IF NOT EXISTS "Transaction_type_idx" ON "Transaction"("type")`,
  `CREATE TABLE IF NOT EXISTS "BudgetCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BudgetCategory_name_key" UNIQUE ("name")
  )`,
  `CREATE TABLE IF NOT EXISTS "JournalLine" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memo" TEXT,
    "budgetCategoryId" INTEGER,
    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "JournalLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "JournalLine_transactionId_idx" ON "JournalLine"("transactionId")`,
  `CREATE INDEX IF NOT EXISTS "JournalLine_accountId_idx" ON "JournalLine"("accountId")`,
  `CREATE TABLE IF NOT EXISTS "Allocation" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "budgetCategoryId" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Allocation_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES "BudgetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Allocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Allocation_transactionId_idx" ON "Allocation"("transactionId")`,
  `CREATE INDEX IF NOT EXISTS "Allocation_budgetCategoryId_idx" ON "Allocation"("budgetCategoryId")`,
  `CREATE TABLE IF NOT EXISTS "FinancialPeriod" (
    "id" SERIAL NOT NULL,
    "periodKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedById" INTEGER,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialPeriod_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinancialPeriod_periodKey_key" UNIQUE ("periodKey")
  )`,
  `CREATE TABLE IF NOT EXISTS "OpeningBalance" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "asAt" TIMESTAMP(3) NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "transactionId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpeningBalance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OpeningBalance_accountId_asAt_key" UNIQUE ("accountId","asAt"),
    CONSTRAINT "OpeningBalance_transactionId_key" UNIQUE ("transactionId"),
    CONSTRAINT "OpeningBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Distribution" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientIdNumber" TEXT,
    "memberId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "nature" TEXT NOT NULL,
    "note" TEXT,
    "transactionId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Distribution_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Distribution_transactionId_key" UNIQUE ("transactionId")
  )`,
  `CREATE INDEX IF NOT EXISTS "Distribution_date_idx" ON "Distribution"("date")`,
];

// The audit log gained the before/after columns an auditor reads directly, plus a
// tamper-evident hash chain. ALTER TABLE (not CREATE) because AuditLog already exists
// in every database; the columns are additive and default to null on existing rows.
const AUDIT_TRAIL_DDL = [
  `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "oldValue" TEXT`,
  `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "newValue" TEXT`,
  `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "entryHash" TEXT`,
  `ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "prevHash" TEXT`,
];

function cached(ddl) {
  let pending = null;
  return () => {
    if (!pending) {
      pending = (async () => {
        for (const sql of ddl) await prisma.$executeRawUnsafe(sql);
      })().catch((e) => {
        pending = null;
        throw e;
      });
    }
    return pending;
  };
}

export const ensureSecurityQuestionTable = cached(SECURITY_QUESTION_DDL);
export const ensurePageViewTable = cached(PAGE_VIEW_DDL);
export const ensureInquiryReplyTable = cached(INQUIRY_REPLY_DDL);
export const ensureMemberAccessTables = cached(MEMBER_ACCESS_DDL);
export const ensurePlotCertificateColumn = cached(PLOT_CERTIFICATE_DDL);
export const ensureMemberRecordColumns = cached(MEMBER_RECORD_DDL);
export const ensureMemberDocumentColumns = cached(MEMBER_DOCUMENT_DDL);
export const ensureLedgerTables = cached(LEDGER_DDL);
export const ensureAuditTrailColumns = cached(AUDIT_TRAIL_DDL);
