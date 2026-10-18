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

function cached(ddl) {  let pending = null;
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
