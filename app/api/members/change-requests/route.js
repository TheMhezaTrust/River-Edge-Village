import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/auth";
import { ok } from "@/lib/api";
import { ensureMemberAccessTables } from "@/lib/provision";

// The queue of portal requests to change a name or ID number. Only staff who can
// manage members see it — these requests carry identity data.
export async function GET(req) {
  const { error } = await guard("members:view");
  if (error) return error;
  await ensureMemberAccessTables();

  const status = new URL(req.url).searchParams.get("status") || "PENDING";
  const where = status === "ALL" ? {} : { status };

  const requests = await prisma.memberChangeRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      member: { select: { id: true, fullName: true, idNumber: true, email: true, phone: true } },
      decidedBy: { select: { id: true, name: true } },
    },
  });
  return ok(requests);
}
