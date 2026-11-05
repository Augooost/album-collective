import { prisma } from "@/lib/prisma";

export function connectedPeople(userId: string) {
  return prisma.user.findMany({
    where: { OR: [{ id: userId }, { accounts: { some: { provider: "spotify" } } }] },
    select: { id: true, name: true, image: true },
    orderBy: [{ name: "asc" }, { id: "asc" }]
  });
}
