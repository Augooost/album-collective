export default function Loading() {
  return (
    <section className="catalog-content catalog-loading" aria-busy="true" aria-label="Loading music">
      <span className="catalog-loading-label" role="status">Loading your music…</span>
      <div className="catalog-loading-heading" aria-hidden="true" />
      <div className="catalog-grid" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <div className="catalog-album-card catalog-loading-card" key={index}>
            <div className="catalog-cover-wrap" /><span /><span />
          </div>
        ))}
      </div>
    </section>
  );
}
