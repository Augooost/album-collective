import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  emphasized?: boolean;
};

export function FilterPill({ children, emphasized }: Props) {
  return <div className={emphasized ? "catalog-filter-pill catalog-filter-emphasis" : "catalog-filter-pill"}>{children}</div>;
}
