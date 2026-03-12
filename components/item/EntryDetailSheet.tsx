"use client";

import { useEffect, useState } from "react";

type SelectedItem = {
  spotifyType: "TRACK" | "ALBUM" | "PLAYLIST";
  spotifyId: string;
  title: string;
  artistName: string | null;
  imageUrl: string | null;
  entryKind: "TRACK" | "ALBUM" | "EP" | "PLAYLIST";
  releaseDate: string | null;
  sharedByName?: string | null;
  sharedByEmail?: string | null;
  sharedAt?: string | Date;
  spotifyUrl?: string;
};

type Review = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
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
  currentUserReview: {
    rating: number | null;
    notes: string | null;
  } | null;
};

type Props = {
  item: SelectedItem | null;
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

export function EntryDetailSheet({ item, onClose, onSaved }: Props) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadDetails(selected: SelectedItem) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/items/${selected.spotifyType}/${selected.spotifyId}`,
        { cache: "no-store" }
      );
      const json = (await response.json()) as {
        error?: string;
      } & DetailData;

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load item details.");
      }

      setData(json);
      setRating(json.currentUserReview?.rating ?? 0);
      setNotes(json.currentUserReview?.notes ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!item) {
      setData(null);
      return;
    }

    loadDetails(item);
  }, [item?.spotifyId, item?.spotifyType]);

  const displayItem = data?.item ?? item;

  if (!item || !displayItem) {
    return null;
  }

  async function saveReview() {
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
          body: JSON.stringify({ rating, notes })
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
      <aside className="detail-sheet" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="detail-sheet-close" onClick={onClose}>
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
              Shared by {data?.item.sharedByName ?? data?.item.sharedByEmail ?? item.sharedByName ?? item.sharedByEmail ?? "Unknown"}
            </p>
            <p className="muted">Shared on {formatDate(data?.item.sharedAt ?? item.sharedAt)}</p>
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

          <div className="detail-edit-block stack-sm">
            <h4>Edit your rating & note</h4>
            <label className="stack-sm">
              <span>Rating (0 to 5)</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.25}
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
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
            <button type="button" className="detail-sheet-primary" onClick={saveReview} disabled={saving}>
              {saving ? "Saving..." : "Save Review"}
            </button>
          </div>

          <div className="stack-sm">
            <h4>User Reviews</h4>
            <ul className="detail-review-list">
              {(data?.reviews ?? []).map((review) => (
                <li key={review.id} className="detail-review-item">
                  <div className="detail-review-head">
                    <div className="detail-review-user">
                      <div className="detail-review-avatar">
                        {review.image ? <img src={review.image} alt="" /> : <span>{(review.name ?? review.email ?? "U").charAt(0)}</span>}
                      </div>
                      <div>
                        <p>{review.name ?? review.email ?? "Unknown"}</p>
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
