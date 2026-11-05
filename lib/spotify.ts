import type { Account, EntryKind, SpotifyType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const spotifyUrlRegex =
  /(?:https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([A-Za-z0-9]+))(?:\?.*)?$/i;

const tokenUrl = "https://accounts.spotify.com/api/token";
const apiBase = "https://api.spotify.com/v1";

type ParsedSpotifyLink = {
  type: SpotifyType;
  id: string;
};

function toSpotifyType(value: string): SpotifyType {
  switch (value.trim().toLowerCase()) {
    case "track":
      return "TRACK";
    case "album":
      return "ALBUM";
    case "playlist":
      return "PLAYLIST";
    default:
      throw new Error("Unsupported Spotify link type");
  }
}

export function parseSpotifyLink(url: string): ParsedSpotifyLink {
  const normalized = url.trim();
  const match = normalized.match(spotifyUrlRegex);

  if (!match) {
    throw new Error("Please paste a valid Spotify track, album, or playlist URL.");
  }

  return {
    type: toSpotifyType(match[1]),
    id: match[2]
  };
}

async function refreshSpotifyToken(account: Account): Promise<string> {
  if (!account.refresh_token) {
    throw new Error("Spotify refresh token missing. Please sign in again.");
  }

  const basicAuth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refresh_token
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params,
    signal: AbortSignal.timeout(8_000)
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Spotify access token.");
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const expiresAt = Math.floor(Date.now() / 1000) + json.expires_in;

  const saved = await prisma.account.updateMany({
    where: { id: account.id, access_token: account.access_token, refresh_token: account.refresh_token },
    data: {
      access_token: json.access_token,
      expires_at: expiresAt,
      refresh_token: json.refresh_token ?? account.refresh_token
    }
  });

  if (saved.count) return json.access_token;

  const current = await prisma.account.findUniqueOrThrow({ where: { id: account.id } });
  if (!current.access_token) throw new Error("Spotify account is not connected.");
  return current.access_token;
}

export async function getSpotifyAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "spotify"
    }
  });

  if (!account?.access_token) {
    throw new Error("Spotify account is not connected.");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = account.expires_at ?? 0;

  if (expiresAt - 60 > now) {
    return account.access_token;
  }

  return refreshSpotifyToken(account);
}

type SpotifyMetadata = {
  entryKind: EntryKind;
  title: string;
  subtitle: string | null;
  artistName: string | null;
  albumName: string | null;
  releaseDate: string | null;
  imageUrl: string | null;
  spotifyUrl: string;
};

export function inferAlbumEntryKind(albumTypeRaw: unknown, totalTracksRaw: unknown): EntryKind {
  const albumType = String(albumTypeRaw ?? "").trim().toLowerCase();
  const totalTracks = Number(totalTracksRaw ?? 0);

  if (albumType === "album") {
    return "ALBUM";
  }

  if (albumType === "single") {
    return totalTracks > 1 ? "EP" : "TRACK";
  }

  if (totalTracks > 1) {
    return "EP";
  }

  return "ALBUM";
}

export function firstImageUrl(images: Array<{ url: string }> | undefined): string | null {
  if (!images || images.length === 0) {
    return null;
  }
  return images[0]?.url ?? null;
}

export async function fetchSpotifyMetadata(
  token: string,
  type: SpotifyType,
  id: string
): Promise<SpotifyMetadata> {
  const path = type === "TRACK" ? "tracks" : type === "ALBUM" ? "albums" : "playlists";
  const response = await fetch(`${apiBase}/${path}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to fetch Spotify metadata for this link.");
  }

  const json = (await response.json()) as Record<string, unknown>;

  if (type === "TRACK") {
    const artists = Array.isArray(json.artists)
      ? json.artists
          .map((artist) => (artist as { name?: string }).name)
          .filter((name): name is string => Boolean(name))
      : [];

    const album = json.album as
      | {
          name?: string;
          release_date?: string;
          images?: Array<{ url: string }>;
        }
      | undefined;

    return {
      entryKind: "TRACK",
      title: String(json.name ?? "Unknown Track"),
      subtitle: artists.join(", ") || null,
      artistName: artists.join(", ") || null,
      albumName: album?.name ?? null,
      releaseDate: album?.release_date ?? null,
      imageUrl: firstImageUrl(album?.images),
      spotifyUrl: String((json.external_urls as { spotify?: string } | undefined)?.spotify ?? "")
    };
  }

  if (type === "ALBUM") {
    const artists = Array.isArray(json.artists)
      ? json.artists
          .map((artist) => (artist as { name?: string }).name)
          .filter((name): name is string => Boolean(name))
      : [];

    const entryKind = inferAlbumEntryKind(json.album_type, json.total_tracks);

    return {
      entryKind,
      title: String(json.name ?? "Unknown Album"),
      subtitle: artists.join(", ") || null,
      artistName: artists.join(", ") || null,
      albumName: String(json.name ?? "Unknown Album"),
      releaseDate: (json.release_date as string | undefined) ?? null,
      imageUrl: firstImageUrl(json.images as Array<{ url: string }> | undefined),
      spotifyUrl: String((json.external_urls as { spotify?: string } | undefined)?.spotify ?? "")
    };
  }

  return {
    entryKind: "PLAYLIST",
    title: String(json.name ?? "Unknown Playlist"),
    subtitle: (json.owner as { display_name?: string } | undefined)?.display_name ?? null,
    artistName: null,
    albumName: null,
    releaseDate: null,
    imageUrl: firstImageUrl(json.images as Array<{ url: string }> | undefined),
    spotifyUrl: String((json.external_urls as { spotify?: string } | undefined)?.spotify ?? "")
  };
}
