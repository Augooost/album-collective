"use client";

import { FormEvent, useEffect, useState } from "react";

type SelectedItem = {
  spotifyType: "TRACK" | "ALBUM" | "PLAYLIST";
  spotifyId: string;
  title: string;
  artistName: string | null;
  imageUrl: string | null;
  entryKind: "TRACK" | "ALBUM" | "EP" | "PLAYLIST";
  releaseDate: string | null;
  sharedByName?: string | null;
  sharedAt?: string | Date;
  spotifyUrl?: string;
};

type Review = {
  id: string;
  userId: string;
  name: string | null;
  image: string | null;
  rating: number | null;
  notes: string | null;
  addedAt: string;
};

type DetailData = {
  item: SelectedItem & {
    spotifyUrl: string;
    sharedAt: string;
  };
  overallRating: number | null;
  reviews: Review[];
  canReview: boolean;
  currentUserReview: {
    rating: number | null;
    notes: string | null;
  } | null;
};

type Props = {
  item: SelectedItem | null;
  activityLabel?: "Shared" | "Played";
  onClose: () => void;
  onSaved?: () => void;
};

function formatDate(value: string | Date | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleDateString();
}

function toLabel(kind: SelectedItem["entryKind"]): string {
  if (kind === "TRACK") {
    return "Song";
  }

  return kind;
}

export function EntryDetailSheet({ item, activityLabel = "Shared", onClose, onSaved }: Props) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadDetails(selected: SelectedItem, signal?: AbortSignal) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/items/${selected.spotifyType}/${selected.spotifyId}`,
        { cache: "no-store", signal }
      );
      const json = (await response.json()) as {
        error?: string;
      } & DetailData;

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load item details.");
      }

      setData(json);
      setRating(json.currentUserReview?.rating?.toString() ?? "");
      setNotes(json.currentUserReview?.notes ?? "");
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load details.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    setData(null);
    if (!item) return;
    const controller = new AbortController();
    void loadDetails(item, controller.signal);
    return () => controller.abort();
  }, [item?.spotifyId, item?.spotifyType]);

  const displayItem = data?.item ?? item;

  if (!item || !displayItem) {
    return null;
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayItem) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/items/${displayItem.spotifyType}/${displayItem.spotifyId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ rating: rating === "" ? null : Number(rating), notes })
        }
      );

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save review.");
      }

      await loadDetails(displayItem);
      onSaved?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="detail-sheet-overlay" onClick={onClose}>
        <aside className="detail-sheet" role="dialog" aria-modal="true" aria-label={displayItem.title}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
        <button type="button" className="detail-sheet-close" onClick={onClose} autoFocus>
          Close
        </button>

        {loading ? <p className="muted">Loading details...</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <div className="detail-sheet-content">
          <div className="detail-art-wrap">
            {displayItem.imageUrl ? <img src={displayItem.imageUrl} alt={displayItem.title} /> : null}
          </div>

          <div className="stack-sm">
            <h3>{displayItem.title}</h3>
            <p className="muted">{displayItem.artistName ?? "Unknown Artist"}</p>
            <p className="muted">Type: {toLabel(displayItem.entryKind)}</p>
            <p className="muted">
              {activityLabel} by {item.sharedByName ?? data?.item.sharedByName ?? "a member"}
            </p>
            {(item.sharedAt ?? data?.item.sharedAt) && (
              <p className="muted">{activityLabel} on {formatDate(item.sharedAt ?? data?.item.sharedAt)}</p>
            )}
            <p className="muted">
              Release date: {displayItem.releaseDate ? formatDate(displayItem.releaseDate) : "Unknown"}
            </p>
            <p className="detail-overall-rating">
              Overall rating: {data?.overallRating !== null && data?.overallRating !== undefined ? data.overallRating.toFixed(2) : "N/A"}
            </p>
          </div>

          <a
            href={data?.item.spotifyUrl ?? item.spotifyUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="detail-sheet-action"
          >
            Open in Spotify
          </a>

          {data?.canReview && !loading && (
          <form className="detail-edit-block stack-sm" onSubmit={saveReview}>
            <h4>{data.currentUserReview ? "Your rating & note" : "Rate this album"}</h4>
            <p className="muted">Ratings and notes you save here are visible to members.</p>
            <label className="stack-sm">
              <span>Rating (optional, 0 to 5)</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.25}
                value={rating}
                placeholder="Unrated"
                onChange={(event) => setRating(event.target.value)}
              />
            </label>
            <label className="stack-sm">
              <span>Note</span>
              <textarea
                rows={3}
                maxLength={300}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            <button type="submit" className="detail-sheet-primary"
              disabled={saving || (!data.currentUserReview && rating === "" && !notes.trim())}>
              {saving ? "Saving…" : data.currentUserReview ? "Save review" : "Share review"}
            </button>
          </form>
          )}

          <div className="stack-sm">
            <h4>User Reviews</h4>
            <ul className="detail-review-list">
              {(data?.reviews ?? []).map((review) => (
                <li key={review.id} className="detail-review-item">
                  <div className="detail-review-head">
                    <div className="detail-review-user">
                      <div className="detail-review-avatar">
                        {review.image ? <img src={review.image} alt="" /> : <span>{(review.name ?? "U").charAt(0)}</span>}
                      </div>
                      <div>
                        <p>{review.name ?? "Member"}</p>
                        <p className="muted">{formatDate(review.addedAt)}</p>
                      </div>
                    </div>
                    <strong>{review.rating?.toFixed(2)}</strong>
                  </div>
                  {review.notes ? <p className="detail-review-note">{review.notes}</p> : null}
                </li>
              ))}
              {!data?.reviews?.length ? <li className="muted">No reviews yet.</li> : null}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
