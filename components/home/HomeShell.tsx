"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { MoodTags } from "@/components/catalog/MoodTags";
import { PeopleRow, PeopleToggle, usePeopleFilter, type Person } from "@/components/catalog/PeopleFilters";
import { useCatalogFrame } from "@/components/catalog/CatalogFrame";
import { EntryDetailSheet } from "@/components/item/EntryDetailSheet";
import { spotifyListeningScopes } from "@/lib/spotify-scopes";

type FeedItem = {
  spotifyType: "TRACK" | "ALBUM" | "PLAYLIST";
  spotifyId: string;
  entryKind: "TRACK" | "ALBUM" | "EP" | "PLAYLIST";
  title: string;
  artistName: string | null;
  releaseDate: string | null;
  imageUrl: string | null;
  spotifyUrl: string;
  activityAt: string;
  isMine: boolean;
  myRating: number | null;
  moodTags: string[];
  userId: string;
  user: { name: string | null; image: string | null };
};

type Props = {
  userId: string;
  people: Person[];
  recent: FeedItem[];
  shared: FeedItem[];
  listeningEnabled: boolean;
  shareListeningHistory: boolean;
  showSharingPrompt: boolean;
  lastSyncedAt: string | null;
};

const filters = [
  { id: "recent", label: "Recent listening", heading: "Recently played", description: "Albums and releases you and your friends have been playing on Spotify." },
  { id: "mine", label: "Just me", heading: "My recent albums", description: "A look back at what you’ve been listening to lately." },
  { id: "friends", label: "Friends", heading: "Friends’ listening", description: "Discover albums from friends who share their recent listening." },
  { id: "shared", label: "Shared links", heading: "Shared links & reviews", description: "Music and reviews posted by members of the collective." }
] as const;
type View = (typeof filters)[number]["id"];
const PAGE_SIZE = 18;
const SHARING_RETURN_PARAM = "sharing-setup";
const SHARING_INTENT_MAX_AGE = 15 * 60_000;
const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

function listenerName(item: FeedItem) {
  return item.isMine ? "You" : item.user.name || "A friend";
}

async function request(path: string, options: RequestInit) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? "Something went wrong. Please try again.");
  }
  return response.json();
}

export function HomeShell({ userId, people, recent, shared, listeningEnabled, shareListeningHistory, showSharingPrompt, lastSyncedAt }: Props) {
  const router = useRouter();
  const peopleFilter = usePeopleFilter();
  const [view, setView] = useState<View>("recent");
  const { search, setSearch, sharedLinksVersion } = useCatalogFrame();
  const lastSharedVersion = useRef(sharedLinksVersion);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [sharingPromptDone, setSharingPromptDone] = useState(false);
  const sharingDialog = useRef<HTMLDialogElement>(null);
  const sharingIntentKey = `album-collective:sharing-setup:${userId}`;
  const promptOpen = showSharingPrompt && !sharingPromptDone;

  const refreshListening = useCallback(async () => {
    setSyncing(true);
    setFeedError(null);
    try {
      const result = await request("/api/listening", { method: "POST" }) as { synced: boolean };
      if (result.synced) router.refresh();
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : "Couldn’t refresh your listening.");
    } finally {
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    if (listeningEnabled) void refreshListening();
  }, [listeningEnabled, refreshListening]);

  async function connectHistory(shareAfterConnect = false) {
    setUpdating(true);
    setFeedError(null);
    let callbackUrl = "/";
    if (shareAfterConnect) {
      try {
        sessionStorage.setItem(sharingIntentKey, String(Date.now()));
        callbackUrl = `/?${SHARING_RETURN_PARAM}=1`;
      } catch {
        // The prompt can ask for a sharing choice again after Spotify connects.
      }
    }
    try {
      await signIn("spotify", { callbackUrl }, { scope: spotifyListeningScopes });
    } catch {
      setFeedError("Couldn’t connect to Spotify. Please try again.");
      setUpdating(false);
    }
  }

  const updateHistory = useCallback(async (action: "share" | "private" | "disconnect", onboarding = false) => {
    setUpdating(true);
    setFeedError(null);
    try {
      await request("/api/listening", action === "disconnect" ? { method: "DELETE" } : {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share: action === "share", onboarding })
      });
      if (onboarding) setSharingPromptDone(true);
      setSelected(null);
      router.refresh();
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : "Couldn’t update your listening settings.");
      if (onboarding) router.refresh();
    } finally {
      setUpdating(false);
    }
  }, [router]);

  useEffect(() => {
    if (promptOpen && !sharingDialog.current?.open) sharingDialog.current?.showModal();
  }, [promptOpen]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(SHARING_RETURN_PARAM) !== "1") return;
    url.searchParams.delete(SHARING_RETURN_PARAM);
    window.history.replaceState(window.history.state, "", url);

    let requestedAt = 0;
    try {
      requestedAt = Number(sessionStorage.getItem(sharingIntentKey));
      sessionStorage.removeItem(sharingIntentKey);
    } catch {
      return;
    }
    // A callback link alone can't opt anyone in.
    if (promptOpen && listeningEnabled && requestedAt > Date.now() - SHARING_INTENT_MAX_AGE) {
      void updateHistory("share", true);
    }
  }, [listeningEnabled, promptOpen, sharingIntentKey, updateHistory]);

  useEffect(() => {
    if (lastSharedVersion.current === sharedLinksVersion) return;
    lastSharedVersion.current = sharedLinksVersion;
    setSearch("");
    peopleFilter.setSelected([]);
    setView("shared");
    setVisibleCount(PAGE_SIZE);
  }, [sharedLinksVersion, setSearch, peopleFilter.setSelected]);

  function changeView(next: View) {
    setView(next);
    setVisibleCount(PAGE_SIZE);
  }

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const activeView = filters.find((filter) => filter.id === view) ?? filters[0];
  const query = search.trim().toLowerCase();
  const showSharedPreview = view === "recent" && !query && recent.length === 0;
  const showingShared = view === "shared" || showSharedPreview;
  const feed = showSharedPreview ? shared.filter((item) => item.spotifyType === "ALBUM") : showingShared ? shared : recent;
  const groups = new Map<string, FeedItem[]>();
  for (const item of feed) {
    if (peopleFilter.selected.length && !peopleFilter.selected.includes(item.userId)) continue;
    if ((view === "mine" && !item.isMine) || (view === "friends" && item.isMine)) continue;
    const key = `${item.spotifyType}:${item.spotifyId}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  const cards = [...groups.values()].filter((group) =>
    group.some((item) => [item.title, item.artistName, listenerName(item)].join(" ").toLowerCase().includes(query))
  );
  const empty = query ? "No albums match your search." : peopleFilter.selected.length
    ? "No albums for the selected people in this view."
    : view === "friends"
    ? "Albums will appear here when friends join and share their listening."
    : view === "shared" ? "Share a Spotify link to start the collection."
    : !listeningEnabled ? "Connect your Spotify history to bring your recent albums here."
    : syncing ? "Finding your recent albums…" : "No recent albums yet. Play something on Spotify and check back.";

  return (
    <>
      {promptOpen && (
        <dialog ref={sharingDialog} className="catalog-dialog" aria-labelledby="sharing-prompt-title"
          aria-describedby="sharing-prompt-description" onCancel={(event) => {
            event.preventDefault();
            if (!updating) void updateHistory("private", true);
          }}>
          <h2 id="sharing-prompt-title">Share your recent listening?</h2>
          <p id="sharing-prompt-description">
            Let signed-in Album Collective members see your recent Spotify albums and when you played them.
            You can change this anytime in Listening settings.
          </p>
          {feedError && <p className="error" role="alert">{feedError}</p>}
          <div className="catalog-dialog-actions">
            <button type="button" className="catalog-dialog-secondary" disabled={updating} autoFocus
              onClick={() => updateHistory("private", true)}>Keep private</button>
            <button type="button" disabled={updating}
              onClick={() => listeningEnabled ? updateHistory("share", true) : connectHistory(true)}>
              {listeningEnabled ? "Share my recent albums" : "Connect Spotify and share"}
            </button>
          </div>
        </dialog>
      )}
      <div className="catalog-filter-row home-toolbar catalog-people-toolbar">
        <div className="home-filters" aria-label="Listening feed">
          {filters.map((filter) => (
            <button key={filter.id} className="catalog-filter-pill home-filter" type="button"
              aria-pressed={view === filter.id} onClick={() => changeView(filter.id)}>
              {filter.label}
            </button>
          ))}
        </div>
        <details className="home-settings">
          <summary className="catalog-filter-pill home-filter" aria-label="Listening settings">
            <span className="home-settings-label">Listening settings</span>
            <span className="mobile-settings-label" aria-hidden="true">Settings</span>
          </summary>
          <div className="home-settings-panel stack-sm">
            <p><strong>Spotify listening history</strong></p>
            <p className="muted">Album Collective refreshes your recent albums when you open Home and shows up to 14 days of listening.</p>
            {listeningEnabled ? (
              <>
                <button type="button" onClick={() => updateHistory(shareListeningHistory ? "private" : "share")} disabled={updating}>
                  {shareListeningHistory ? "Stop sharing my listening" : "Share my recent albums"}
                </button>
                <p className="muted">{shareListeningHistory
                  ? "Members can see your recent albums. You can turn this off anytime."
                  : "Only you can see your listening. Turning on sharing makes recent albums visible to members."}</p>
                <button type="button" className="home-text-button" onClick={() => updateHistory("disconnect")} disabled={updating}>
                  Stop importing and clear history
                </button>
                <button type="button" className="home-text-button" onClick={() => connectHistory()} disabled={updating}>
                  Reconnect Spotify
                </button>
                <a className="muted" href="https://www.spotify.com/account/apps/" target="_blank" rel="noreferrer">
                  Manage Spotify app access
                </a>
              </>
            ) : <button type="button" onClick={() => connectHistory()} disabled={updating}>Connect Spotify history</button>}
          </div>
        </details>
        {listeningEnabled && <button className="catalog-filter-pill home-filter" type="button"
          disabled={syncing} onClick={refreshListening} title={lastSyncedAt ? `Last updated ${dateFormat.format(new Date(lastSyncedAt))}` : undefined}>
          {syncing ? "Refreshing…" : "Refresh"}
        </button>}
        <PeopleToggle open={peopleFilter.showPeople} onToggle={() => peopleFilter.setShowPeople((open) => !open)} />
        <PeopleRow people={people} viewerId={userId} selected={peopleFilter.selected} open={peopleFilter.showPeople}
          onToggle={(id) => { peopleFilter.togglePerson(id); setVisibleCount(PAGE_SIZE); }} />
      </div>

      <section className="catalog-content home-content">
        <div className="home-feed-heading">
          <div>
            <h1>{activeView.heading}</h1>
            <p className="muted">{activeView.description}</p>
          </div>
          {cards.length > 0 && !showSharedPreview && <span className="home-item-count">{cards.length} {cards.length === 1 ? "release" : "releases"}</span>}
        </div>

        {!listeningEnabled && (view === "recent" || view === "mine") && (
          <div className="home-connect">
            <div>
              <strong>Bring in your recent listening</strong>
              <p className="muted">Connect Spotify to see what you’ve played. Your history stays private until you choose to share it.</p>
            </div>
            <button type="button" onClick={() => connectHistory()} disabled={updating}>Connect Spotify history</button>
          </div>
        )}
        {feedError && <p className="error home-feed-error" role="alert">{feedError}</p>}

        {showSharedPreview && cards.length > 0 && <h3 className="home-preview-heading">From the collective</h3>}
        {cards.length === 0 ? <p className="home-empty muted" role="status">{empty}</p> : (
          <div className="catalog-grid home-feed-grid">
            {cards.slice(0, visibleCount).map(([item, ...others]) => (
              <button key={`${item.spotifyType}:${item.spotifyId}`} className="catalog-card-button" type="button"
                onClick={() => setSelected(item)} aria-label={`Open ${item.title} by ${item.artistName ?? "unknown artist"}`}>
                <article className="catalog-album-card home-feed-card">
                  <div className="catalog-cover-wrap">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt="" className="catalog-cover" loading="lazy" />
                      : <img src="/design-reference/icons/album.svg" alt="" className="home-cover-placeholder" />}
                    <MoodTags tags={item.moodTags} />
                  </div>
                  <div className="catalog-album-meta">
                    <p className="catalog-album-title" title={item.title}>{item.title}</p>
                    <div className="catalog-album-sub">
                      <p>{item.artistName ?? "Unknown artist"}</p>
                      <span>{item.releaseDate?.slice(0, 4)}</span>
                    </div>
                    <div className="home-card-footer">
                      <span className="home-listener">
                        {item.user.image && <img src={item.user.image} alt="" loading="lazy"
                          onError={(event) => { event.currentTarget.hidden = true; }} />}
                        <span title={[item, ...others].map(listenerName).join(", ")}>
                          {listenerName(item)}{others.length > 0 ? ` +${others.length}` : ""}
                        </span>
                      </span>
                      <span>{item.myRating === null ? dateFormat.format(new Date(item.activityAt)) : `★ ${item.myRating}`}</span>
                    </div>
                  </div>
                </article>
              </button>
            ))}
          </div>
        )}
        {cards.length > visibleCount && (
          <div className="catalog-load-wrap">
            <button className="catalog-load-more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Load More</button>
          </div>
        )}
        <p className="home-attribution muted">Music and listening history from <a href="https://open.spotify.com/" target="_blank" rel="noreferrer">Spotify</a>.</p>
      </section>

      <EntryDetailSheet
        key={selected ? `${selected.spotifyType}:${selected.spotifyId}` : "closed"}
        item={selected && { ...selected, sharedByName: listenerName(selected), sharedAt: selected.activityAt }}
        activityLabel={showingShared ? "Shared" : "Played"}
        onClose={() => setSelected(null)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}
