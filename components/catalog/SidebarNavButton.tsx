import Link from "next/link";

type Props = {
  href: "/" | "/catalog" | "/stats";
  label: string;
  iconSrc: string;
  active?: boolean;
};

export function SidebarNavButton({ href, label, iconSrc, active = false }: Props) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={active ? "catalog-side-btn active" : "catalog-side-btn"}>
      <img src={iconSrc} alt="" className="catalog-side-icon" />
      <span>{label}</span>
    </Link>
  );
}
