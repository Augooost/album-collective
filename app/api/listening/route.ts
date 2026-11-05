import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { syncListening } from "@/lib/listening";
import { prisma } from "@/lib/prisma";

const sharingSchema = z.object({
  share: z.boolean(),
  onboarding: z.boolean().default(false)
});

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return Response.json({ synced: await syncListening(userId) });
  } catch (error) {
    console.error("Spotify history sync failed", error instanceof Error ? error.name : "Unknown error");
    const message = error instanceof Error && error.message.startsWith("Spotify ")
      ? error.message
      : "Couldn’t refresh listening history. Try again in a moment.";
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = sharingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid sharing preference." }, { status: 400 });

  const { share, onboarding } = parsed.data;
  const updated = await prisma.user.updateMany({
    where: {
      id: userId,
      ...(share ? { listeningEnabled: true } : {}),
      ...(onboarding ? { sharingChoiceMade: false } : {})
    },
    data: { shareListeningHistory: share, sharingChoiceMade: true }
  });
  if (!updated.count) {
    const settings = await prisma.user.findUnique({
      where: { id: userId },
      select: { listeningEnabled: true, shareListeningHistory: true, sharingChoiceMade: true }
    });
    if (settings?.sharingChoiceMade && settings.shareListeningHistory === share && (!share || settings.listeningEnabled)) {
      return Response.json({ share });
    }
    const error = share && !settings?.listeningEnabled
      ? "Connect Spotify history first."
      : "Your sharing preference has already been set. You can change it in Listening settings.";
    return Response.json({ error }, { status: 409 });
  }
  return Response.json({ share });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        listeningEnabled: false,
        shareListeningHistory: false,
        sharingChoiceMade: true,
        listeningSyncedAt: null
      }
    }),
    prisma.recentAlbum.deleteMany({ where: { userId } })
  ]);
  return Response.json({ enabled: false, share: false });
}
