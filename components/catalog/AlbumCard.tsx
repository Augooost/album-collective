import { MoodTags } from "@/components/catalog/MoodTags";

type Props = {
  title: string;
  artist: string;
  year: string;
  imageUrl: string | null;
  moodTags: string[];
};

export function AlbumCard({ title, artist, year, imageUrl, moodTags }: Props) {
  return (
    <article className="catalog-album-card">
      <div className="catalog-cover-wrap">
        {imageUrl ? <img src={imageUrl} alt={title} className="catalog-cover" /> : null}
        <MoodTags tags={moodTags} />
      </div>
      <div className="catalog-album-meta">
        <p className="catalog-album-title" title={title} aria-label={title}>
          {title}
        </p>
        <div className="catalog-album-sub">
          <p>{artist}</p>
          <span>{year}</span>
        </div>
      </div>
    </article>
  );
}
