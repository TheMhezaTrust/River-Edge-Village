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
