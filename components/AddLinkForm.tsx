"use client";

import { FormEvent, useState } from "react";

type Props = {
  onSaved?: () => Promise<void> | void;
};

export function AddLinkForm({ onSaved }: Props) {
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url, notes })
      });

      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to add entry.");
      }

      setUrl("");
      setNotes("");
      setMessage("Saved.");
      await onSaved?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card stack">
      <h2>Add Spotify Link</h2>
      <label className="stack-sm">
        <span>Spotify URL</span>
        <input
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://open.spotify.com/track/..."
        />
      </label>

      <label className="stack-sm">
        <span>Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Why this one matters..."
          maxLength={300}
          rows={3}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Add to journal"}
      </button>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
