import Link from "next/link";

type Props = {
  href: "/" | "/catalog" | "/stats";
  label: string;
  iconSrc: string;
  active?: boolean;
  disabled?: boolean;
};

export function SidebarNavButton({ href, label, iconSrc, active = false, disabled = false }: Props) {
  if (disabled) {
    return <span className="catalog-side-btn" aria-disabled="true">
      <img src={iconSrc} alt="" className="catalog-side-icon" />
      <span>{label}</span>
    </span>;
  }

  return (
    <Link href={href} prefetch={true} aria-current={active ? "page" : undefined}
      className={active ? "catalog-side-btn active" : "catalog-side-btn"}>
      <img src={iconSrc} alt="" className="catalog-side-icon" />
      <span>{label}</span>
    </Link>
  );
}
