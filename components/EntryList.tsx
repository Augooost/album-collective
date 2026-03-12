import { JournalEntry } from "@prisma/client";

type EntryWithUser = JournalEntry & {
  user?: {
    name: string | null;
    email: string | null;
  } | null;
};

type Props = {
  entries: EntryWithUser[];
  emptyLabel?: string;
};

export function EntryList({ entries, emptyLabel = "No entries yet." }: Props) {
  if (entries.length === 0) {
    return <p className="muted">{emptyLabel}</p>;
  }

  return (
    <ul className="grid">
      {entries.map((entry) => (
        <li key={entry.id} className="card">
          {entry.imageUrl ? (
            <img
              src={entry.imageUrl}
              alt={`${entry.title} cover`}
              className="cover"
              loading="lazy"
            />
          ) : null}
          <p className="kicker">{entry.entryKind}</p>
          <h3>{entry.title}</h3>
          {entry.subtitle ? <p>{entry.subtitle}</p> : null}
          {entry.albumName ? <p className="muted">Album: {entry.albumName}</p> : null}
          {entry.releaseDate ? <p className="muted">Released: {entry.releaseDate}</p> : null}
          {entry.notes ? <p className="notes">“{entry.notes}”</p> : null}
          {entry.user?.name || entry.user?.email ? (
            <p className="muted">
              Shared by {entry.user.name ?? entry.user.email}
            </p>
          ) : null}
          <p className="muted">{new Date(entry.addedAt).toLocaleDateString()}</p>
          <a href={entry.spotifyUrl} target="_blank" rel="noreferrer">
            Open in Spotify
          </a>
        </li>
      ))}
    </ul>
  );
}
