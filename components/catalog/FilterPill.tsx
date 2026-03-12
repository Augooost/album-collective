import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function FilterPill({ children }: Props) {
  return <div className="catalog-filter-pill">{children}</div>;
}
