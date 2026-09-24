// Imports prisma/data-export.json (dumped from the old SQLite dev.db) into the
// Postgres database pointed at by DATABASE_URL. Run AFTER `prisma db push`.
// Preserves original ids so all relations stay intact, then resets sequences.
//   node prisma/import-to-postgres.mjs
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const p = new PrismaClient();
const dump = JSON.parse(readFileSync(new URL("./data-export.json", import.meta.url), "utf8"));
const M = dump._models;

// FK-safe insert order (parents before children).
const ORDER = [
  ["project", "Project"],
  ["user", "User"],
  ["member", "Member"],
  ["department", "Department"],
  ["employee", "Employee"],
  ["income", "Income"],
  ["expense", "Expense"],
  ["announcement", "Announcement"],
  ["plot", "Plot"],
  ["payment", "Payment"],
  ["inquiry", "Inquiry"],
  ["document", "Document"],
  ["memberDocument", "MemberDocument"],
  ["departmentLog", "DepartmentLog"],
  ["task", "Task"],
  ["message", "Message"],
  ["notification", "Notification"],
  ["auditLog", "AuditLog"],
];

async function main() {
  for (const [key, table] of ORDER) {
    const rows = M[key] || [];
    if (rows.length === 0) {
      console.log(`${key}: 0 (skip)`);
      continue;
    }
    await p[key].createMany({ data: rows, skipDuplicates: true });
    console.log(`${key}: imported ${rows.length}`);
  }

  // Advance identity sequences past the explicitly-inserted ids.
  for (const [, table] of ORDER) {
    await p.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`
    );
  }
  console.log("sequences reset");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
