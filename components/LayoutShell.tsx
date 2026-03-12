"use client";

import { usePathname } from "next/navigation";

import { AuthButtons } from "@/components/AuthButtons";
import { Nav } from "@/components/Nav";

type Props = {
  children: React.ReactNode;
  loggedIn: boolean;
  missingEnv: string[];
};

export function LayoutShell({ children, loggedIn, missingEnv }: Props) {
  const pathname = usePathname();
  const usesPremiumShell =
    pathname === "/" || pathname === "/catalog" || pathname === "/stats";

  if (usesPremiumShell) {
    return <main>{children}</main>;
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
