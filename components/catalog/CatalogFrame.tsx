"use client";

import { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SidebarNavButton } from "@/components/catalog/SidebarNavButton";
import { TopSearchBar } from "@/components/catalog/TopSearchBar";

const pages = [
  { href: "/", label: "Home", iconSrc: "/design-reference/icons/home.svg" },
  { href: "/catalog", label: "Catalog", iconSrc: "/design-reference/icons/catalog.svg" },
  { href: "/stats", label: "Stats", iconSrc: "/design-reference/icons/stats.svg" }
] as const;

type Props = {
  children: ReactNode;
  userImage: string | null;
  loggedIn: boolean;
};

const CatalogContext = createContext<{
  search: string;
  setSearch: (value: string) => void;
  sharedLinksVersion: number;
} | null>(null);

export function useCatalogFrame() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("Catalog views require the shared app layout.");
  return context;
}

export function CatalogFrame({ children, userImage, loggedIn }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [sharedLinksVersion, setSharedLinksVersion] = useState(0);
  const search = searches[pathname] ?? "";
  const setSearch = useCallback((value: string) => {
    setSearches((current) => ({ ...current, [pathname]: value }));
  }, [pathname]);
  const dropLink = useRef<HTMLDialogElement>(null);
  const [isLight, setIsLight] = useState(false);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    setIsLight(document.documentElement.dataset.theme === "light");
  }, []);

  function toggleTheme() {
    const light = document.documentElement.dataset.theme !== "light";
    const theme = light ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.cookie = `album-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setIsLight(light);
  }

  async function shareLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPosting(true);
    setPostError(null);

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, notes: note })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Couldn’t share this link.");
      }

      setUrl("");
      setNote("");
      dropLink.current?.close();
      setSharedLinksVersion((version) => version + 1);
      router.refresh();
    } catch (error) {
      setPostError(error instanceof Error ? error.message : "Couldn’t share this link.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className={`${pathname === "/" ? "catalog-page home-page" : "catalog-page"}${loggedIn ? "" : " welcome-page"}`}>
      <header className="catalog-top-row">
        <div className="catalog-brand">
          <img src="/design-reference/logo/logo.svg" alt="Album Collective" />
        </div>
        <TopSearchBar value={search} onChange={setSearch} disabled={!loggedIn} onPaste={(event) => {
          const value = event.clipboardData.getData("text").trim();
          if (!/^https:\/\/open\.spotify\.com\/(album|track|playlist)\//i.test(value)) return;
          event.preventDefault();
          setUrl(value);
          dropLink.current?.showModal();
        }} />
        <div className="catalog-header-actions">
          <button className="mobile-theme-button" type="button" aria-label="Light mode" aria-pressed={isLight}
            title="Theme" onClick={toggleTheme}>
            <span className="catalog-theme-icon" aria-hidden="true" />
          </button>
          <div className="catalog-avatar" role="img" aria-label="Your profile">
            <span aria-hidden="true">{loggedIn ? "You" : "♪"}</span>
            {userImage && <img key={userImage} src={userImage} alt=""
              onError={(event) => { event.currentTarget.hidden = true; }} />}
          </div>
        </div>
      </header>

      <aside className="catalog-sidebar">
        <nav className="catalog-side-main" aria-label="Main">
          {pages.map((page) => <SidebarNavButton key={page.href} {...page} active={pathname === page.href}
            disabled={!loggedIn && page.href !== "/"} />)}
        </nav>
        <div className="catalog-side-actions">
          <button className="catalog-side-btn catalog-sidebar-theme" type="button" aria-label="Light mode"
            aria-pressed={isLight} onClick={toggleTheme}>
            <span className="catalog-theme-icon" aria-hidden="true" />
            <span>Theme</span>
          </button>
          <button className="catalog-side-btn catalog-sidebar-drop" type="button" aria-haspopup="dialog"
            disabled={!loggedIn} title={loggedIn ? undefined : "Sign in to share a link"}
            onClick={() => dropLink.current?.showModal()}>
            <img src="/design-reference/icons/paste.svg" alt="" className="catalog-side-icon" />
            <span>Drop Link</span>
          </button>
        </div>
      </aside>

      <CatalogContext.Provider value={{ search, setSearch, sharedLinksVersion }}>
        <section className="catalog-main">{children}</section>
      </CatalogContext.Provider>

      <dialog ref={dropLink} className="catalog-dialog" aria-labelledby="drop-link-title"
        onCancel={(event) => { if (posting) event.preventDefault(); }}>
        <h2 id="drop-link-title">Share a Spotify link</h2>
        <form className="catalog-share-form stack-sm" onSubmit={shareLink}>
          <label className="stack-sm">
            <span>Spotify link</span>
            <input type="url" placeholder="https://open.spotify.com/…" autoFocus required
              value={url} onChange={(event) => setUrl(event.target.value)} />
          </label>
          <label className="stack-sm">
            <span>Note (optional)</span>
            <input type="text" maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          {postError && <p className="error" role="alert">{postError}</p>}
          <div className="catalog-dialog-actions">
            <button type="button" className="catalog-dialog-secondary" disabled={posting}
              onClick={() => dropLink.current?.close()}>Cancel</button>
            <button type="submit" disabled={posting}>{posting ? "Sharing…" : "Share link"}</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
