import { SpotifyType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { visibleListening } from "@/lib/listening";
import { prisma } from "@/lib/prisma";
import { MAX_MOOD_LENGTH, MAX_MOOD_TAGS, readMoodTags, uniqueMoods } from "@/lib/moods";

const updateSchema = z.object({
  rating: z.number().min(0).max(5).nullable(),
  mood: z.string().trim().min(1).max(MAX_MOOD_LENGTH).nullable().optional(),
  moodTags: z.array(z.string().trim().min(1).max(MAX_MOOD_LENGTH)).max(MAX_MOOD_TAGS).optional(),
  notes: z.string().max(300).optional().default("")
});

function normalizeSpotifyType(value: string): SpotifyType {
  const upper = value.trim().toUpperCase();

  if (upper === "TRACK" || upper === "ALBUM" || upper === "PLAYLIST") {
    return upper;
  }

  throw new Error("Invalid Spotify type.");
}

function findRecentAlbum(userId: string, spotifyId: string) {
  return prisma.recentAlbum.findFirst({
    where: { ...visibleListening(userId), spotifyId },
    orderBy: { playedAt: "desc" },
    include: { user: { select: { name: true } } }
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ spotifyType: string; spotifyId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const resolvedParams = await params;
    const spotifyType = normalizeSpotifyType(resolvedParams.spotifyType);

    const [entries, taggedEntries] = await Promise.all([prisma.journalEntry.findMany({
      where: {
        spotifyType,
        spotifyId: resolvedParams.spotifyId,
        OR: [{ catalogOnly: false }, { userId }]
      },
      orderBy: {
        addedAt: "desc"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    }), prisma.journalEntry.findMany({
      where: { userId, OR: [{ mood: { not: null } }, { moodTags: { isEmpty: false } }] },
      select: { mood: true, moodTags: true }
    })]);

    const item = entries.find((entry) => !entry.catalogOnly) ?? entries[0];
    const recent = !item && spotifyType === "ALBUM"
      ? await findRecentAlbum(userId, resolvedParams.spotifyId)
      : null;
    if (!item && !recent) return Response.json({ error: "Item not found." }, { status: 404 });

    const reviews = entries
      .filter((entry) => entry.rating !== null || entry.notes)
      .sort((a, b) => {
        const ratingDiff = (b.rating ?? -1) - (a.rating ?? -1);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }

        return +new Date(b.addedAt) - +new Date(a.addedAt);
      })
      .map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        name: entry.user.name,
        image: entry.user.image,
        rating: entry.rating,
        notes: entry.notes,
        addedAt: entry.addedAt
      }));

    const ratingEntries = entries.filter((entry) => entry.rating !== null);
    const overallRating =
      ratingEntries.length > 0
        ? ratingEntries.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) /
          ratingEntries.length
        : null;

    const currentUserReview = entries.find((entry) => entry.userId === userId) ?? null;

    return Response.json({
      item: item ? {
        id: item.id,
        spotifyType: item.spotifyType,
        spotifyId: item.spotifyId,
        entryKind: item.entryKind,
        title: item.title,
        artistName: item.artistName,
        imageUrl: item.imageUrl,
        releaseDate: item.releaseDate,
        sharedByName: item.catalogOnly ? null : item.user.name,
        sharedAt: item.catalogOnly ? null : item.addedAt,
        spotifyUrl: item.spotifyUrl
      } : {
        spotifyId: resolvedParams.spotifyId,
        entryKind: recent?.entryKind,
        title: recent?.title,
        artistName: recent?.artistName,
        imageUrl: recent?.imageUrl,
        releaseDate: recent?.releaseDate,
        sharedByName: recent?.user.name,
        sharedAt: recent?.playedAt,
        spotifyType,
        spotifyUrl: `https://open.spotify.com/album/${resolvedParams.spotifyId}`
      },
      overallRating,
      reviews,
      savedMoodTags: uniqueMoods(taggedEntries.flatMap(readMoodTags)),
      canReview: spotifyType === "ALBUM" || currentUserReview !== null,
      currentUserReview: currentUserReview
        ? {
            rating: currentUserReview.rating,
            notes: currentUserReview.notes,
            mood: currentUserReview.mood,
            moodTags: readMoodTags(currentUserReview)
          }
        : null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load item details.";

    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ spotifyType: string; spotifyId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const resolvedParams = await params;
    const spotifyType = normalizeSpotifyType(resolvedParams.spotifyType);
    const body = await request.json();
    const parsed = updateSchema.parse(body);

    const spotifyId = resolvedParams.spotifyId;
    const where = { userId_spotifyType_spotifyId: { userId, spotifyType, spotifyId } };
    const notes = parsed.notes.trim() || null;
    const hasReview = parsed.rating !== null || notes !== null;
    const tags = parsed.moodTags !== undefined ? uniqueMoods(parsed.moodTags)
      : parsed.mood !== undefined ? (parsed.mood ? [parsed.mood] : []) : undefined;
    const data = {
      rating: parsed.rating,
      notes,
      ...(tags && { mood: tags[0] ?? null, moodTags: tags }),
      ...(hasReview ? { catalogOnly: false } : {})
    };
    const reviewFields = { rating: true, notes: true, mood: true, moodTags: true } as const;
    const [existing] = await prisma.journalEntry.updateManyAndReturn({
      where: where.userId_spotifyType_spotifyId, data, select: reviewFields
    });
    if (existing) return Response.json({ review: { ...existing, moodTags: readMoodTags(existing) } });
    if (spotifyType !== "ALBUM") {
      return Response.json({ error: "You do not have a review for this item yet." }, { status: 404 });
    }
    if (!hasReview && !tags?.length) {
      return Response.json({ error: "Add a rating, note, or mood to save this album." }, { status: 400 });
    }
    const source = await prisma.journalEntry.findFirst({ where: { spotifyType, spotifyId, catalogOnly: false } })
      ?? await findRecentAlbum(userId, spotifyId);
    if (!source) return Response.json({ error: "Album not found." }, { status: 404 });

    const spotifyUrl = `https://open.spotify.com/album/${spotifyId}`;
    const updated = await prisma.journalEntry.upsert({
      where,
      create: {
        ...where.userId_spotifyType_spotifyId,
        ...data,
        catalogOnly: !hasReview,
        entryKind: source.entryKind,
        title: source.title,
        artistName: source.artistName,
        albumName: source.title,
        subtitle: source.artistName,
        imageUrl: source.imageUrl,
        releaseDate: source.releaseDate,
        sourceUrl: spotifyUrl,
        spotifyUrl
      },
      update: data,
      select: reviewFields
    });

    return Response.json({ review: { ...updated, moodTags: readMoodTags(updated) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update review.";

    return Response.json({ error: message }, { status: 400 });
  }
}
