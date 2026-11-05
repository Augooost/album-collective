"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
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
  search: string;
  onSearchChange: (value: string) => void;
  onShared?: () => void;
};

export function CatalogFrame({ children, userImage, search, onSearchChange, onShared }: Props) {
  const pathname = usePathname();
  const router = useRouter();
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
      onShared?.();
      router.refresh();
    } catch (error) {
      setPostError(error instanceof Error ? error.message : "Couldn’t share this link.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className={pathname === "/" ? "catalog-page home-page" : "catalog-page"}>
      <header className="catalog-top-row">
        <div className="catalog-brand">
          <img src="/design-reference/logo/logo.svg" alt="Album Collective" />
        </div>
        <TopSearchBar value={search} onChange={onSearchChange} onPaste={(event) => {
          const value = event.clipboardData.getData("text").trim();
          if (!/^https:\/\/open\.spotify\.com\/(album|track|playlist)\//i.test(value)) return;
          event.preventDefault();
          setUrl(value);
          dropLink.current?.showModal();
        }} />
        <div className="catalog-avatar">
          {userImage ? <img src={userImage} alt="Your profile" /> : <span>You</span>}
        </div>
      </header>

      <aside className="catalog-sidebar">
        <nav className="catalog-side-main" aria-label="Main">
          {pages.map((page) => <SidebarNavButton key={page.href} {...page} active={pathname === page.href} />)}
        </nav>
        <div className="catalog-side-actions">
          <button className="catalog-side-btn" type="button" aria-label="Light mode"
            aria-pressed={isLight} onClick={toggleTheme}>
            <span className="catalog-theme-icon" aria-hidden="true" />
            <span>Theme</span>
          </button>
          <button className="catalog-side-btn" type="button" aria-haspopup="dialog"
            onClick={() => dropLink.current?.showModal()}>
            <img src="/design-reference/icons/paste.svg" alt="" className="catalog-side-icon" />
            <span>Drop Link</span>
          </button>
        </div>
      </aside>

      <section className="catalog-main">{children}</section>

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
