import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { StatsShell } from "@/components/stats/StatsShell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StatsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "desc" }
  });

  return <StatsShell entries={entries} userImage={session.user.image ?? null} />;
}
