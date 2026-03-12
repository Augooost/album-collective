"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FilterPill } from "@/components/catalog/FilterPill";
import { SidebarNavButton } from "@/components/catalog/SidebarNavButton";
import { TopSearchBar } from "@/components/catalog/TopSearchBar";
import { EntryDetailSheet } from "@/components/item/EntryDetailSheet";

type FeedEntry = {
  id: string;
  spotifyType: "TRACK" | "ALBUM" | "PLAYLIST";
  spotifyId: string;
  entryKind: "TRACK" | "ALBUM" | "EP" | "PLAYLIST";
  title: string;
  subtitle: string | null;
  artistName: string | null;
  releaseDate: string | null;
  imageUrl: string | null;
  spotifyUrl: string;
  notes: string | null;
  addedAt: string | Date;
  user: {
    name: string | null;
    email: string | null;
  } | null;
  sharedByName?: string | null;
  sharedByEmail?: string | null;
  sharedAt?: string | Date;
};

type Props = {
  entries: FeedEntry[];
  userImage: string | null;
};

const PAGE_SIZE = 12;

function relativeTime(dateValue: string | Date): string {
  const now = Date.now();
  const then = +new Date(dateValue);
  const diffHours = Math.max(1, Math.floor((now - then) / 3_600_000));

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const days = Math.floor(diffHours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(dateValue).toLocaleDateString();
}

function yearFromDate(releaseDate: string | null, addedAt: string | Date): string {
  if (releaseDate && releaseDate.length >= 4) {
    return releaseDate.slice(0, 4);
  }
  return new Date(addedAt).getFullYear().toString();
}

export function HomeShell({ entries, userImage }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [shareRating, setShareRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<FeedEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.title, entry.artistName ?? entry.subtitle ?? "", entry.user?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [entries, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  async function submitShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: shareUrl, notes: shareNote, rating: shareRating })
      });

      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to add link.");
      }

      setShareUrl("");
      setShareNote("");
      setShareRating(0);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to add link.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="catalog-page">
      <aside className="catalog-sidebar">
        <div className="catalog-brand">
          <img src="/design-reference/logo/logo.svg" alt="Album Collective" />
        </div>
        <div className="catalog-side-main">
          <SidebarNavButton
            href="/"
            label="Home"
            iconSrc="/design-reference/icons/home.svg"
            active
          />
          <SidebarNavButton
            href="/catalog"
            label="Catalog"
            iconSrc="/design-reference/icons/catalog.svg"
          />
          <SidebarNavButton
            href="/stats"
            label="Stats"
            iconSrc="/design-reference/icons/stats.svg"
          />
        </div>
        <div className="catalog-side-bottom">
          <button className="catalog-side-btn" type="button">
            <span className="catalog-side-icon catalog-theme-dot" aria-hidden="true" />
            <span>Theme</span>
          </button>
          <button className="catalog-side-btn" type="button">
            <img
              src="/design-reference/icons/paste.svg"
              alt=""
              aria-hidden="true"
              className="catalog-side-icon"
            />
            <span>Drop Link</span>
          </button>
        </div>
      </aside>

      <section className="catalog-main">
        <header className="catalog-top-row">
          <div className="catalog-top-left-dot" />
          <TopSearchBar value={search} onChange={setSearch} />
          <div className="catalog-avatar">
            {userImage ? <img src={userImage} alt="Profile" /> : <span>U</span>}
          </div>
        </header>

        <section className="catalog-filter-row">
          <FilterPill>
            <span className="home-chip-label">Recent Activity</span>
          </FilterPill>
          <FilterPill>
            <span className="home-chip-label">Shared Albums</span>
          </FilterPill>
          <FilterPill>
            <span className="home-chip-label">{entries.length} Total Items</span>
          </FilterPill>
        </section>

        <section className="catalog-content stack">
          <h2>Recent Shares</h2>

          <form className="home-share-form" onSubmit={submitShare}>
            <input
              type="url"
              placeholder="Paste Spotify album/EP/track URL"
              value={shareUrl}
              onChange={(event) => setShareUrl(event.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Optional note"
              value={shareNote}
              onChange={(event) => setShareNote(event.target.value)}
              maxLength={300}
            />
            <div className="home-rating-group">
              <label htmlFor="share-rating">Rating</label>
              <input
                id="share-rating"
                type="number"
                min={0}
                max={5}
                step={0.25}
                value={shareRating}
                onChange={(event) => setShareRating(Number(event.target.value))}
              />
              <span>{shareRating.toFixed(2)}</span>
            </div>
            <button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Link"}
            </button>
          </form>

          {error ? <p className="error">{error}</p> : null}

          <div className="catalog-grid home-feed-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {visible.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="catalog-card-button"
                onClick={() =>
                  setSelectedEntry({
                    ...entry,
                    sharedByName: entry.user?.name ?? null,
                    sharedByEmail: entry.user?.email ?? null,
                    sharedAt: entry.addedAt
                  })
                }
              >
                <article className="catalog-album-card home-feed-card">
                  <div className="catalog-cover-wrap">
                    {entry.imageUrl ? (
                      <img src={entry.imageUrl} alt={entry.title} className="catalog-cover" />
                    ) : null}
                  </div>
                  <div className="catalog-album-meta">
                    <p className="catalog-album-title">{entry.title}</p>
                    <div className="catalog-album-sub">
                      <p>{entry.artistName ?? entry.subtitle ?? "Unknown Artist"}</p>
                      <span>{yearFromDate(entry.releaseDate, entry.addedAt)}</span>
                    </div>
                    {entry.notes ? <p className="home-note">“{entry.notes}”</p> : null}
                    <p className="home-meta-line">
                      {entry.user?.name ?? entry.user?.email ?? "Anonymous"} • {relativeTime(entry.addedAt)}
                    </p>
                  </div>
                </article>
              </button>
            ))}
          </div>

          <div className="catalog-load-wrap">
            {hasMore ? (
              <button className="catalog-load-more" type="button" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                Load More
              </button>
            ) : null}
          </div>
        </section>
      </section>
      <EntryDetailSheet
        item={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
