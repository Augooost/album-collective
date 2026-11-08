import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { firstImageUrl, getSpotifyAccessToken, inferAlbumEntryKind } from "@/lib/spotify";

export const LISTENING_HISTORY_START = "2026-01-01T00:00:00.000Z";
const SYNC_INTERVAL_MS = 5 * 60_000;

const recentPlaysSchema = z.object({
  items: z.array(z.object({
    played_at: z.string().datetime({ offset: true }),
    track: z.object({
      is_local: z.boolean().optional(),
      album: z.object({
        id: z.string().regex(/^[a-zA-Z0-9]+$/),
        name: z.string(),
        album_type: z.string(),
        total_tracks: z.number(),
        release_date: z.string().optional(),
        images: z.array(z.object({ url: z.string().url() })).optional(),
        artists: z.array(z.object({ name: z.string() })).optional()
      }).nullish()
    }).nullish()
  }).nullable().catch(null))
});

export function listeningCutoff() {
  return new Date(LISTENING_HISTORY_START);
}

export function visibleListening(userId: string): Prisma.RecentAlbumWhereInput {
  return {
    playedAt: { gte: listeningCutoff() },
    OR: [
      { userId, user: { listeningEnabled: true } },
      { user: { listeningEnabled: true, shareListeningHistory: true } }
    ]
  };
}

export async function syncListening(userId: string) {
  const now = new Date();
  const stale = {
    OR: [
      { listeningSyncedAt: null },
      { listeningSyncedAt: { lt: new Date(+now - SYNC_INTERVAL_MS) } }
    ]
  };
  const eligible = await prisma.user.findFirst({
    where: { id: userId, listeningEnabled: true, ...stale },
    select: { listeningSyncedAt: true }
  });
  if (!eligible) return false;

  const token = await getSpotifyAccessToken(userId);
  const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000)
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("Spotify couldn’t read your history. Reconnect Spotify to try again.");
  }
  if (!response.ok) throw new Error("Spotify history is temporarily unavailable. Try again in a moment.");

  const { items } = recentPlaysSchema.parse(await response.json());
  const cutoff = listeningCutoff();
  const albums = new Map<string, Prisma.RecentAlbumCreateManyInput & { playedAt: Date }>();
  for (const play of items) {
    const album = play?.track?.album;
    if (!play || !album || play.track?.is_local) continue;
    const playedAt = new Date(play.played_at);
    const previous = albums.get(album.id);
    if (playedAt < cutoff || (previous && previous.playedAt >= playedAt)) continue;
    albums.set(album.id, {
      userId,
      spotifyId: album.id,
      title: album.name,
      entryKind: inferAlbumEntryKind(album.album_type, album.total_tracks),
      artistName: album.artists?.map(({ name }) => name).join(", ") || null,
      releaseDate: album.release_date ?? null,
      imageUrl: firstImageUrl(album.images),
      playedAt
    });
  }

  return prisma.$transaction(async (tx) => {
    // Guard the write so an older sync can't replace a newer snapshot or undo a disconnect.
    const claimed = await tx.user.updateMany({
      where: { id: userId, listeningEnabled: true, listeningSyncedAt: eligible.listeningSyncedAt },
      data: { listeningSyncedAt: now }
    });
    if (!claimed.count) return false;

    await tx.recentAlbum.deleteMany({ where: { userId, playedAt: { lt: cutoff } } });
    if (albums.size) {
      const rows = [...albums.values()].map((album) => Prisma.sql`(
        ${album.userId}, ${album.spotifyId}, ${album.entryKind}::"EntryKind",
        ${album.title}, ${album.artistName}, ${album.releaseDate}, ${album.imageUrl}, ${album.playedAt}
      )`);

      // Merge each snapshot into the archive, keeping the latest play for each album.
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "RecentAlbum" (
          "userId", "spotifyId", "entryKind", "title", "artistName", "releaseDate", "imageUrl", "playedAt"
        ) VALUES ${Prisma.join(rows)}
        ON CONFLICT ("userId", "spotifyId") DO UPDATE SET
          "entryKind" = EXCLUDED."entryKind",
          "title" = EXCLUDED."title",
          "artistName" = EXCLUDED."artistName",
          "releaseDate" = EXCLUDED."releaseDate",
          "imageUrl" = EXCLUDED."imageUrl",
          "playedAt" = EXCLUDED."playedAt"
        WHERE "RecentAlbum"."playedAt" < EXCLUDED."playedAt"
      `);
    }
    return true;
  });
}
