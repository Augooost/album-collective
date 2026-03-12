import Link from "next/link";

export function Nav() {
  return (
    <nav className="nav">
      <Link href="/">Home</Link>
      <Link href="/catalog">Catalog</Link>
      <Link href="/stats">Stats</Link>
    </nav>
  );
}
