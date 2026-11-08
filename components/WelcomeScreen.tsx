import { VerifySpotifyButton } from "@/components/VerifySpotifyButton";

export function WelcomeScreen({ authError, signInAvailable }: {
  authError: string | null;
  signInAvailable: boolean;
}) {
  return (
    <section className="catalog-content welcome-content">
      <div className="welcome-copy">
        <span className="welcome-eyebrow"><span /> Album Collective</span>
        <h1>A home for what’s<br />on repeat.</h1>
        <p className="welcome-description">
          The albums you love. The friends who get it.
          Bring your recent Spotify listening together and find your next favorite.
        </p>
        <VerifySpotifyButton disabled={!signInAvailable} />
        <p className="welcome-privacy">Your listening starts private. You choose what to share.</p>
        {authError && <p className="welcome-error" role="alert">
          {authError === "AccessDenied"
            ? "Spotify sign-in was cancelled or access wasn’t granted. You can try again when you’re ready."
            : "We couldn’t finish signing you in. Please try connecting to Spotify again."}
        </p>}
        {!signInAvailable && <p className="welcome-error" role="alert">
          Spotify sign-in is temporarily unavailable. Please try again soon.
        </p>}
        <div className="welcome-features">
          <div><img src="/design-reference/icons/home.svg" alt="" /><span>Discover through friends</span></div>
          <div><img src="/design-reference/icons/catalog.svg" alt="" /><span>Keep your favorites close</span></div>
          <div><img src="/design-reference/icons/rating.svg" alt="" /><span>Rate it. Give it a mood.</span></div>
        </div>
      </div>
      <div className="welcome-preview" aria-hidden="true">
        <div className="welcome-preview-toolbar">
          <span className="welcome-preview-pill">Recent listening</span><span>Friends</span>
          <span className="welcome-preview-people">♫</span>
        </div>
        <div className="welcome-preview-body">
          <div className="welcome-preview-heading"><h2>Recently played</h2><span>A little inspiration</span></div>
          <div className="welcome-preview-grid">
            {[
              ["amber", "On repeat", "Your latest obsession"],
              ["blue", "A friend’s find", "Good taste travels"],
              ["rose", "For the late nights", "Set the mood"],
              ["green", "One more listen", "Keep the feeling"]
            ].map(([color, title, subtitle]) => (
              <div className="catalog-album-card welcome-preview-card" key={color}>
                <div className={`welcome-art welcome-art-${color}`}><span /><i /></div>
                <p className="catalog-album-title">{title}</p>
                <p className="welcome-preview-subtitle">{subtitle}</p>
              </div>
            ))}
          </div>
          <div className="welcome-preview-footer"><span className="welcome-mini-avatar">Y</span><span>You + your collective</span><span>↗</span></div>
        </div>
      </div>
    </section>
  );
}
