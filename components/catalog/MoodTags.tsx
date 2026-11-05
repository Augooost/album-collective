export function MoodTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;

  return (
    <span className="catalog-mood-tags" title={tags.join(", ")}>
      {tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
      {tags.length > 3 && <span>+{tags.length - 3}</span>}
    </span>
  );
}
