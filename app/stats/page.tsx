import { redirect } from "next/navigation";

import { StatsShell } from "@/components/stats/StatsShell";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function StatsPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id },
    select: { entryKind: true, subtitle: true, addedAt: true },
    orderBy: { addedAt: "desc" }
  });

  return <StatsShell entries={entries} />;
}
