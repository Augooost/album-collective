import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchSpotifyMetadata,
  getSpotifyAccessToken,
  parseSpotifyLink
} from "@/lib/spotify";

const payloadSchema = z.object({
  url: z.string().url(),
  notes: z.string().max(300).optional().default(""),
  rating: z.number().min(0).max(5).optional()
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "desc" },
    take: 100
  });

  return Response.json({ entries });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = payloadSchema.parse(body);
    const link = parseSpotifyLink(parsed.url);
    const accessToken = await getSpotifyAccessToken(session.user.id);
    const metadata = await fetchSpotifyMetadata(accessToken, link.type, link.id);

    const entry = await prisma.journalEntry.upsert({
      where: {
        userId_spotifyType_spotifyId: {
          userId: session.user.id,
          spotifyType: link.type,
          spotifyId: link.id
        }
      },
      create: {
        userId: session.user.id,
        spotifyType: link.type,
        entryKind: metadata.entryKind,
        spotifyId: link.id,
        title: metadata.title,
        subtitle: metadata.subtitle,
        artistName: metadata.artistName,
        albumName: metadata.albumName,
        releaseDate: metadata.releaseDate,
        imageUrl: metadata.imageUrl,
        spotifyUrl: metadata.spotifyUrl || parsed.url,
        sourceUrl: parsed.url,
        notes: parsed.notes || null,
        rating: parsed.rating ?? null
      },
      update: {
        catalogOnly: false,
        entryKind: metadata.entryKind,
        title: metadata.title,
        subtitle: metadata.subtitle,
        artistName: metadata.artistName,
        albumName: metadata.albumName,
        releaseDate: metadata.releaseDate,
        imageUrl: metadata.imageUrl,
        spotifyUrl: metadata.spotifyUrl || parsed.url,
        sourceUrl: parsed.url,
        notes: parsed.notes || null,
        rating: parsed.rating
      }
    });

    return Response.json({ entry });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save link at this time.";

    return Response.json({ error: message }, { status: 400 });
  }
}
