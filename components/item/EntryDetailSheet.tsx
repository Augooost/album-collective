"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { AlbumShader } from "@/components/item/AlbumShader";
import { moods, type Mood } from "@/lib/moods";

type SelectedItem = {
  spotifyType: "TRACK" | "ALBUM" | "PLAYLIST";
  spotifyId: string;
  title: string;
  artistName: string | null;
  imageUrl: string | null;
  entryKind: "TRACK" | "ALBUM" | "EP" | "PLAYLIST";
  releaseDate: string | null;
  sharedByName?: string | null;
  sharedAt?: string | Date | null;
  spotifyUrl?: string;
};

type Review = {
  id: string;
  name: string | null;
  image: string | null;
  rating: number | null;
  notes: string | null;
  addedAt: string;
};

type DetailData = {
  item: SelectedItem;
  overallRating: number | null;
  reviews: Review[];
  canReview: boolean;
  currentUserReview: {
    rating: number | null;
    notes: string | null;
    mood: Mood | null;
  } | null;
};

type Props = {
  item: SelectedItem | null;
  activityLabel?: "Shared" | "Played";
  onClose: () => void;
  onSaved?: () => void;
};

const kinds = { ALBUM: "Album", TRACK: "Song", PLAYLIST: "Playlist", EP: "EP" };

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function EntryDetailSheet({ item, activityLabel = "Shared", onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const endpoint = item && `/api/items/${item.spotifyType}/${item.spotifyId}`;

  async function loadDetails(url: string, signal?: AbortSignal) {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(url, { cache: "no-store", signal });
      const json = await response.json() as DetailData & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Couldn’t load album details.");

      setData(json);
      setRating(json.currentUserReview?.rating?.toString() ?? "");
      setNotes(json.currentUserReview?.notes ?? "");
      setMood(json.currentUserReview?.mood ?? null);
    } catch (error) {
      if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : "Couldn’t load album details.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (!endpoint) return;
    const panel = dialog.current;
    panel?.showModal();
    const controller = new AbortController();
    void loadDetails(endpoint, controller.signal);
    return () => {
      controller.abort();
      panel?.close();
    };
  }, [endpoint]);

  if (!item || !endpoint) return null;

  const release = data?.item ?? item;
  const year = release.releaseDate?.slice(0, 4);
  const activityName = item.sharedByName ?? release.sharedByName;
  const activityDate = item.sharedAt ?? release.sharedAt;
  const spotifyUrl = release.spotifyUrl ?? item.spotifyUrl;
  const ratingCount = data?.reviews.filter((review) => review.rating !== null).length ?? 0;
  const hasChanges = rating !== (data?.currentUserReview?.rating?.toString() ?? "")
    || notes !== (data?.currentUserReview?.notes ?? "")
    || mood !== (data?.currentUserReview?.mood ?? null);

  function close() {
    dialog.current?.close();
    onClose();
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!endpoint || !hasChanges || saving) return;
    setSaving(true);
    setSavedMessage("");
    setSaveError(null);

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: rating === "" ? null : Number(rating), notes, mood })
      });
      const json = await response.json() as { error?: string; review: NonNullable<DetailData["currentUserReview"]> };
      if (!response.ok) throw new Error(json.error ?? "Couldn’t save your changes.");

      setData((current) => current && { ...current, currentUserReview: json.review });
      setNotes(json.review.notes ?? "");
      setSavedMessage(rating !== "" || notes.trim() ? "Review saved" : "Catalog updated");
      onSaved?.();
      await loadDetails(endpoint);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Couldn’t save your changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} className="detail-sheet" aria-labelledby="detail-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="detail-sheet-body">
        <header className="detail-sheet-toolbar">
          <span>{kinds[release.entryKind]} details</span>
          <button type="button" className="detail-sheet-close" onClick={close} autoFocus aria-label="Close album details">
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="detail-sheet-content">
          <section className="detail-hero">
            <AlbumShader seed={release.spotifyId} />
            <div className="detail-art-wrap">
              {release.imageUrl
                ? <img src={release.imageUrl} alt="" />
                : <img className="detail-cover-placeholder" src="/design-reference/icons/album.svg" alt="" />}
            </div>
            <div className="detail-identity">
              <p className="detail-kicker">{kinds[release.entryKind]}{year ? ` · ${year}` : ""}</p>
              <h2 id="detail-title">{release.title}</h2>
              <p>{release.artistName ?? "Unknown artist"}</p>
            </div>
          </section>

          <div className="detail-context">
            <div>
              {data?.overallRating != null ? (
                <p><strong>{data.overallRating.toFixed(2)}</strong> / 5 <span className="detail-muted">· {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}</span></p>
              ) : <p className="detail-muted">{loading ? "Loading ratings…" : "No ratings yet"}</p>}
              {(activityName || activityDate) && <p className="detail-muted">
                {activityLabel}{activityName ? ` by ${activityName}` : ""}{activityDate ? ` · ${formatDate(activityDate)}` : ""}
              </p>}
            </div>
            {spotifyUrl && <a href={spotifyUrl} target="_blank" rel="noreferrer" className="detail-sheet-action">
              Open in Spotify <span aria-hidden="true">↗</span>
            </a>}
          </div>

          {loadError && <div className="detail-panel">
            <p className="detail-error" role="alert">{loadError}</p>
            <button className="detail-secondary" type="button" onClick={() => void loadDetails(endpoint)}>Try again</button>
          </div>}

          {data?.canReview && (
            <form className="detail-panel detail-edit-block" onSubmit={saveReview}>
              <div>
                <h3>Your review</h3>
                <p className="detail-muted">Ratings and notes are visible to members. Your mood tag is private.</p>
              </div>

              <fieldset disabled={saving}>
                <legend>Rating <span className="detail-muted">· optional</span></legend>
                <div className="detail-rating">
                  <input aria-label="Set rating" type="range" min={0} max={5} step={0.25}
                    value={rating || 0} aria-valuetext={rating === "" ? "Unrated" : `${rating} out of 5`}
                    onChange={(event) => { setRating(event.target.value); setSavedMessage(""); }} />
                  <input aria-label="Rating out of 5" type="number" min={0} max={5} step="any"
                    placeholder="–" value={rating} onChange={(event) => { setRating(event.target.value); setSavedMessage(""); }} />
                  <span className="detail-muted">/ 5</span>
                  {rating !== "" && <button className="detail-secondary" type="button" onClick={() => {
                    setRating("");
                    setSavedMessage("");
                  }}>Clear</button>}
                </div>
              </fieldset>

              <fieldset disabled={saving}>
                <legend>Catalog mood <span className="detail-muted">· optional</span></legend>
                <div className="detail-moods">
                  {moods.map((value) => <button key={value} type="button" className="detail-mood"
                    data-mood={value} aria-pressed={mood === value} onClick={() => {
                      setMood(mood === value ? null : value);
                      setSavedMessage("");
                    }}>{value}</button>)}
                </div>
              </fieldset>

              <label className="detail-note">
                <span>Listening note <span className="detail-muted">· optional</span></span>
                <textarea rows={3} maxLength={300} value={notes} disabled={saving} placeholder="What stood out?"
                  onChange={(event) => { setNotes(event.target.value); setSavedMessage(""); }} />
              </label>

              {saveError && <p className="detail-error" role="alert">{saveError}</p>}
              <div className="detail-save-row">
                <span className="detail-save-feedback" role="status">{savedMessage && <span>✓ {savedMessage}</span>}</span>
                <button type="submit" className="detail-sheet-primary" disabled={saving || !hasChanges}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          )}

          {!loadError && <section className="detail-panel">
            <h3>Member reviews {data?.reviews.length ? <span className="detail-muted">· {data.reviews.length}</span> : null}</h3>
            {data?.reviews.length ? (
              <ul className="detail-review-list">
                {data.reviews.map((review) => (
                  <li key={review.id} className="detail-review-item">
                    <div className="detail-review-head">
                      <div className="detail-review-user">
                        <div className="detail-review-avatar">
                          {review.image ? <img src={review.image} alt="" /> : <span>{(review.name ?? "M").charAt(0)}</span>}
                        </div>
                        <div>
                          <p>{review.name ?? "Member"}</p>
                          <p className="detail-muted">{formatDate(review.addedAt)}</p>
                        </div>
                      </div>
                      {review.rating !== null && <strong>{review.rating.toFixed(2)} / 5</strong>}
                    </div>
                    {review.notes && <p className="detail-review-note">{review.notes}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="detail-muted" role="status">{loading ? "Loading member reviews…" : "No member reviews yet."}</p>}
          </section>}
        </div>
      </div>
    </dialog>
  );
}
