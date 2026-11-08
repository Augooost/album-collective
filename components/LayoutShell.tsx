"use client";

import { usePathname } from "next/navigation";

import { AuthButtons } from "@/components/AuthButtons";
import { Nav } from "@/components/Nav";
import { CatalogFrame } from "@/components/catalog/CatalogFrame";

type Props = {
  children: React.ReactNode;
  loggedIn: boolean;
  userImage: string | null;
  missingEnv: string[];
};

export function LayoutShell({ children, loggedIn, userImage, missingEnv }: Props) {
  const pathname = usePathname();
  const usesPremiumShell =
    pathname === "/" || pathname === "/catalog" || pathname === "/stats";

  if (usesPremiumShell) {
    return <main><CatalogFrame userImage={userImage} loggedIn={loggedIn}>{children}</CatalogFrame></main>;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Album Collective</h1>
          <p className="muted">Private Spotify journal</p>
        </div>
        <AuthButtons loggedIn={loggedIn} missingEnv={missingEnv} />
      </header>
      <Nav />
      <main className="container">{children}</main>
    </>
  );
}
