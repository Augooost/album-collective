import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CatalogShell } from "@/components/catalog/CatalogShell";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CatalogPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/");
  }

  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "desc" }
  });

  return <CatalogShell entries={entries} userImage={session.user.image ?? null} />;
}
