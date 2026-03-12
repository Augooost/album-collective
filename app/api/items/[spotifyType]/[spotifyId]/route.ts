import { SpotifyType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  rating: z.number().min(0).max(5),
  notes: z.string().max(300).optional().default("")
});

function normalizeSpotifyType(value: string): SpotifyType {
  const upper = value.trim().toUpperCase();

  if (upper === "TRACK" || upper === "ALBUM" || upper === "PLAYLIST") {
    return upper;
  }

  throw new Error("Invalid Spotify type.");
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

    const entries = await prisma.journalEntry.findMany({
      where: {
        spotifyType,
        spotifyId: resolvedParams.spotifyId
      },
      orderBy: {
        addedAt: "desc"
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    if (entries.length === 0) {
      return Response.json({ error: "Item not found." }, { status: 404 });
    }

    const item = entries[0];
    const reviews = entries
      .filter((entry) => entry.rating !== null)
      .sort((a, b) => {
        const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
        if (ratingDiff !== 0) {
          return ratingDiff;
        }

        return +new Date(b.addedAt) - +new Date(a.addedAt);
      })
      .map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        name: entry.user.name,
        email: entry.user.email,
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
      item: {
        id: item.id,
        spotifyType: item.spotifyType,
        spotifyId: item.spotifyId,
        entryKind: item.entryKind,
        title: item.title,
        artistName: item.artistName,
        imageUrl: item.imageUrl,
        releaseDate: item.releaseDate,
        sharedByName: item.user.name,
        sharedByEmail: item.user.email,
        sharedAt: item.addedAt,
        spotifyUrl: item.spotifyUrl
      },
      overallRating,
      reviews,
      currentUserReview: currentUserReview
        ? {
            rating: currentUserReview.rating,
            notes: currentUserReview.notes
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

    const review = await prisma.journalEntry.findFirst({
      where: {
        userId,
        spotifyType,
        spotifyId: resolvedParams.spotifyId
      }
    });

    if (!review) {
      return Response.json(
        { error: "You do not have a review for this item yet." },
        { status: 404 }
      );
    }

    const updated = await prisma.journalEntry.update({
      where: { id: review.id },
      data: {
        rating: parsed.rating,
        notes: parsed.notes || null
      }
    });

    return Response.json({
      review: {
        id: updated.id,
        rating: updated.rating,
        notes: updated.notes
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update review.";

    return Response.json({ error: message }, { status: 400 });
  }
}
