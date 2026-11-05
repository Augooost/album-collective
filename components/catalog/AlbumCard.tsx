type Props = {
  title: string;
  artist: string;
  year: string;
  imageUrl: string | null;
  mood?: string | null;
};

export function AlbumCard({ title, artist, year, imageUrl, mood }: Props) {
  return (
    <article className="catalog-album-card">
      <div className="catalog-cover-wrap">
        {imageUrl ? <img src={imageUrl} alt={title} className="catalog-cover" /> : null}
      </div>
      <div className="catalog-album-meta">
        <p className="catalog-album-title" title={title} aria-label={title}>
          {title}
        </p>
        <div className="catalog-album-sub">
          <p>{artist}</p>
          <span>{year}</span>
        </div>
        {mood && <span className="catalog-mood-tag">{mood}</span>}
      </div>
    </article>
  );
}
