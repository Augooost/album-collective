type Props = {
  href: "/" | "/catalog" | "/stats";
  label: string;
  iconSrc: string;
  active?: boolean;
};

export function SidebarNavButton({ href, label, iconSrc, active = false }: Props) {
  return (
    <a href={href} className={active ? "catalog-side-btn active" : "catalog-side-btn"}>
      <img src={iconSrc} alt="" aria-hidden="true" className="catalog-side-icon" />
      <span>{label}</span>
    </a>
  );
}
